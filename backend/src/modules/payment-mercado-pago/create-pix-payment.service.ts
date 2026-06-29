import {
  mercadoPagoClient,
} from "./mercado-pago.provider";

import { prisma }
  from "../../config/prisma.js";

import {
  Payment,
} from "mercadopago";
import {
  buildPaymentDescription,
} from "./payment-description.js";
import {
  getPaymentNotificationUrl,
} from "./payment-webhook-url.js";
import {
  notifyManagersAboutOrder,
} from "../manager/manager-notification.service.js";
import {
  calculateOrderTotals,
} from "../coupons/coupon-totals.service.js";
import {
  syncCouponRedemption,
} from "../coupons/coupons.service.js";

interface Props {
  order_id: number;
}

export async function createPixPaymentService({
  order_id,
}: Props) {

  // PEDIDO
  const order =
    await prisma.order.findUnique({
      where: {
        id: order_id,
      },

      include: {
        contact: true,
        coupon: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

  if (!order) {

    throw new Error(
      "Pedido não encontrado"
    );
  }

  const totals =
    await calculateOrderTotals(
      order,
      "pix"
    );
  const total =
    totals.total;

  console.log({
    total,
    regularTotal:
      totals.regularTotal,
    couponDiscount:
      totals.couponDiscount,
    paymentDiscount:
      totals.paymentDiscount,
  });

  if (
    !total ||
    isNaN(total) ||
    total <= 0
  ) {

    throw new Error(
      "Pedido sem valor válido"
    );
  }

  // PAGAMENTO PIX
  const paymentClient =
    new Payment(
      mercadoPagoClient
    );

  const payment =
    await paymentClient.create({
      body: {
        transaction_amount:
          total,

        description:
          buildPaymentDescription(
            order.order_number ||
              order.id,
            order.items
          ),

        external_reference:
          String(
            order.order_number ||
              order.id
          ),

        payment_method_id:
          "pix",

        payer: {
          email:
            order.contact?.email ||

            `cliente${order.id}@helo.com`,
        },

        notification_url:
          getPaymentNotificationUrl(),
      },
    });

  // DADOS PIX
  const qrCode =
    payment.point_of_interaction
      ?.transaction_data
      ?.qr_code;

  const qrCodeBase64 =
    payment.point_of_interaction
      ?.transaction_data
      ?.qr_code_base64;

  // SALVA PEDIDO
  await prisma.order.update({
    where: {
      id: order.id,
    },

    data: {
      payment_method:
        "pix",

      payment_status:
        "pending",

      coupon_discount:
        totals.couponDiscount,
      payment_discount:
        totals.paymentDiscount,
      discount:
        totals.discount,

      total,

      pix_code:
        qrCode,

      pix_qrcode:
        qrCodeBase64,

      mercado_pago_payment_id:
        String(payment.id),
    },
  });

  await syncCouponRedemption(
    order.id,
    "pending"
  );

  void notifyManagersAboutOrder(
    order.id,
    "pix_generated",
    `Valor do PIX: ${total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}`
  ).catch((error) => {
    console.error(
      "Erro ao notificar gestores sobre PIX gerado:",
      error
    );
  });

  return {
    payment_id:
      payment.id,

    qr_code:
      qrCode,

    qr_code_base64:
      qrCodeBase64,

    amount:
      total,

    discount:
      totals.discount,
    coupon_discount:
      totals.couponDiscount,
    payment_discount:
      totals.paymentDiscount,
  };
}

