import { Payment } from "mercadopago";

import { prisma } from "../../config/prisma.js";
import { io } from "../../websocket/socket.js";
import {
  sendOrderConfirmationEmail,
} from "../notification/order-email.service.js";
import { mercadoPagoClient } from "./mercado-pago.provider.js";

function getOrderIdFromReference(
  externalReference: unknown
) {
  const orderId =
    Number(externalReference);

  return Number.isInteger(orderId) &&
    orderId > 0
    ? orderId
    : null;
}

export async function getMercadoPagoPayment(
  paymentId: string | number
) {
  const paymentClient =
    new Payment(
      mercadoPagoClient
    );

  return paymentClient.get({
    id:
      String(paymentId),
  });
}

export async function syncMercadoPagoPayment(
  paymentId: string | number
) {
  const payment =
    await getMercadoPagoPayment(
      paymentId
    );
  const externalOrderId =
    getOrderIdFromReference(
      payment.external_reference
    );

  const order =
    await prisma.order.findFirst({
      where: {
        OR: [
          {
            mercado_pago_payment_id:
              String(payment.id),
          },
          ...(externalOrderId
            ? [
              {
                id:
                  externalOrderId,
              },
            ]
            : []),
        ],
      },
    });

  if (!order) {
    return {
      payment,
      order:
        null,
    };
  }

  if (
    payment.status !==
    "approved"
  ) {
    const updatedOrder =
      await prisma.order.update({
        where: {
          id:
            order.id,
        },
        data: {
          mercado_pago_payment_id:
            String(payment.id),
          payment_status:
            payment.status ||
            order.payment_status ||
            "pending",
        },
      });

    io.emit(
      "order_updated",
      updatedOrder
    );

    return {
      payment,
      order:
        updatedOrder,
    };
  }

  const wasAlreadyPaid =
    [
      "approved",
      "paid",
    ].includes(
      String(
        order.payment_status || ""
      )
    );

  const updatedOrder =
    await prisma.order.update({
      where: {
        id:
          order.id,
      },
      data: {
        mercado_pago_payment_id:
          String(payment.id),
        status:
          "paid",
        payment_status:
          "paid",
        paid_at:
          order.paid_at ||
          new Date(),
      },
    });

  io.emit(
    "order_paid",
    updatedOrder
  );

  io.emit(
    "order_updated",
    updatedOrder
  );

  if (!wasAlreadyPaid) {
    await sendOrderConfirmationEmail(
      order.id
    );
  }

  return {
    payment,
    order:
      updatedOrder,
  };
}

export async function syncOrderPaymentStatus(
  order: {
    mercado_pago_payment_id?: string | null;
    payment_status?: string | null;
  }
) {
  if (
    !order.mercado_pago_payment_id ||
    [
      "approved",
      "paid",
    ].includes(
      String(
        order.payment_status || ""
      )
    )
  ) {
    return null;
  }

  return syncMercadoPagoPayment(
    order.mercado_pago_payment_id
  );
}
