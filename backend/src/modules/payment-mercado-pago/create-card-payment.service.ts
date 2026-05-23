import { io } from "@/websocket/socket.js";

import { prisma }
  from "../../config/prisma.js";

import {
  mercadoPagoClient,
} from "./mercado-pago.provider";

import {
  Payment,
} from "mercadopago";

interface Props {

  order_id: number;

  token: string;

  payment_method_id: string;

  transaction_amount: number;

  installments: number;

  payer: {

    email: string;

    first_name?: string;

    last_name?: string;

    identification: {

      type: string;

      number: string;
    };
  };
}

export async function createCardPaymentService({

  order_id,

  token,

  payment_method_id,

  transaction_amount,

  installments,

  payer,

}: Props) {

  // =========================
  // ORDER
  // =========================

  const order =
    await prisma.order.findUnique({

      where: {
        id: order_id,
      },

      include: {
        contact: true,
      },
    });

  if (!order) {

    throw new Error(
      "Pedido não encontrado"
    );
  }
  // =========================
  // PAYMENT CLIENT
  // =========================

  const paymentClient =
    new Payment(
      mercadoPagoClient
    );

  // =========================
  // CREATE PAYMENT
  // =========================

  const payment =
    await paymentClient.create({

      body: {

        transaction_amount:
          Number(
            order.total
          ),

        token,

        description:
          `Pedido #${order.id}`,

        installments:
          Number(
            installments
          ),

        payment_method_id,

        payer,
      },
    });

  // =========================
  // UPDATE ORDER
  // =========================

  const updatedOrder =
    await prisma.order.update({

      where: {
        id: order.id,
      },

      data: {

        payment_method:
          "credit_card",

        payment_status:
          payment.status,

        paid_at:

          payment.status ===
          "approved"

            ? new Date()

            : null,

        mercado_pago_payment_id:
          String(payment.id),
      },
    });

  // =========================
  // REALTIME
  // =========================

  io.emit(
    "order_updated",
    updatedOrder
  );

  // =========================
  // RETURN
  // =========================

  return {

    id:
      payment.id,

    status:
      payment.status,

    status_detail:
      payment.status_detail,

    payment_method_id:
      payment.payment_method_id,
  };
}