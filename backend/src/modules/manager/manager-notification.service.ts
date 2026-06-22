import { prisma } from "../../config/prisma.js";
import { sendWhatsAppMessage } from "../whatsapp/services/meta.service.js";

const WINDOW_MS = 24 * 60 * 60 * 1000;

type ManagerNotificationType =
  | "order_created"
  | "delivery_selected"
  | "pix_generated"
  | "payment_paid"
  | "payment_rejected"
  | "payment_status";

function isWindowOpen(openedAt: Date | null | undefined): boolean {
  if (!openedAt) return false;
  return Date.now() - openedAt.getTime() < WINDOW_MS;
}

function phoneMatches(incoming: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const a = incoming.replace(/\D/g, "");
  const b = stored.replace(/\D/g, "");
  if (a === b) return true;
  if (a.length === 12 && b.length === 13) return `${a.slice(0, 4)}9${a.slice(4)}` === b;
  if (a.length === 13 && b.length === 12) return a === `${b.slice(0, 4)}9${b.slice(4)}`;
  return false;
}

function formatCurrency(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: Date) {
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function paymentStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    paid: "Pago",
    approved: "Pago",
    pending: "Pendente",
    in_process: "Em análise",
    rejected: "Rejeitado",
    cancelled: "Cancelado",
    refunded: "Estornado",
    charged_back: "Contestação/chargeback",
  };

  return labels[String(status || "")] || String(status || "Não informado");
}

function paymentMethodLabel(method?: string | null) {
  const labels: Record<string, string> = {
    pix: "PIX",
    credit_card: "Cartão de crédito",
  };

  return labels[String(method || "")] || String(method || "Não informado");
}

function orderDisplayNumber(order: {
  id: number;
  order_number?: string | null;
}) {
  return order.order_number || String(order.id);
}

export async function renewManagerWindow(phone: string) {
  const config = await prisma.storeConfig.findUnique({ where: { id: 1 } });
  if (!config) return;

  if (phoneMatches(phone, config.manager_phone_1)) {
    await prisma.storeConfig.update({
      where: { id: 1 },
      data: {
        manager_1_window_opened_at: new Date(),
        manager_1_last_ping_at: null,
      },
    });
    await drainManagerQueue(config.manager_phone_1!);
  } else if (phoneMatches(phone, config.manager_phone_2)) {
    await prisma.storeConfig.update({
      where: { id: 1 },
      data: {
        manager_2_window_opened_at: new Date(),
        manager_2_last_ping_at: null,
      },
    });
    await drainManagerQueue(config.manager_phone_2!);
  }
}

export async function notifyManagersAboutOrder(
  orderId: number,
  type: ManagerNotificationType,
  details?: string
) {
  if (
    ![
      "order_created",
      "payment_paid",
    ].includes(type)
  ) {
    return;
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
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

  if (!order) return;

  const titleByType: Record<ManagerNotificationType, string> = {
    order_created: "🛒 Pedido feito",
    delivery_selected: "🚚 Entrega definida",
    pix_generated: "💠 PIX gerado",
    payment_paid: "✅ Pagamento confirmado",
    payment_rejected: "⚠️ Pagamento não aprovado",
    payment_status: "ℹ️ Atualização de pagamento",
  };

  const items = order.items
    .map((item) => `- ${item.product.title} x${item.quantity}`)
    .join("\n");

  const customer =
    order.contact.name ||
    order.contact.phone ||
    "Cliente não identificado";

  const baseContent = `
${titleByType[type]}

Pedido #${orderDisplayNumber(order)}
Cliente: ${customer}
Telefone: ${order.contact.phone}
Total: ${formatCurrency(order.total)}
Entrega: ${order.shipping_method || "não definida"}

Itens:
${items || "- Sem itens"}
`.trim();

  const content =
    type === "payment_paid"
      ? `
${baseContent}

Pagamento: ${paymentMethodLabel(order.payment_method)}
Status: ${paymentStatusLabel(order.payment_status)}
${details ? `\n${details}` : ""}
`.trim()
      : `
${baseContent}

Data: ${formatDate(order.created_at)}
`.trim();

  await sendOrQueueNotification(content);
}

export async function sendOrQueueNotification(content: string) {
  const config = await prisma.storeConfig.findUnique({ where: { id: 1 } });
  if (!config) return;

  const managers = [
    { phone: config.manager_phone_1, windowAt: config.manager_1_window_opened_at },
    { phone: config.manager_phone_2, windowAt: config.manager_2_window_opened_at },
  ].filter((m) => !!m.phone);

  for (const manager of managers) {
    if (isWindowOpen(manager.windowAt)) {
      try {
        await sendWhatsAppMessage(manager.phone!, content);
      } catch (e) {
        console.error("Erro ao enviar notificação para gestor:", e);
        await prisma.managerNotification.create({
          data: { phone: manager.phone!, content },
        });
      }
    } else {
      await prisma.managerNotification.create({
        data: { phone: manager.phone!, content },
      });
    }
  }
}

async function drainManagerQueue(phone: string) {
  const pending = await prisma.managerNotification.findMany({
    where: { phone, sent_at: null },
    orderBy: { created_at: "asc" },
  });

  for (const notification of pending) {
    try {
      await sendWhatsAppMessage(phone, notification.content);
      await prisma.managerNotification.update({
        where: { id: notification.id },
        data: { sent_at: new Date() },
      });
    } catch (e) {
      console.error("Erro ao enviar notificação pendente:", e);
    }
  }
}
