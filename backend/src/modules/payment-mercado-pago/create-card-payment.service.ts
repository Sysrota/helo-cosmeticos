import { io } from "../../websocket/socket.js";

import { prisma }
  from "../../config/prisma.js";

import {
  mercadoPagoClient,
} from "./mercado-pago.provider";

import {
  Payment,
} from "mercadopago";
import {
  sendOrderConfirmationEmail,
} from "../notification/order-email.service.js";
import {
  sendOrderPaymentConfirmedWhatsApp,
} from "../notification/order-whatsapp-template.service.js";
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
import {
  calculateOrderTotals,
} from "../coupons/coupon-totals.service.js";
import {
  sendMetaCapiEvent,
} from "../meta/meta-capi.service.js";
import {
  buildMetaUserData,
} from "../meta/build-meta-user-data.js";
import {
  syncCouponRedemption,
} from "../coupons/coupons.service.js";

interface Props {

  order_id: number;

  token: string;

  issuer_id?: string;

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
        contact: {
          include: {
            addresses: {
              orderBy: { updated_at: "desc" },
              take: 1,
            },
          },
        },
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

  const commercialPolicy =
    await getCommercialPolicy();

  if (
    Number(installments) >
    commercialPolicy.card_max_installments
  ) {
    throw new Error(
      `Escolha no máximo ${commercialPolicy.card_max_installments} parcelas.`
    );
  }

  const totals =
    await calculateOrderTotals(
      order,
      "credit_card"
    );
  const total =
    totals.total;
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
          total,

        token,

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

        installments:
          Number(
            installments
          ),

        payment_method_id,

        payer,

        notification_url:
          getPaymentNotificationUrl(),
      },
    });
  const isApproved =
    payment.status ===
    "approved";

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

        status:
          isApproved
            ? "paid"
            : order.status,

        coupon_discount:
          totals.couponDiscount,

        payment_discount:
          totals.paymentDiscount,

        discount:
          totals.discount,

        total,

        payment_status:
          isApproved
            ? "paid"
            : payment.status,

        paid_at:

          isApproved

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

  await syncCouponRedemption(
    order.id,
    isApproved
      ? "paid"
      : payment.status
  );

  if (isApproved) {
    io.emit(
      "order_paid",
      updatedOrder
    );

    void notifyManagersAboutOrder(
      order.id,
      "payment_paid",
      "Forma de pagamento: cartão"
    ).catch((error) => {
      console.error(
        "Erro ao notificar gestores sobre cartão aprovado:",
        error
      );
    });

    await sendOrderConfirmationEmail(
      order.id
    );

    await sendOrderPaymentConfirmedWhatsApp(
      order.id
    );

    // Conversions API — antes deste ajuste, o Purchase de cartão só disparava
    // pelo Pixel do navegador (onPaymentApproved), sem backup no servidor.
    // Se o navegador bloqueasse o Pixel (ad blocker, Safari ITP), esse
    // Purchase nunca era registrado em lugar nenhum. Mesmo event_id do
    // Pixel (`purchase_${order.id}`) garante a deduplicação na Meta.
    // Pedidos origin=manual (venda fechada no admin) nunca vão para a Meta.
    if (order.origin !== "manual") {
      const contentIds = order.items.map((item) => String(item.product_id));
      const numItems = order.items.reduce(
        (sum, item) => sum + Number(item.quantity || 1),
        0
      );
      const contents = order.items.map((item) => ({
        id: String(item.product_id),
        quantity: Number(item.quantity || 1),
        item_price: Number(item.unit_price || 0),
      }));

      void sendMetaCapiEvent({
        event_name: "Purchase",
        event_id: `purchase_${order.id}`,
        value: Number(total),
        currency: "BRL",
        content_ids: contentIds,
        content_type: "product",
        contents,
        num_items: numItems,
        user_data: buildMetaUserData(order),
      }).catch((error) => {
        console.error("[Meta CAPI] Purchase (cartão) failed:", error);
      });
    }
  } else if (
    [
      "rejected",
      "cancelled",
      "refunded",
      "charged_back",
    ].includes(
      String(payment.status || "")
    )
  ) {
    void notifyManagersAboutOrder(
      order.id,
      "payment_rejected",
      `Forma de pagamento: cartão\nStatus Mercado Pago: ${payment.status_detail || payment.status}`
    ).catch((error) => {
      console.error(
        "Erro ao notificar gestores sobre cartão não aprovado:",
        error
      );
    });
  }

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
