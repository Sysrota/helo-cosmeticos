import { Worker }
  from "bullmq";

import { redis }
  from "../../../config/redis.js";

import { buildContext }
  from "../services/context.service.js";

import { gerarRespostaIA }
  from "../services/openai.service.js";

import {
  createMessage,
} from "../../attendance/attendance.service.js";

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
          await gerarRespostaIA({
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