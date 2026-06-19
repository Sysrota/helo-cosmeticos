import { Request, Response } from "express";

import { prisma } from "../../../config/prisma.js";

import {
  downloadWhatsAppMedia,
  sendWhatsAppMessage,
} from "../services/meta.service.js";
import { createMessage } from "../../attendance/attendance.service.js";
import {
  transcribeAudioFile,
} from "../../ai/services/audio-transcription.service.js";
import { renewManagerWindow } from "../../manager/manager-notification.service.js";
import { executeAdminAgent } from "../../manager/manager-agent.service.js";

export async function verifyWebhookController(
  req: Request,
  res: Response
) {
  const mode =
    req.query[
      "hub.mode"
    ];

  const token =
    req.query[
      "hub.verify_token"
    ];

  const challenge =
    req.query[
      "hub.challenge"
    ];

  if (
    mode === "subscribe" &&
    token ===
      process.env
        .WHATSAPP_VERIFY_TOKEN
  ) {
    return res
      .status(200)
      .send(challenge);
  }

  return res.sendStatus(403);
}

export async function receiveWebhookController(
  req: Request,
  res: Response
) {
  try {

    const body = req.body;

    const value =
      body?.entry?.[0]
        ?.changes?.[0]
        ?.value;

    if (!value?.messages) {
      return res.sendStatus(200);
    }

    const message =
      body?.entry?.[0]
        ?.changes?.[0]
        ?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const contactData =
      body?.entry?.[0]
        ?.changes?.[0]
        ?.value?.contacts?.[0];

    const phone =
      contactData?.wa_id;

    const name =
      contactData?.profile?.name;

    let text =
      message?.text?.body || "";

    let mediaUrl:
      | string
      | undefined;

    let type =
      message?.type || "text";

    // IMAGEM
    if (
      type === "image" &&
      message?.image?.id
    ) {

      const media =
        await downloadWhatsAppMedia(
          message.image.id
        );

      mediaUrl =
        `/uploads/${media.fileName}`;

      text = "📷 Imagem";
    }

    // ÁUDIO
    if (
      type === "audio" &&
      message?.audio?.id
    ) {

      const media =
        await downloadWhatsAppMedia(
          message.audio.id
        );

      mediaUrl =
        `/uploads/${media.fileName}`;

      const transcription =
        await transcribeAudioFile(
          media.filePath
        );

      text =
        transcription
          ? `Audio transcrito: "${transcription}"`
          : "Audio recebido. Nao consegui transcrever automaticamente.";
    }

    // DOCUMENTO
    if (
      type === "document" &&
      message?.document?.id
    ) {

      const media =
        await downloadWhatsAppMedia(
          message.document.id
        );

      mediaUrl =
        `/uploads/${media.fileName}`;

      text = "📄 Documento";
    }

    if (!phone || !text) {
      return res.sendStatus(200);
    }

    // =====================
    // ROTEAMENTO GESTOR
    // =====================

    const config = await prisma.storeConfig.findUnique({ where: { id: 1 } });

    const isManager =
      config &&
      (phone === config.manager_phone_1 || phone === config.manager_phone_2);

    if (isManager) {
      await handleManagerMessage({ phone, name, text, type, mediaUrl });
      return res.sendStatus(200);
    }

    // =====================
    // FLUXO CLIENTE
    // =====================

    // CONTATO
    let contact =
      await prisma.contact.findUnique({
        where: {
          phone,
        },
      });

    if (!contact) {

      contact =
        await prisma.contact.create({
          data: {
            phone,
            name,
          },
        });
    }

    // CONVERSA
    let conversation =
      await prisma.conversation.findFirst({
        where: {
          contact_id:
            contact.id,
        },

        include: {
          contact: true,
        },
      });

    if (!conversation) {

      conversation =
        await prisma.conversation.create({
          data: {
            contact_id:
              contact.id,

            last_message:
              text,

            last_message_at:
              new Date(),

            unread_count: 1,
          },

          include: {
            contact: true,
          },
        });
    }

      if (
        message?.from ===
        process.env.WHATSAPP_PHONE_NUMBER_ID
      ) {
        return res.sendStatus(200);
      }

    // MENSAGEM
    await createMessage({
      conversation_id:
        conversation.id,

      sender_type:
        "client",

      content: text,

      type,

      media_url: mediaUrl,
    });

    console.log(
      "✅ Mensagem recebida:",
      text
    );

    return res.sendStatus(200);

  } catch (error) {

    console.error(error);

    return res.sendStatus(500);
  }
}

async function handleManagerMessage({
  phone,
  name,
  text,
  type,
  mediaUrl,
}: {
  phone: string;
  name?: string;
  text: string;
  type: string;
  mediaUrl?: string;
}) {
  // Renova a janela de 24h e drena notificações pendentes
  await renewManagerWindow(phone);

  // Busca ou cria contato do gestor
  let contact = await prisma.contact.findUnique({ where: { phone } });
  if (!contact) {
    contact = await prisma.contact.create({ data: { phone, name } });
  }

  // Busca ou cria conversa do gestor
  let conversation = await prisma.conversation.findFirst({
    where: { contact_id: contact.id },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        contact_id: contact.id,
        last_message: text,
        last_message_at: new Date(),
      },
    });
  }

  // Salva mensagem do gestor (sem disparar fila de IA de clientes)
  await prisma.message.create({
    data: {
      conversation_id: conversation.id,
      sender_type: "client",
      content: text,
      type,
      media_url: mediaUrl ?? null,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { last_message: text, last_message_at: new Date() },
  });

  // Monta histórico das últimas 20 mensagens para contexto
  const recentMessages = await prisma.message.findMany({
    where: { conversation_id: conversation.id },
    orderBy: { created_at: "desc" },
    take: 20,
  });

  const messages = recentMessages
    .reverse()
    .map((m) => ({
      role: m.sender_type === "client" ? "user" : "assistant",
      content: m.content,
    }));

  // Executa agente administrativo
  const response = await executeAdminAgent({
    conversationId: conversation.id,
    messages,
  });

  if (!response) return;

  // Envia resposta via WhatsApp
  await sendWhatsAppMessage(phone, response);

  // Salva resposta da IA
  await prisma.message.create({
    data: {
      conversation_id: conversation.id,
      sender_type: "agent",
      content: response,
      type: "text",
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { last_message: response, last_message_at: new Date() },
  });

  console.log(`✅ Resposta admin enviada para ${phone}`);
}
