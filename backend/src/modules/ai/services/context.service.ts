import { prisma }
  from "../../../config/prisma.js";

import { SYSTEM_PROMPT }
  from "../prompts/system.prompt.js";

import {
  getProductsContext,
} from "./product-context.service.js";

import {
  getStoreContext,
} from "./store-context.service.js";

type Role =
  | "system"
  | "user"
  | "assistant";

interface ChatMessage {
  role: Role;
  content: string;
}

export async function buildContext(
  conversationId: number
): Promise<ChatMessage[]> {

  const dbMessages =
    await prisma.message.findMany({
      where: {
        conversation_id:
          conversationId,
      },

      orderBy: {
        created_at: "desc",
      },

      take: 6,
    });

  const reversedMessages =
    dbMessages.reverse();

  const lastUserMessage =
    [...reversedMessages]
      .reverse()
      .find(
        (msg) =>
          msg.sender_type ===
          "client"
      );

  if (!lastUserMessage) {
    return [];
  }

  const lowerMessage =
    lastUserMessage.content
      .toLowerCase()
      .trim();

  // SAUDAÇÕES
  const greetings = [
    "oi",
    "oie",
    "olá",
    "ola",
    "bom dia",
    "boa tarde",
    "boa noite",
    "eai",
    "eaí",
  ];

  const isGreeting =
    greetings.some(
      (greeting) =>
        lowerMessage.startsWith(
          greeting
        )
    );

  // NOVA INTERAÇÃO
  // NÃO USA CONTEXTO ANTIGO
  const messages =
    isGreeting
      ? [
          lastUserMessage,
        ]
      : reversedMessages;

  // PRODUTOS
  const productsContext =
    await getProductsContext(
      lastUserMessage.content
    );

  // INFORMAÇÕES EMPRESA
  const storeContext =
    await getStoreContext();

  const formattedMessages:
    ChatMessage[] = [
      {
        role: "system",

        content:
          SYSTEM_PROMPT,
      },
    ];

  // CONTEXTO EMPRESA
  if (storeContext) {

    formattedMessages.push({
      role: "system",

      content:
        `
INFORMAÇÕES OFICIAIS DA EMPRESA:

${storeContext}

REGRAS:
- Use apenas essas informações.
- Não invente formas de pagamento.
- Não invente entrega.
- Não invente políticas.
- Não invente horários.
`,
    });
  }

  // CONTEXTO PRODUTOS
  if (productsContext) {

    formattedMessages.push({
      role: "system",

      content:
        `
PRODUTOS ENCONTRADOS:

${productsContext}

REGRAS:
- Use apenas os produtos acima.
- Não invente produtos.
- Não invente preços.
- Não invente promoções.
- Não invente kits.
`,
    });
  }

  // INTENÇÃO ATUAL
  let currentIntent =
    "";

  // PREÇO
  if (
    lowerMessage.includes("preço") ||
    lowerMessage.includes("valor") ||
    lowerMessage.includes("custa") ||
    lowerMessage.includes("quanto")
  ) {

    currentIntent =
      `
O cliente está perguntando PREÇO.

REGRAS:
- Responda diretamente o valor do produto se existir.
- Não faça novas perguntas antes de responder o preço.
`;
  }

  // PAGAMENTO
  if (
    lowerMessage.includes("pix") ||
    lowerMessage.includes("cartão") ||
    lowerMessage.includes("boleto") ||
    lowerMessage.includes("pagamento") ||
    lowerMessage.includes("pagar")
  ) {

    currentIntent =
      `
O cliente está perguntando sobre PAGAMENTO.

REGRAS:
- Responda apenas usando informações oficiais da empresa.
- Não invente formas de pagamento.
`;
  }

  // ENTREGA
  if (
    lowerMessage.includes("entrega") ||
    lowerMessage.includes("envio") ||
    lowerMessage.includes("frete")
  ) {

    currentIntent =
      `
O cliente está perguntando sobre ENTREGA.

REGRAS:
- Use apenas informações oficiais da empresa.
- Não invente prazos.
`;
  }

  // INTERESSE
  if (
    [
      "sim",
      "quero",
      "gostei",
    ].includes(
      lowerMessage
    )
  ) {

    currentIntent =
      `
O cliente demonstrou interesse.

REGRAS:
- Continue falando do produto atual.
- Avance naturalmente para venda.
- Não volte ao início da conversa.
- Não faça perguntas repetidas.
`;
  }

  if (currentIntent) {

    formattedMessages.push({
      role: "system",

      content:
        currentIntent,
    });
  }

  // HISTÓRICO CURTO
  for (const msg of messages) {

    if (!msg.content) {
      continue;
    }

    formattedMessages.push({
      role:
        msg.sender_type ===
        "client"
          ? "user"
          : "assistant",

      content:
        msg.content,
    });
  }

  return formattedMessages;
}