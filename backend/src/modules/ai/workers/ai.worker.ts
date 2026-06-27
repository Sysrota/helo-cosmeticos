import { Worker }
  from "bullmq";

import { redis }
  from "../../../config/redis.js";

import { prisma }
  from "../../../config/prisma.js";

import { buildContext }
  from "../services/context.service.js";

import {
  createMessage,
} from "../../attendance/attendance.service.js";
import { executeAiAgent } from "../services/ai-agent.service.js";
import { updateConversationMemory } from "../services/conversation-memory.service.js";
import {
  findLastProductImage,
  findRequestedProductImage,
  isAiImageDeliveryResponse,
} from "../services/product-image.service.js";
import {
  findRequestedProductLink,
} from "../services/product-link.service.js";
import {
  findRequestedProductPrice,
} from "../services/product-price.service.js";
import {
  debugAiLog,
} from "../services/debug-log.service.js";
import {
  buildProductIntroResponse,
} from "../services/product-intro-response.service.js";
import {
  buildSiteEntryResponse,
} from "../services/site-entry-response.service.js";

async function isLatestClientMessageJob(
  job: {
    data: {
      messageId?: number;
    };
    timestamp: number;
  },
  conversationId: number
) {
  const latestMessage =
    await redis.get(
      `conversation:last-message:${conversationId}`
    );

  if (!latestMessage) {
    return true;
  }

  if (
    latestMessage.startsWith(
      "id:"
    )
  ) {
    return (
      Number(
        latestMessage.slice(3)
      ) ===
      Number(job.data.messageId)
    );
  }

  return (
    Number(latestMessage) <=
    job.timestamp
  );
}

export const aiWorker =
  new Worker(
    "ai-attendance",

    async (job) => {

      try {

        const conversationId =
          Number(
            job.data.conversationId
          );

        if (
          !await isLatestClientMessageJob(
            job,
            conversationId
          )
        ) {

          console.log(
            "JOB ANTIGA IGNORADA"
          );

          return;
        }

        // Verifica se o atendimento humano assumiu (blocked_ai no contato)
        const conversation =
          await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { contact: true },
          });

        if (conversation?.contact?.blocked_ai) {
          console.log(
            `IA bloqueada para conversa ${conversationId} (atendimento humano)`
          );
          return;
        }

        const lastClientMessage =
          await prisma.message.findUnique({
            where: {
              id:
                Number(
                  job.data.messageId
                ),
            },
          });

        const requestedProductLink =
          lastClientMessage?.content
            ? await findRequestedProductLink({
                conversationId,
                message:
                  lastClientMessage.content,
              })
            : null;

        if (requestedProductLink) {
          await createMessage({
            conversation_id:
              conversationId,

            sender_type:
              "agent",

            content:
              `Claro! Aqui está o link do ${requestedProductLink.productTitle}:\n\n${requestedProductLink.productUrl}`,

            type:
              "text",
          });

          await updateConversationMemory({
            conversationId,
          });

          return;
        }

        const requestedProductPrice =
          lastClientMessage?.content
            ? await findRequestedProductPrice({
                conversationId,
                message:
                  lastClientMessage.content,
              })
            : null;

        if (requestedProductPrice) {
          await createMessage({
            conversation_id:
              conversationId,

            sender_type:
              "agent",

            content:
              `O ${requestedProductPrice.productTitle} custa ${requestedProductPrice.formattedPrice}.\n\nQuer que eu adicione ao seu carrinho?`,

            type:
              "text",
          });

          await updateConversationMemory({
            conversationId,
          });

          return;
        }

        const siteEntryResponse =
          lastClientMessage?.content
            ? await buildSiteEntryResponse({
                message:
                  lastClientMessage.content,
                conversationId,
              })
            : null;

        if (siteEntryResponse) {
          await createMessage({
            conversation_id:
              conversationId,

            sender_type:
              "agent",

            content:
              siteEntryResponse,

            type:
              "text",
          });

          await updateConversationMemory({
            conversationId,
          });

          return;
        }

        const productIntroResponse =
          lastClientMessage?.content
            ? await buildProductIntroResponse({
                message:
                  lastClientMessage.content,
                conversationId,
              })
            : null;

        if (productIntroResponse) {
          await createMessage({
            conversation_id:
              conversationId,

            sender_type:
              "agent",

            content:
              productIntroResponse,

            type:
              "text",
          });

          await updateConversationMemory({
            conversationId,
          });

          return;
        }

        const messages =
          await buildContext(
            conversationId
          );

        debugAiLog(
          "Contexto retornado por buildContext",
          messages
        );

        const response =
          await executeAiAgent({

            conversationId,

            messages,
          });

        if (!response) {
          return;
        }

        if (
          !await isLatestClientMessageJob(
            job,
            conversationId
          )
        ) {
          console.log(
            "RESPOSTA IA ANTIGA IGNORADA"
          );

          return;
        }

        const requestedProductImage =
          lastClientMessage?.content
            ? await findRequestedProductImage({
                conversationId,
                message:
                  lastClientMessage.content,
              })
            : null;
        const aiPromisedProductImage =
          !requestedProductImage &&
          isAiImageDeliveryResponse(response)
            ? await findLastProductImage(
                conversationId
              )
            : null;
        const productImage =
          requestedProductImage ||
          aiPromisedProductImage;

        await createMessage({
          conversation_id:
            conversationId,

          sender_type:
            "agent",

          content:
            productImage
              ? `Foto do produto: ${productImage.productTitle}`
              : response,

          type:
            productImage
              ? "image"
              : "text",

          media_url:
            productImage
              ?.imageUrl,

          send_caption:
            productImage
              ? false
              : undefined,
        });

        await updateConversationMemory({
          conversationId,
        });

      } catch (error) {

        console.log(
          "ERRO IA:",
          error
        );
      }
    },

    {
      connection: redis,
    }
  );
