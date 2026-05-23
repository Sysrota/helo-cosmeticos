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

export const aiWorker =
  new Worker(
    "ai-attendance",

    async (job) => {

      try {

        const conversationId =
          Number(
            job.data.conversationId
          );

        // PEGA TIMESTAMP MAIS RECENTE
        const latestMessage =
          await redis.get(
            `conversation:last-message:${conversationId}`
          );

        // JOB ANTIGA
        if (
          latestMessage &&
          Number(latestMessage) >
          job.timestamp
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