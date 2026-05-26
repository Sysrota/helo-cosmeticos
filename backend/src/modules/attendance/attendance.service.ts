import { prisma } from "../../config/prisma.js";

import { io } from "../../websocket/socket.js";

import {
  sendWhatsAppMessage,
  sendWhatsAppMediaMessage,
} from "../whatsapp/services/meta.service.js";

import { aiQueue }
  from "../../queues/ai.queue.js";
import { redis } from "../../config/redis.js";

interface CreateConversationDTO {
  phone: string;
  name?: string;
}

export async function createConversation(
  data: CreateConversationDTO
) {
  let contact =
    await prisma.contact.findUnique({
      where: {
        phone: data.phone,
      },
    });

  if (!contact) {
    contact =
      await prisma.contact.create({
        data: {
          phone: data.phone,
          name: data.name,
        },
      });
  }

  const conversation =
    await prisma.conversation.create({
      data: {
        contact_id: contact.id,
      },

      include: {
        contact: true,
      },
    });

  return conversation;
}

export async function listConversations() {
  return prisma.conversation.findMany({
    include: {
      contact: true,
    },

    orderBy: {
      updated_at: "desc",
    },
  });
}

export async function deleteConversation(
  conversationId: number
) {
  const conversation =
    await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        id: true,
      },
    });

  if (!conversation) {
    return false;
  }

  const existingJobs =
    await aiQueue.getDelayed();

  for (const job of existingJobs) {
    if (
      job.id ===
      `conversation-${conversationId}`
    ) {
      await job.remove();
    }
  }

  await redis.del(
    `conversation:last-message:${conversationId}`
  );

  await prisma.conversation.delete({
    where: {
      id: conversationId,
    },
  });

  io.emit(
    "conversation_deleted",
    {
      id: conversationId,
    }
  );

  return true;
}

interface CreateMessageDTO {
  conversation_id: number;

  sender_type: string;

  content: string;

  type?: string;

  media_url?: string;
}

export async function createMessage(
  data: CreateMessageDTO
) {
  const message =
    await prisma.message.create({
      data: {
        conversation_id:
          data.conversation_id,

        sender_type:
          data.sender_type,

        content: data.content,

        type: data.type ?? "text",

        media_url: data.media_url,
      },
    });

  const updatedConversation =
    await prisma.conversation.update({
      where: {
        id: data.conversation_id,
      },

      data: {
        last_message: data.content,

        last_message_at:
          new Date(),

        unread_count:
          data.sender_type ===
          "client"
            ? {
                increment: 1,
              }
            : undefined,
      },

      include: {
        contact: true,
      },
    });

  const fullMessage =
    await prisma.message.findUnique({
      where: {
        id: message.id,
      },

      include: {
        conversation: {
          include: {
            contact: true,
          },
        },
      },
    });

  io.emit(
    "conversation_updated",
    updatedConversation
  );

  io.to(
    `conversation:${data.conversation_id}`
  ).emit(
    "new_message",
    fullMessage
  );

  if (
    data.sender_type ===
    "client"
  ) {


  const existingJobs =
    await aiQueue.getDelayed();

  for (const job of existingJobs) {
    if (
      job.id ===
      `conversation-${data.conversation_id}`
    ) {

      await job.remove();
    }
  }

  await redis.set(
    `conversation:last-message:${data.conversation_id}`,
    Date.now()
  );

  await aiQueue.add(
      "generate-response",

      {
        conversationId:
          data.conversation_id,
      },

      {
        jobId:
          `conversation-${data.conversation_id}`,

        delay: 2000,

        removeOnComplete: true,
      }
    );
  }


  if (
    data.sender_type ===
    "agent"
  ) {

  const conversation =
    await prisma.conversation.findUnique({
      where: {
        id: data.conversation_id,
      },

      include: {
        contact: true,
      },
    });

  if (
    conversation?.contact?.phone
  ) {

    // TEXTO
    if (!data.media_url) {

      await sendWhatsAppMessage(
        conversation.contact.phone,
        data.content
      );
    }

    // ARQUIVO
    else {

      const mediaUrl =
        `${process.env.APP_URL}${data.media_url}`;

      let mediaType =
        "document";

      if (
        data.type === "image"
      ) {
        mediaType = "image";
      }

      if (
        data.type === "audio"
      ) {
        mediaType = "audio";
      }

      console.log(mediaUrl);
      
      await sendWhatsAppMediaMessage(
        conversation.contact.phone,
        mediaUrl,
        mediaType,
        data.content
      );
    }
  }
}

  return fullMessage;
}

export async function listMessages(
  conversationId: number
) {
  return prisma.message.findMany({
    where: {
      conversation_id:
        conversationId,
    },

    orderBy: {
      created_at: "asc",
    },
  });
}

export async function markConversationAsRead(
  conversationId: number
) {
  return prisma.conversation.update({
    where: {
      id: conversationId,
    },

    data: {
      unread_count: 0,
    },
  });
}
