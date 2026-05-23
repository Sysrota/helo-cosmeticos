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

  issuer_id?: string;

  payment_method_id: string;

  transaction_amount: number;

  installments: number;

  payer: {

    email: string;

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

  // PEDIDO
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

  // PAYMENT CLIENT
  const paymentClient =
    new Payment(
      mercadoPagoClient
    );

  // CREATE PAYMENT
  const payment =
    await paymentClient.create({

      body: {

        transaction_amount:
          Number(
            transaction_amount
          ),

        token,

        description:
          `Pedido #${order.id}`,

        installments,

        payment_method_id,

        payer,
      },
    });

  // STATUS
  const status =
    payment.status ===
    "approved"

      ? "paid"

      : "pending";

  // SAVE
  await prisma.order.update({

    where: {
      id: order.id,
    },

    data: {

      payment_method:
        "credit_card",

      payment_status:
        status,

      mercado_pago_payment_id:
        String(payment.id),
    },
  });

  return payment;
}