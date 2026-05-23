import OpenAI
  from "openai";

import {
  prisma,
} from "../../../config/prisma.js";

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY,
  });

interface Props {
  conversationId: number;
}

export async function updateConversationMemory({
  conversationId,
}: Props) {

  // =========================
  // CONVERSATION
  // =========================

  const conversation =
    await prisma.conversation
      .findUnique({
        where: {
          id: conversationId,
        },
      });

  if (!conversation) {
    return;
  }

  // =========================
  // MESSAGES
  // =========================

  const messages =
    await prisma.message
      .findMany({

        where: {
          conversation_id:
            conversationId,
        },

        orderBy: {
          created_at: "asc",
        },

        take: 40,
      });

  // =========================
  // TEXT
  // =========================

  const history =
    messages
      .map((message) => {

        return `
${message.sender_type}:
${message.content}
`;
      })
      .join("\n");

  // =========================
  // OPENAI SUMMARY
  // =========================

  const response =
    await openai.chat.completions
      .create({

        model:
          "gpt-4.1-mini",

        temperature: 0.3,

        messages: [

          {
            role: "system",

            content: `
Você é um sistema de memória comercial.

Analise a conversa e gere:

1. resumo curto
2. intenção do cliente
3. etapa do funil
4. produtos desejados
5. objeções
6. dados importantes

Retorne JSON válido.

Formato:

{
  "summary": "...",
  "stage": "...",
  "intent": "...",
  "important_data": "..."
}
`,
          },

          {
            role: "user",
            content:
              history,
          },
        ],

        response_format: {
          type:
            "json_object",
        },
      });

  const content =
    response.choices[0]
      .message
      .content;

  if (!content) {
    return;
  }

  const memory =
    JSON.parse(content);

  // =========================
  // SAVE MEMORY
  // =========================

  await prisma.conversation
    .update({

      where: {
        id: conversationId,
      },

      data: {

        ai_summary:
          memory.summary,

        ai_stage:
          memory.stage,
      },
    });

  return memory;
}