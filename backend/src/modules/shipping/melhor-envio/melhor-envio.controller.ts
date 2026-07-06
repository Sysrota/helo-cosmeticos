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
        "shipping-calculate shipping-generate shipping-tracking",
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
            String(payload.event || "")
              .replace(/^order\./, "") ||
            order.shipping_status,
          shipping_status_updated_at:
            new Date(),
          shipping_events:
            payload,
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

    io.emit(
      "order_updated",
      updatedOrder
    );

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
