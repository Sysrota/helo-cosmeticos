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
  buildProductImageCaption,
  findRequestedProductImage,
} from "../services/product-image.service.js";

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

        const messages =
          await buildContext(
            conversationId
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

        const lastClientMessage =
          await prisma.message.findUnique({
            where: {
              id:
                Number(
                  job.data.messageId
                ),
            },
          });

        const requestedProductImage =
          lastClientMessage?.content
            ? await findRequestedProductImage({
                conversationId,
                message:
                  lastClientMessage.content,
              })
            : null;

        await createMessage({
          conversation_id:
            conversationId,

          sender_type:
            "agent",

          content:
            requestedProductImage
              ? buildProductImageCaption(
                  response,
                  requestedProductImage
                    .productTitle
                )
              : response,

          type:
            requestedProductImage
              ? "image"
              : "text",

          media_url:
            requestedProductImage
              ?.imageUrl,
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
