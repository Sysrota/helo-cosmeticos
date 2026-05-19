import { Request, Response } from "express";

import { prisma } from "../../../config/prisma.js";

import { io } from "../../../websocket/socket.js";

import {
  downloadWhatsAppMedia,
} from "../services/meta.service.js";

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

      text = "🎤 Áudio";
    }

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

    let conversation =
      await prisma.conversation.findFirst({
        where: {
          contact_id: contact.id,
        },

        include: {
          contact: true,
        },
      });

    if (!conversation) {
      conversation =
        await prisma.conversation.create({
          data: {
            contact_id: contact.id,

            last_message: text,

            last_message_at:
              new Date(),

            unread_count: 1,
          },

          include: {
            contact: true,
          },
        });
    }

    const newMessage =
      await prisma.message.create({
        data: {
          conversation_id:
            conversation.id,

          sender_type:
            "client",

          content: text,

          type,

          media_url: mediaUrl,
        },
      });

    const updatedConversation =
      await prisma.conversation.update({
        where: {
          id: conversation.id,
        },

        data: {
          last_message: text,

          last_message_at:
            new Date(),

          unread_count: {
            increment: 1,
          },
        },

        include: {
          contact: true,
        },
      });

    io.emit(
      "conversation_updated",
      updatedConversation
    );

    io.to(
      `conversation:${conversation.id}`
    ).emit(
      "new_message",
      newMessage
    );

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