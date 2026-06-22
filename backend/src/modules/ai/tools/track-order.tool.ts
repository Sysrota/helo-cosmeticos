import {
  prisma,
} from "../../../config/prisma.js";

function formatMoney(
  value: number
) {
  return Number(value || 0)
    .toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
}

function normalizeDigits(
  value?: string | null
) {
  return String(value || "")
    .replace(/\D/g, "");
}

function normalizeEmail(
  value?: string | null
) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function phoneMatches(
  incoming?: string | null,
  stored?: string | null
) {
  const a =
    normalizeDigits(incoming);
  const b =
    normalizeDigits(stored);

  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  if (
    a.length === 12 &&
    b.length === 13
  ) {
    return `${a.slice(0, 4)}9${a.slice(4)}` === b;
  }

  if (
    a.length === 13 &&
    b.length === 12
  ) {
    return a === `${b.slice(0, 4)}9${b.slice(4)}`;
  }

  return false;
}

function cpfMatches(
  informed?: string | null,
  stored?: string | null
) {
  const a =
    normalizeDigits(informed);
  const b =
    normalizeDigits(stored);

  if (
    !a ||
    !b
  ) {
    return false;
  }

  return a === b ||
    (
      a.length >= 4 &&
      b.endsWith(a)
    );
}

function paymentStatusLabel(
  status?: string | null
) {
  const labels: Record<string, string> = {
    paid: "Pago",
    approved: "Pago",
    pending: "Pendente",
    in_process: "Em análise",
    rejected: "Rejeitado",
    cancelled: "Cancelado",
    refunded: "Estornado",
    charged_back: "Contestação",
  };

  return labels[String(status || "")] ||
    String(status || "Não informado");
}

function orderStatusLabel(
  status?: string | null
) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    preparing: "Em preparação",
    shipping: "Em rota de entrega",
    finished: "Entregue",
    cancelled: "Cancelado",
  };

  return labels[String(status || "")] ||
    String(status || "Não informado");
}

export async function trackOrderTool({
  conversationId,
  orderId,
  email,
  cpf,
}: {
  conversationId: number;
  orderId: number;
  email?: string;
  cpf?: string;
}) {
  if (
    !Number.isInteger(orderId) ||
    orderId <= 0
  ) {
    return {
      status: "invalid_order",
      message:
        "Peça o número do pedido para consultar.",
    };
  }

  if (
    !normalizeEmail(email) &&
    !normalizeDigits(cpf)
  ) {
    return {
      status: "verification_required",
      message:
        "Para segurança, peça o e-mail da compra ou os 4 últimos dígitos do CPF cadastrado.",
    };
  }

  const conversation =
    await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        contact: true,
      },
    });

  if (!conversation?.contact) {
    return {
      status: "not_allowed",
      message:
        "Não foi possível validar o telefone desta conversa.",
    };
  }

  const order =
    await prisma.order.findFirst({
      where: {
        OR: [
          {
            id: orderId,
          },
          {
            order_number:
              String(orderId),
          },
        ],
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
    return {
      status: "not_found",
      message:
        "Pedido não encontrado para os dados informados.",
    };
  }

  if (
    !phoneMatches(
      conversation.contact.phone,
      order.contact.phone
    )
  ) {
    return {
      status: "not_allowed",
      message:
        "Por segurança, só posso consultar pedidos vinculados a este número de WhatsApp.",
    };
  }

  const emailOk =
    normalizeEmail(email) &&
    normalizeEmail(email) ===
      normalizeEmail(order.contact.email);
  const cpfOk =
    cpfMatches(
      cpf,
      order.contact.cpf
    );

  if (
    !emailOk &&
    !cpfOk
  ) {
    return {
      status: "verification_failed",
      message:
        "Os dados de confirmação não batem com o pedido. Peça para conferir o e-mail da compra ou os 4 últimos dígitos do CPF.",
    };
  }

  return {
    status: "found",
    order: {
      id: order.id,
      number:
        order.order_number ||
        String(order.id),
      status:
        orderStatusLabel(
          order.status
        ),
      payment_status:
        paymentStatusLabel(
          order.payment_status
        ),
      shipping_method:
        order.shipping_method ||
        "não definida",
      shipping_deadline:
        order.shipping_deadline ||
        null,
      total:
        formatMoney(
          order.total
        ),
      items:
        order.items.map(
          (item) =>
            `${item.product.title} x${item.quantity}`
        ),
    },
    security:
      "Não informe endereço completo, CPF, e-mail completo ou telefone do cliente na resposta.",
  };
}
