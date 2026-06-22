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
  getCommercialPolicy,
} from "../store-config/store-config.service.js";
import {
  getPaymentNotificationUrl,
} from "./payment-webhook-url.js";
import {
  notifyManagersAboutOrder,
} from "../manager/manager-notification.service.js";

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

  const regularTotal =
    Number(
      (
        Number(order.subtotal || 0) +
        Number(order.shipping || 0)
      ).toFixed(2)
    );

  const commercialPolicy =
    await getCommercialPolicy();

  const discount =
    Number(
      (
        regularTotal *
        (
          commercialPolicy.pix_discount_percent /
          100
        )
      ).toFixed(2)
    );

  const total =
    Number(
      (
        regularTotal -
        discount
      ).toFixed(2)
    );

  console.log({
    total,
    regularTotal,
    discount,
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

      discount,

      total,

      pix_code:
        qrCode,

      pix_qrcode:
        qrCodeBase64,

      mercado_pago_payment_id:
        String(payment.id),
    },
  });

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

    discount,
  };
}

