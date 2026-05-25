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
  const checkoutUrl =
    `${getSiteUrl()}/checkout/${order.id}`;
  const itemsHtml =
    getOrderItemsHtml(
      order.items
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
          `Seu pedido #${order.id} aguarda pagamento | Helô Cosméticos`,
        html: `
          <div style="background:#fff8fa;padding:32px 16px;font-family:Arial,sans-serif;color:#43232d;">
            <div style="background:#ffffff;border:1px solid #f1dfe5;border-radius:20px;margin:0 auto;max-width:560px;padding:32px;">
              <p style="color:#d9536f;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Helô Cosméticos</p>
              <h1 style="font-size:25px;margin:18px 0 8px;">Seu pedido foi recebido</h1>
              <p>Olá, ${escapeHtml(order.contact.name || "cliente")}! O pedido <strong>#${order.id}</strong> está pronto e aguardando o pagamento.</p>
              <ul style="padding-left:20px;">${itemsHtml}</ul>
              <p style="font-size:18px;"><strong>Total atual: ${formatMoney(Number(order.total))}</strong></p>
              <p>Entrega: ${escapeHtml(order.shipping_method || "A confirmar")} ${order.shipping_deadline ? `- ${escapeHtml(order.shipping_deadline)}` : ""}</p>
              <a href="${checkoutUrl}" style="background:#d9536f;border-radius:12px;color:#ffffff;display:inline-block;font-weight:700;margin-top:18px;padding:14px 22px;text-decoration:none;">Concluir pagamento</a>
              <p style="color:#78636b;font-size:12px;margin-top:26px;">Você também pode <a href="${trackingUrl}" style="color:#d9536f;">acompanhar seu pedido</a> informando o número #${order.id} e este e-mail.</p>
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

  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to: [
          order.contact.email,
        ],
        subject:
          `Pagamento confirmado - Pedido #${order.id} | Helô Cosméticos`,
        html: `
          <div style="background:#fff8fa;padding:32px 16px;font-family:Arial,sans-serif;color:#43232d;">
            <div style="background:#ffffff;border:1px solid #f1dfe5;border-radius:20px;margin:0 auto;max-width:560px;padding:32px;">
              <p style="color:#d9536f;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Helô Cosméticos</p>
              <h1 style="font-size:25px;margin:18px 0 8px;">Pagamento confirmado</h1>
              <p>Olá, ${escapeHtml(order.contact.name || "cliente")}! Recebemos o pagamento do seu pedido <strong>#${order.id}</strong>.</p>
              <ul style="padding-left:20px;">${itemsHtml}</ul>
              <p style="font-size:18px;"><strong>Total: ${formatMoney(Number(order.total))}</strong></p>
              <p>Entrega: ${escapeHtml(order.shipping_method || "A confirmar")} ${order.shipping_deadline ? `- ${escapeHtml(order.shipping_deadline)}` : ""}</p>
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
