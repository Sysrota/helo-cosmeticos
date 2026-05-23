import {
  Request,
  Response,
} from "express";

import { prisma }
  from "@/config/prisma";

import {
  Payment,
} from "mercadopago";
import { mercadoPagoClient } from "../mercado-pago.provider";
import { Server } from "socket.io";
import { io } from "@/websocket/socket";


export async function mercadoPagoWebhook(
  req: Request,
  res: Response
) {

  try {

    console.log(
      "WEBHOOK MP:",
      req.body
    );

    const paymentId =
      req.body?.data?.id;

    if (!paymentId) {

      return res.sendStatus(200);
    }

    const paymentClient =
      new Payment(
        mercadoPagoClient
      );

    const payment =
      await paymentClient.get({
        id: String(
          paymentId
        ),
      });

    console.log(
      "PAYMENT:",
      payment
    );

    console.log({
        status:
            payment.status,
        });

    const order =
      await prisma.order.findFirst({
        where: {
          mercado_pago_payment_id:
            String(payment.id),
        },
      });

    if (!order) {

      console.log(
        "Pedido não encontrado"
      );

      return res.sendStatus(200);
    }

    // PAGAMENTO APROVADO
    if (
      payment.status ===
      "approved"
    ) {

    const updatedOrder =
        await prisma.order.update({
            where: {
            id: order.id,
            },

            data: {
            payment_status:
                "paid",

            paid_at:
                new Date(),
            },
        });

      console.log(
        "Pedido pago:",
        order.id
      );

      console.log(
        "EMITINDO ORDER PAID"
        );

        io.emit(
        "order_paid",
        updatedOrder
        );
    }

    return res.sendStatus(200);

  } catch (error) {

    console.log(error);

    return res.sendStatus(200);
  }
}