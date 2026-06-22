import axios from "axios";

import {
  prisma,
} from "../../config/prisma.js";

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

function escapeHtml(
  value: string
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSiteUrl() {
  return (
    process.env.FRONTEND_URL ||
    "https://helocosmeticos.com"
  );
}

function getTrackingUrl() {
  return `${getSiteUrl()}/acompanhar-pedido`;
}

function getOrderItemsHtml(
  items: {
    quantity: number;
    unit_price: number;
    product: {
      title: string;
    };
  }[]
) {
  return items.map(
    (item) =>
      `<li style="margin: 8px 0;">${escapeHtml(item.product.title)} - ${item.quantity}x ${formatMoney(Number(item.unit_price))}</li>`
  ).join("");
}

function getOrderDisplayNumber(
  order: {
    id: number;
    order_number?: string | null;
  }
) {
  return order.order_number ||
    String(order.id);
}

const orderStatusEmailConfig = {
  preparing: {
    title: "Pedido em preparação",
    subject: "Pedido em preparação",
    intro:
      "Seu pedido já está em preparação. Estamos separando tudo com cuidado para seguir para a entrega.",
  },
  shipping: {
    title: "Pedido em rota de entrega",
    subject: "Pedido em rota de entrega",
    intro:
      "Seu pedido saiu para entrega. Agora falta pouco para chegar até você.",
  },
  finished: {
    title: "Pedido entregue",
    subject: "Pedido entregue",
    intro:
      "Seu pedido foi marcado como entregue. Esperamos que você aproveite muito seus produtos.",
  },
  cancelled: {
    title: "Pedido cancelado",
    subject: "Pedido cancelado",
    intro:
      "Seu pedido foi cancelado. Se tiver qualquer dúvida, nossa equipe pode te ajudar pelo atendimento.",
  },
} as const;

const orderFlow = [
  {
    status: "paid",
    title: "Pagamento",
    description: "Pagamento confirmado",
  },
  {
    status: "preparing",
    title: "Preparação",
    description: "Pedido em separação",
  },
  {
    status: "shipping",
    title: "Em rota de entrega",
    description: "Saiu para entrega",
  },
  {
    status: "finished",
    title: "Entregue",
    description: "Pedido finalizado",
  },
] as const;

function getOrderTimelineHtml(
  currentStatus: string
) {
  if (currentStatus === "cancelled") {
    return `
      <div style="background:#fff4f5;border:1px solid #f3c7ce;border-radius:16px;margin:24px 0;padding:18px;">
        <p style="color:#b8324f;font-size:13px;font-weight:700;letter-spacing:1.5px;margin:0 0 8px;text-transform:uppercase;">Trâmite do pedido</p>
        <div style="align-items:center;display:flex;gap:12px;">
          <span style="background:#b8324f;border-radius:999px;color:#ffffff;display:inline-block;font-size:18px;font-weight:700;height:34px;line-height:34px;text-align:center;width:34px;">!</span>
          <div>
            <p style="color:#43232d;font-size:17px;font-weight:700;margin:0;">Pedido cancelado</p>
            <p style="color:#78636b;font-size:13px;margin:4px 0 0;">O fluxo deste pedido foi encerrado como cancelado.</p>
          </div>
        </div>
      </div>
    `;
  }

  const currentIndex =
    orderFlow.findIndex(
      (step) =>
        step.status ===
        currentStatus
    );

  return `
    <div style="background:#fff8fa;border:1px solid #f1dfe5;border-radius:16px;margin:24px 0;padding:18px;">
      <p style="color:#d9536f;font-size:13px;font-weight:700;letter-spacing:1.5px;margin:0 0 14px;text-transform:uppercase;">Trâmite do pedido</p>
      ${orderFlow.map(
        (step, index) => {
          const done =
            currentIndex >= index;
          const current =
            currentIndex === index;
          const lineColor =
            done
              ? "#d9536f"
              : "#efdce2";
          const circleStyle =
            done
              ? "background:#d9536f;color:#ffffff;border-color:#d9536f;"
              : "background:#ffffff;color:#b59aa4;border-color:#efdce2;";
          const titleColor =
            done
              ? "#43232d"
              : "#9b838c";

          return `
            <div style="display:flex;gap:12px;">
              <div style="align-items:center;display:flex;flex-direction:column;">
                <span style="${circleStyle}border-radius:999px;border-style:solid;border-width:1px;display:inline-block;font-size:13px;font-weight:700;height:28px;line-height:28px;text-align:center;width:28px;">${done ? "✓" : index + 1}</span>
                ${index < orderFlow.length - 1 ? `<span style="background:${lineColor};display:block;height:30px;margin:4px 0;width:2px;"></span>` : ""}
              </div>
              <div style="padding-bottom:${index < orderFlow.length - 1 ? "14px" : "0"};">
                <p style="color:${titleColor};font-size:15px;font-weight:700;margin:2px 0 3px;">${step.title}${current ? " · agora" : ""}</p>
                <p style="color:#78636b;font-size:13px;margin:0;">${step.description}</p>
              </div>
            </div>
          `;
        }
      ).join("")}
    </div>
  `;
}

export async function sendOrderPendingPaymentEmail(
  orderId: number
) {
  const apiKey =
    process.env.RESEND_API_KEY;
  const from =
    process.env.ORDER_EMAIL_FROM;

  if (
    !apiKey ||
    !from
  ) {
    console.warn(
      "E-mail de pedido pendente não enviado: configure RESEND_API_KEY e ORDER_EMAIL_FROM."
    );

    return false;
  }

  const order =
    await prisma.order.findUnique({
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

  if (
    !order ||
    !order.contact.email ||
    order.pending_email_sent_at ||
    order.payment_status !==
      "pending"
  ) {
    return false;
  }

  const trackingUrl =
    getTrackingUrl();
  const itemsHtml =
    getOrderItemsHtml(
      order.items
    );
  const orderNumber =
    getOrderDisplayNumber(
      order
    );
  const checkoutUrl =
    `${getSiteUrl()}/checkout/${orderNumber}`;

  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to: [
          order.contact.email,
        ],
        subject:
          `Seu pedido #${orderNumber} aguarda pagamento | Helô Cosméticos`,
        html: `
          <div style="background:#fff8fa;padding:32px 16px;font-family:Arial,sans-serif;color:#43232d;">
            <div style="background:#ffffff;border:1px solid #f1dfe5;border-radius:20px;margin:0 auto;max-width:560px;padding:32px;">
              <p style="color:#d9536f;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Helô Cosméticos</p>
              <h1 style="font-size:25px;margin:18px 0 8px;">Seu pedido foi recebido</h1>
              <p>Olá, ${escapeHtml(order.contact.name || "cliente")}! O pedido <strong>#${orderNumber}</strong> está pronto e aguardando o pagamento.</p>
              <ul style="padding-left:20px;">${itemsHtml}</ul>
              <p style="font-size:18px;"><strong>Total atual: ${formatMoney(Number(order.total))}</strong></p>
              <p>Entrega: ${escapeHtml(order.shipping_method || "A confirmar")} ${order.shipping_deadline ? `- ${escapeHtml(order.shipping_deadline)}` : ""}</p>
              <a href="${checkoutUrl}" style="background:#d9536f;border-radius:12px;color:#ffffff;display:inline-block;font-weight:700;margin-top:18px;padding:14px 22px;text-decoration:none;">Concluir pagamento</a>
              <p style="color:#78636b;font-size:12px;margin-top:26px;">Você também pode <a href="${trackingUrl}" style="color:#d9536f;">acompanhar seu pedido</a> informando o número #${orderNumber} e este e-mail.</p>
            </div>
          </div>
        `,
      },
      {
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
      }
    );

    await prisma.order.updateMany({
      where: {
        id: order.id,
        pending_email_sent_at:
          null,
      },
      data: {
        pending_email_sent_at:
          new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error(
      "Erro ao enviar e-mail de pedido pendente:",
      axios.isAxiosError(error)
        ? error.response?.data ||
            error.message
        : error
    );

    return false;
  }
}

export async function sendOrderConfirmationEmail(
  orderId: number
) {
  const apiKey =
    process.env.RESEND_API_KEY;
  const from =
    process.env.ORDER_EMAIL_FROM;

  if (
    !apiKey ||
    !from
  ) {
    console.warn(
      "E-mail de confirmação não enviado: configure RESEND_API_KEY e ORDER_EMAIL_FROM."
    );

    return false;
  }

  const order =
    await prisma.order.findUnique({
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

  if (
    !order ||
    !order.contact.email ||
    order.confirmation_email_sent_at ||
    ![
      "approved",
      "paid",
    ].includes(
      order.payment_status || ""
    )
  ) {
    return false;
  }

  const trackingUrl =
    getTrackingUrl();
  const itemsHtml =
    getOrderItemsHtml(
      order.items
    );
  const timelineHtml =
    getOrderTimelineHtml(
      order.status || "paid"
    );
  const orderNumber =
    getOrderDisplayNumber(
      order
    );

  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to: [
          order.contact.email,
        ],
        subject:
          `Pagamento confirmado - Pedido #${orderNumber} | Helô Cosméticos`,
        html: `
          <div style="background:#fff8fa;padding:32px 16px;font-family:Arial,sans-serif;color:#43232d;">
            <div style="background:#ffffff;border:1px solid #f1dfe5;border-radius:20px;margin:0 auto;max-width:560px;padding:32px;">
              <p style="color:#d9536f;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Helô Cosméticos</p>
              <h1 style="font-size:25px;margin:18px 0 8px;">Pagamento confirmado</h1>
              <p>Olá, ${escapeHtml(order.contact.name || "cliente")}! Recebemos o pagamento do seu pedido <strong>#${orderNumber}</strong>.</p>
              <ul style="padding-left:20px;">${itemsHtml}</ul>
              <p style="font-size:18px;"><strong>Total: ${formatMoney(Number(order.total))}</strong></p>
              <p>Entrega: ${escapeHtml(order.shipping_method || "A confirmar")} ${order.shipping_deadline ? `- ${escapeHtml(order.shipping_deadline)}` : ""}</p>
              ${timelineHtml}
              <a href="${trackingUrl}" style="background:#d9536f;border-radius:12px;color:#ffffff;display:inline-block;font-weight:700;margin-top:18px;padding:14px 22px;text-decoration:none;">Acompanhar meu pedido</a>
              <p style="color:#78636b;font-size:12px;margin-top:28px;">Na página de acompanhamento, informe o número do pedido e o e-mail usado na compra.</p>
            </div>
          </div>
        `,
      },
      {
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
      }
    );

    await prisma.order.updateMany({
      where: {
        id: order.id,
        confirmation_email_sent_at:
          null,
      },
      data: {
        confirmation_email_sent_at:
          new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error(
      "Erro ao enviar e-mail de confirmação do pedido:",
      axios.isAxiosError(error)
        ? error.response?.data ||
            error.message
        : error
    );

    return false;
  }
}

export async function sendOrderStatusMovementEmail(
  orderId: number,
  status: string
) {
  const config =
    orderStatusEmailConfig[
      status as keyof typeof orderStatusEmailConfig
    ];

  if (!config) {
    return false;
  }

  const apiKey =
    process.env.RESEND_API_KEY;
  const from =
    process.env.ORDER_EMAIL_FROM;

  if (
    !apiKey ||
    !from
  ) {
    console.warn(
      "E-mail de movimentação do pedido não enviado: configure RESEND_API_KEY e ORDER_EMAIL_FROM."
    );

    return false;
  }

  const order =
    await prisma.order.findUnique({
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

  if (
    !order ||
    !order.contact.email
  ) {
    return false;
  }

  const alreadySent =
    await prisma.orderStatusEmail.findFirst({
      where: {
        order_id: order.id,
        status,
      },
    });

  if (alreadySent) {
    return false;
  }

  const trackingUrl =
    getTrackingUrl();
  const itemsHtml =
    getOrderItemsHtml(
      order.items
    );
  const timelineHtml =
    getOrderTimelineHtml(
      status
    );
  const orderNumber =
    getOrderDisplayNumber(
      order
    );

  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to: [
          order.contact.email,
        ],
        subject:
          `${config.subject} - Pedido #${orderNumber} | Helô Cosméticos`,
        html: `
          <div style="background:#fff8fa;padding:32px 16px;font-family:Arial,sans-serif;color:#43232d;">
            <div style="background:#ffffff;border:1px solid #f1dfe5;border-radius:20px;margin:0 auto;max-width:560px;padding:32px;">
              <p style="color:#d9536f;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Helô Cosméticos</p>
              <h1 style="font-size:25px;margin:18px 0 8px;">${config.title}</h1>
              <p>Olá, ${escapeHtml(order.contact.name || "cliente")}! ${config.intro}</p>
              <ul style="padding-left:20px;">${itemsHtml}</ul>
              <p style="font-size:18px;"><strong>Total: ${formatMoney(Number(order.total))}</strong></p>
              <p>Entrega: ${escapeHtml(order.shipping_method || "A confirmar")} ${order.shipping_deadline ? `- ${escapeHtml(order.shipping_deadline)}` : ""}</p>
              ${timelineHtml}
              <a href="${trackingUrl}" style="background:#d9536f;border-radius:12px;color:#ffffff;display:inline-block;font-weight:700;margin-top:18px;padding:14px 22px;text-decoration:none;">Acompanhar meu pedido</a>
              <p style="color:#78636b;font-size:12px;margin-top:28px;">Na página de acompanhamento, informe o número do pedido e o e-mail usado na compra.</p>
            </div>
          </div>
        `,
      },
      {
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
      }
    );

    await prisma.orderStatusEmail.create({
      data: {
        order_id: order.id,
        status,
      },
    });

    return true;
  } catch (error) {
    console.error(
      "Erro ao enviar e-mail de movimentação do pedido:",
      axios.isAxiosError(error)
        ? error.response?.data ||
            error.message
        : error
    );

    return false;
  }
}
