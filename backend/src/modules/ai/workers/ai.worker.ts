import { Worker }
  from "bullmq";

import { redis }
  from "../../../config/redis.js";

import { buildContext }
  from "../services/context.service.js";

import {
  createMessage,
} from "../../attendance/attendance.service.js";
import { executeAiAgent } from "../services/ai-agent.service.js";
import { updateConversationMemory } from "../services/conversation-memory.service.js";

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

        await createMessage({
          conversation_id:
            conversationId,

          sender_type:
            "agent",

          content:
            response,
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
