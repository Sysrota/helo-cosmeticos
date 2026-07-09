import {
  Request,
  Response,
} from "express";

import axios from "axios";
import crypto from "crypto";
import {
  prisma,
} from "../../../config/prisma.js";
import {
  io,
} from "../../../websocket/socket.js";
import {
  sendOrderStatusMovementEmail,
} from "../../notification/order-email.service.js";
import {
  sendOrderStatusUpdateWhatsApp,
} from "../../notification/order-whatsapp-template.service.js";
import {
  generateMelhorEnvioLabel,
} from "./melhor-envio-label.service.js";

const SHIPPING_EVENT_COPY: Record<
  string,
  {
    title: string;
    description: string;
  }
> = {
  created: {
    title:
      "Adicionado no sistema",
    description:
      "A etiqueta de envio foi criada e o pacote está pronto para seguir para coleta ou postagem.",
  },
  pending: {
    title:
      "Aguardando liberação",
    description:
      "A etiqueta voltou ao carrinho ou aguarda liberação para continuar o envio.",
  },
  released: {
    title:
      "Etiqueta paga",
    description:
      "A etiqueta foi paga e está pronta para geração.",
  },
  generated: {
    title:
      "Etiqueta gerada",
    description:
      "O pacote foi preparado para ser postado ou coletado pela transportadora.",
  },
  received: {
    title:
      "Pacote recebido no ponto",
    description:
      "A transportadora recebeu o pacote e seguirá com a próxima etapa de distribuição.",
  },
  posted: {
    title:
      "Pacote postado",
    description:
      "A encomenda foi postada e entrou no fluxo de transporte.",
  },
  delivered: {
    title:
      "Pedido entregue",
    description:
      "A encomenda foi entregue ao destinatário.",
  },
  undelivered: {
    title:
      "Entrega não concluída",
    description:
      "A transportadora informou que não conseguiu concluir a entrega.",
  },
  paused: {
    title:
      "Entrega pausada",
    description:
      "A entrega foi interrompida e pode precisar de uma ação do destinatário.",
  },
  suspended: {
    title:
      "Envio suspenso",
    description:
      "O envio da etiqueta foi suspenso pela transportadora ou pelo Melhor Envio.",
  },
  cancelled: {
    title:
      "Etiqueta cancelada",
    description:
      "A etiqueta de envio foi cancelada.",
  },
};

export async function connectMelhorEnvioController(
  _: Request,
  res: Response
) {

  const params =
    new URLSearchParams({
      client_id:
        process.env
          .MELHOR_ENVIO_CLIENT_ID || "",

      redirect_uri:
        process.env
          .MELHOR_ENVIO_REDIRECT_URI || "",

      response_type:
        "code",

      scope:
        "shipping-calculate shipping-checkout shipping-generate shipping-print shipping-tracking",
    });

  return res.redirect(
    `https://www.melhorenvio.com.br/oauth/authorize?${params.toString()}`
  );
}

export async function melhorEnvioCallbackController(
  req: Request,
  res: Response
) {

  try {

    const { code } =
      req.query;

    if (!code) {

      return res.status(400).send(
        "Code não informado"
      );
    }

    const response =
      await axios.post(
        "https://www.melhorenvio.com.br/oauth/token",
        {
          grant_type:
            "authorization_code",

          client_id:
            process.env
              .MELHOR_ENVIO_CLIENT_ID,

          client_secret:
            process.env
              .MELHOR_ENVIO_CLIENT_SECRET,

          redirect_uri:
            process.env
              .MELHOR_ENVIO_REDIRECT_URI,

          code,
        }
      );

    console.log(
      "TOKEN:",
      response.data
    );

    return res.send(
      "Melhor Envio conectado com sucesso"
    );

  } catch (error: any) {

    console.log(
      error?.response?.data ||
      error
    );

    return res.status(500).send(
      "Erro OAuth Melhor Envio"
    );
  }
}

function getWebhookSecret() {
  return (
    process.env.MELHOR_ENVIO_WEBHOOK_SECRET ||
    process.env.MELHOR_ENVIO_CLIENT_SECRET ||
    ""
  );
}

function verifyWebhookSignature(
  body: string,
  signature: string | string[] | undefined
) {
  const secret =
    getWebhookSecret();
  const receivedSignature =
    Array.isArray(signature)
      ? signature[0]
      : signature;

  if (!secret) {
    throw new Error(
      "Secret do webhook Melhor Envio não configurado"
    );
  }

  if (!receivedSignature) {
    return false;
  }

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(body)
      .digest("base64");

  const receivedBuffer =
    Buffer.from(
      receivedSignature
    );
  const expectedBuffer =
    Buffer.from(
      expectedSignature
    );

  return (
    receivedBuffer.length ===
      expectedBuffer.length &&
    crypto.timingSafeEqual(
      receivedBuffer,
      expectedBuffer
    )
  );
}

function extractOrderCandidates(
  payload: any
) {
  const data =
    payload?.data || {};
  const candidates =
    new Set<string>();

  for (const value of [
    data.id,
    data.protocol,
    data.tracking,
    data.self_tracking,
  ]) {
    if (value) {
      candidates.add(
        String(value)
      );
    }
  }

  for (const tag of data.tags || []) {
    for (const value of [
      tag?.tag,
      tag?.url,
    ]) {
      const text =
        String(value || "");

      if (text) {
        candidates.add(text);
      }

      const orderMatch =
        text.match(
          /(?:pedido|order|checkout)[^\d]*(\d+)/i
        );

      if (orderMatch?.[1]) {
        candidates.add(
          orderMatch[1]
        );
      }
    }
  }

  return [
    ...candidates,
  ];
}

async function findOrderForMelhorEnvioWebhook(
  payload: any
) {
  const data =
    payload?.data || {};
  const candidates =
    extractOrderCandidates(
      payload
    );
  const numericCandidates =
    candidates
      .map((candidate) =>
        Number(candidate)
      )
      .filter(
        (candidate) =>
          Number.isInteger(candidate) &&
          candidate > 0
      );

  return prisma.order.findFirst({
    where: {
      OR: [
        ...(data.id
          ? [
              {
                melhor_envio_order_id:
                  String(data.id),
              },
            ]
          : []),
        ...(data.protocol
          ? [
              {
                melhor_envio_protocol:
                  String(data.protocol),
              },
            ]
          : []),
        ...(data.tracking
          ? [
              {
                tracking_code:
                  String(data.tracking),
              },
            ]
          : []),
        ...(data.self_tracking
          ? [
              {
                tracking_code:
                  String(data.self_tracking),
              },
            ]
          : []),
        ...candidates.map(
          (candidate) => ({
            order_number:
              candidate,
          })
        ),
        ...numericCandidates.map(
          (candidate) => ({
            id:
              candidate,
          })
        ),
      ],
    },
  });
}

function getShippingStatusFromPayload(
  payload: any
) {
  return String(
    payload?.data?.status ||
    payload?.event ||
    ""
  )
    .replace(/^order\./, "")
    .trim();
}

function getEventDate(
  data: any,
  status: string
) {
  const candidates = [
    status === "delivered"
      ? data.delivered_at
      : null,
    status === "posted"
      ? data.posted_at
      : null,
    status === "generated"
      ? data.generated_at
      : null,
    status === "released"
      ? data.paid_at
      : null,
    data.updated_at,
    data.created_at,
  ].filter(Boolean);

  const parsed =
    candidates
      .map((value) =>
        new Date(value)
      )
      .find(
        (date) =>
          !Number.isNaN(
            date.getTime()
          )
      );

  return parsed || new Date();
}

function getEventLocation(
  data: any
) {
  const tagLocation =
    (data.tags || [])
      .map((tag: any) =>
        tag?.tag || tag?.url
      )
      .find(Boolean);

  return tagLocation
    ? String(tagLocation)
    : null;
}

async function saveShippingEvent(
  orderId: number,
  payload: any
) {
  const data =
    payload?.data || {};
  const status =
    getShippingStatusFromPayload(
      payload
    );
  const event =
    String(
      payload?.event ||
      `order.${status || "updated"}`
    );
  const copy =
    SHIPPING_EVENT_COPY[status] || {
      title:
        "Atualização no envio",
      description:
        "A transportadora enviou uma nova atualização sobre a entrega.",
    };
  const occurredAt =
    getEventDate(
      data,
      status
    );

  return prisma.orderShippingEvent.upsert({
    where: {
      order_id_event_occurred_at: {
        order_id:
          orderId,
        event,
        occurred_at:
          occurredAt,
      },
    },
    update: {
      status:
        status || null,
      title:
        copy.title,
      description:
        copy.description,
      location:
        getEventLocation(data),
      tracking_code:
        data.tracking ||
        data.self_tracking ||
        null,
      tracking_url:
        data.tracking_url ||
        null,
      payload,
    },
    create: {
      order_id:
        orderId,
      event,
      status:
        status || null,
      title:
        copy.title,
      description:
        copy.description,
      location:
        getEventLocation(data),
      tracking_code:
        data.tracking ||
        data.self_tracking ||
        null,
      tracking_url:
        data.tracking_url ||
        null,
      occurred_at:
        occurredAt,
      payload,
    },
  });
}

function getOrderStatusFromShippingStatus(
  shippingStatus: string
) {
  const statusMap: Record<string, string> = {
    generated: "preparing",
    received: "shipping",
    posted: "shipping",
    delivered: "finished",
  };

  return statusMap[shippingStatus] || null;
}

function shouldApplyOrderStatus(
  currentStatus: string | null | undefined,
  nextStatus: string | null
) {
  if (!nextStatus) {
    return false;
  }

  const rank: Record<string, number> = {
    pending: 0,
    paid: 1,
    preparing: 2,
    shipping: 3,
    finished: 4,
    cancelled: 5,
  };
  const currentRank =
    rank[String(currentStatus || "pending")] ?? 0;
  const nextRank =
    rank[nextStatus] ?? currentRank;

  if (currentStatus === "cancelled") {
    return false;
  }

  return nextRank > currentRank;
}

async function notifyCustomerShippingMovement(
  orderId: number,
  orderStatus: string | null
) {
  if (!orderStatus) {
    return;
  }

  await sendOrderStatusMovementEmail(
    orderId,
    orderStatus
  );

  if (orderStatus === "finished") {
    await sendOrderStatusUpdateWhatsApp(
      orderId,
      orderStatus
    );
  }
}

export async function melhorEnvioWebhookController(
  req: Request,
  res: Response
) {
  try {
    const isValidSignature =
      verifyWebhookSignature(
        req.rawBody || "",
        req.headers["x-me-signature"]
      );

    if (!isValidSignature) {
      return res.status(401).json({
        error:
          "Assinatura inválida",
      });
    }

    const payload =
      req.body || {};
    const data =
      payload.data || {};
    const order =
      await findOrderForMelhorEnvioWebhook(
        payload
      );

    if (!order) {
      console.warn(
        "[Melhor Envio Webhook] Pedido não encontrado:",
        {
          event:
            payload.event,
          id:
            data.id,
          protocol:
            data.protocol,
          tracking:
            data.tracking ||
            data.self_tracking,
        }
      );

      return res.json({
        ok: true,
        ignored: true,
      });
    }

    await saveShippingEvent(
      order.id,
      payload
    );

    const shippingStatus =
      getShippingStatusFromPayload(
        payload
      );
    const nextOrderStatus =
      getOrderStatusFromShippingStatus(
        shippingStatus
      );
    const shouldUpdateOrderStatus =
      shouldApplyOrderStatus(
        order.status,
        nextOrderStatus
      );

    const updatedOrder =
      await prisma.order.update({
        where: {
          id:
            order.id,
        },
        data: {
          melhor_envio_order_id:
            data.id
              ? String(data.id)
              : order.melhor_envio_order_id,
          melhor_envio_protocol:
            data.protocol
              ? String(data.protocol)
              : order.melhor_envio_protocol,
          tracking_code:
            data.tracking ||
            data.self_tracking ||
            order.tracking_code,
          tracking_url:
            data.tracking_url ||
            order.tracking_url,
          shipping_status:
            data.status ||
            shippingStatus ||
            order.shipping_status,
          shipping_status_updated_at:
            new Date(),
          shipping_events:
            payload,
          status:
            shouldUpdateOrderStatus
              ? nextOrderStatus || undefined
              : undefined,
        },
        include: {
          contact: true,
          coupon: true,
          items: {
            include: {
              product: true,
            },
          },
          shipping_events_list: {
            orderBy: {
              occurred_at:
                "desc",
            },
          },
        },
      });

    io.emit(
      "order_updated",
      updatedOrder
    );

    if (nextOrderStatus) {
      void notifyCustomerShippingMovement(
        order.id,
        nextOrderStatus
      ).catch((error) => {
        console.error(
          "Erro ao notificar cliente sobre movimentação do Melhor Envio:",
          error
        );
      });
    }

    return res.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "[Melhor Envio Webhook] Erro:",
      error
    );

    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao processar webhook",
    });
  }
}

export async function generateMelhorEnvioLabelController(
  req: Request,
  res: Response
) {
  try {
    const result =
      await generateMelhorEnvioLabel(
        Number(req.params.orderId)
      );

    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao gerar etiqueta",
    });
  }
}
