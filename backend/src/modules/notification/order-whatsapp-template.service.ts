import axios from "axios";

import {
  prisma,
} from "../../config/prisma.js";
import {
  sendWhatsAppTemplateMessage,
} from "../whatsapp/services/meta.service.js";

const WHATSAPP_CHANNEL =
  "whatsapp";

function formatMoney(
  value: number
) {
  return value.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function normalizePhone(
  phone?: string | null
) {
  return String(phone || "")
    .replace(/\D/g, "");
}

function firstName(
  name?: string | null
) {
  return String(name || "cliente")
    .trim()
    .split(/\s+/)[0] ||
    "cliente";
}

function templateLanguage() {
  return process.env.WHATSAPP_TEMPLATE_LANGUAGE ||
    "pt_BR";
}

function pendingPaymentTemplateName() {
  return process.env.WHATSAPP_TEMPLATE_PAYMENT_PENDING ||
    "pedido_pagamento_pendente";
}

function orderStatusTemplateName() {
  return process.env.WHATSAPP_TEMPLATE_ORDER_STATUS ||
    "pedido_atualizacao_status";
}

function paymentMethodLabel(
  method?: string | null
) {
  const labels: Record<string, string> = {
    pix: "PIX",
    credit_card: "Cartão de crédito",
  };

  return labels[String(method || "")] ||
    String(method || "Aguardando escolha");
}

const statusMessages: Record<string, {
  label: string;
  message: string;
}> = {
  paid: {
    label: "Pagamento confirmado",
    message:
      "Recebemos seu pagamento e o pedido seguirá para preparação.",
  },
  preparing: {
    label: "Em preparação",
    message:
      "Seu pedido já está sendo separado com cuidado pela nossa equipe.",
  },
  shipping: {
    label: "Em rota de entrega",
    message:
      "Seu pedido saiu para entrega.",
  },
  finished: {
    label: "Entregue",
    message:
      "Seu pedido foi marcado como entregue.",
  },
  cancelled: {
    label: "Cancelado",
    message:
      "Seu pedido foi cancelado. Se tiver dúvidas, fale com nossa equipe.",
  },
};

async function wasSent(
  orderId: number,
  type: string
) {
  const notification =
    await prisma.orderCustomerNotification.findFirst({
      where: {
        order_id: orderId,
        channel: WHATSAPP_CHANNEL,
        type,
      },
    });

  return !!notification;
}

async function markSent(
  orderId: number,
  type: string
) {
  await prisma.orderCustomerNotification.create({
    data: {
      order_id: orderId,
      channel: WHATSAPP_CHANNEL,
      type,
    },
  });
}

async function getOrder(
  orderId: number
) {
  return prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      contact: true,
    },
  });
}

async function sendTemplateOnce({
  orderId,
  type,
  templateName,
  bodyParams,
  buttonUrlParam,
}: {
  orderId: number;
  type: string;
  templateName: string;
  bodyParams: string[];
  buttonUrlParam?: string;
}) {
  const order =
    await getOrder(orderId);
  const phone =
    normalizePhone(
      order?.contact.phone
    );

  if (
    !order ||
    !phone
  ) {
    return false;
  }

  if (
    await wasSent(
      order.id,
      type
    )
  ) {
    return false;
  }

  try {
    await sendWhatsAppTemplateMessage({
      to: phone,
      templateName,
      language:
        templateLanguage(),
      bodyParams,
      buttonUrlParam,
    });

    await markSent(
      order.id,
      type
    );

    return true;
  } catch (error) {
    console.error(
      "Erro ao enviar template WhatsApp de pedido:",
      axios.isAxiosError(error)
        ? error.response?.data ||
            error.message
        : error
    );

    return false;
  }
}

export async function sendOrderPendingPaymentWhatsApp(
  orderId: number
) {
  const order =
    await getOrder(orderId);

  if (!order) {
    return false;
  }

  return sendTemplateOnce({
    orderId,
    type: "payment_pending",
    templateName:
      pendingPaymentTemplateName(),
    bodyParams: [
      firstName(order.contact.name),
      String(order.id),
      formatMoney(Number(order.total)),
      paymentMethodLabel(
        order.payment_method
      ),
    ],
    buttonUrlParam:
      String(order.id),
  });
}

export async function sendOrderPaymentConfirmedWhatsApp(
  orderId: number
) {
  return sendOrderStatusUpdateWhatsApp(
    orderId,
    "paid"
  );
}

export async function sendOrderStatusUpdateWhatsApp(
  orderId: number,
  status: string
) {
  const config =
    statusMessages[status];

  if (!config) {
    return false;
  }

  const order =
    await getOrder(orderId);

  if (!order) {
    return false;
  }

  return sendTemplateOnce({
    orderId,
    type:
      `status_${status}`,
    templateName:
      orderStatusTemplateName(),
    bodyParams: [
      firstName(order.contact.name),
      String(order.id),
      config.label,
      config.message,
    ],
  });
}
