import { Payment } from "mercadopago";

import { prisma } from "../../config/prisma.js";
import { io } from "../../websocket/socket.js";
import {
  sendOrderConfirmationEmail,
} from "../notification/order-email.service.js";
import {
  sendOrderPaymentConfirmedWhatsApp,
} from "../notification/order-whatsapp-template.service.js";
import {
  notifyManagersAboutOrder,
} from "../manager/manager-notification.service.js";
import { mercadoPagoClient } from "./mercado-pago.provider.js";

function getOrderReference(
  externalReference: unknown
) {
  const orderCode =
    String(
      externalReference || ""
    ).trim();
  const numericOrderId =
    Number(orderCode);

  return {
    orderCode:
      orderCode || null,
    numericOrderId:
      Number.isInteger(numericOrderId) &&
      numericOrderId > 0
        ? numericOrderId
        : null,
  };
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
  const {
    orderCode,
    numericOrderId,
  } =
    getOrderReference(
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
          ...(numericOrderId
            ? [
              {
                id:
                  numericOrderId,
              },
            ]
            : []),
          ...(orderCode
            ? [
              {
                order_number:
                  orderCode,
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
    const previousStatus =
      String(
        order.payment_status || ""
      );
    const nextStatus =
      String(
        payment.status ||
        order.payment_status ||
        "pending"
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
          payment_status:
            nextStatus,
        },
      });

    io.emit(
      "order_updated",
      updatedOrder
    );

    if (
      previousStatus !== nextStatus &&
      nextStatus !== "pending"
    ) {
      const notificationType =
        [
          "rejected",
          "cancelled",
          "refunded",
          "charged_back",
        ].includes(nextStatus)
          ? "payment_rejected"
          : "payment_status";

      void notifyManagersAboutOrder(
        updatedOrder.id,
        notificationType,
        `Status Mercado Pago: ${payment.status_detail || nextStatus}`
      ).catch((error) => {
        console.error(
          "Erro ao notificar gestores sobre atualização de pagamento:",
          error
        );
      });
    }

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
    void notifyManagersAboutOrder(
      order.id,
      "payment_paid",
      `Forma de pagamento: ${order.payment_method || payment.payment_method_id || "Mercado Pago"}`
    ).catch((error) => {
      console.error(
        "Erro ao notificar gestores sobre pagamento confirmado:",
        error
      );
    });

    await sendOrderConfirmationEmail(
      order.id
    );

    await sendOrderPaymentConfirmedWhatsApp(
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
