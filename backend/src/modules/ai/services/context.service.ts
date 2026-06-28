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
import {
  classifyCustomerIntent,
  shouldUseSavedProductContext,
} from "./customer-intent.service.js";
import {
  getConversationCustomerFirstName,
} from "./customer-name.service.js";

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
  const conversation =
    await prisma.conversation.findUnique({
      where: {
        id:
          conversationId,
      },

      select: {
        last_product_id:
          true,
      },
    });

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
  const customerIntent =
    classifyCustomerIntent(
      lastUserMessage.content
    );

  if (customerIntent === "catalog") {
    await prisma.conversation.updateMany({
      where: {
        id:
          conversationId,
      },

      data: {
        last_product_id:
          null,
      },
    });
  }

  if (customerIntent === "product_search") {
    await prisma.conversation.updateMany({
      where: {
        id:
          conversationId,
      },

      data: {
        last_product_id:
          null,
      },
    });
  }

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
      lastUserMessage.content,
      {
        conversationId,
        allowFallbackProduct:
          shouldUseSavedProductContext(
            customerIntent
          ),
        fallbackProductId:
          isGreeting
            ? null
            : conversation?.last_product_id,
      }
    );

  // INFORMAÇÕES EMPRESA
  const storeContext =
    await getStoreContext();
  const customerFirstName =
    await getConversationCustomerFirstName(
      conversationId
    );

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
- Use exclusivamente os campos reais acima para falar de produto.
- Não invente composição, ingredientes, benefícios, preço, promoções, estoque, disponibilidade ou itens de kit.
- Se um campo estiver como "Não informado no banco", diga apenas "Vou verificar essa informação para você." ou "Essa informação não está disponível aqui no momento."
- Para kits, liste somente os itens em "Produtos/itens do kit cadastrados".
- Se "Produtos/itens do kit cadastrados" estiver como "Não informado no banco", não tente deduzir a composição pelo nome, categoria, tags ou descrição.
- Nunca use exemplos genéricos para composição de kit.
- Não use expressões de suposição ou venda fraca como "costuma agradar", "geralmente", "normalmente", "pode ajudar" ou "pode conter".
- Prefira linguagem objetiva com base nos campos reais: "foi desenvolvido para", "reúne", "oferece", "proporciona" e "ajuda a".
- Ao fazer diagnóstico, prefira opções curtas para a cliente escolher.
- Depois que a cliente informar uma necessidade, recomende o produto para aquela necessidade antes de apresentar preço, frete ou pedido.
- Use "Destaques comerciais" do produto antes do preço quando esse campo estiver preenchido.
- Se "Destaques comerciais" estiver vazio ou "Não informado no banco", não invente diferenciais comerciais.
- Quando usar "Destaques comerciais", envie como lista vertical: "Além disso, tem:" e depois um destaque por linha com "•". Nunca coloque vários destaques na mesma frase.
- Não responda necessidades diferentes com o mesmo texto.
`,
    });
  }

  if (customerFirstName) {
    formattedMessages.push({
      role: "system",
      content:
        `CLIENTE: o primeiro nome pessoal detectado no WhatsApp é "${customerFirstName}". Use esse nome no início da conversa ou em momentos pontuais, de forma natural. Não repita o nome em toda resposta.`,
    });
  }

  // INTENÇÃO ATUAL
  let currentIntent =
    "";

  if (customerIntent === "catalog") {
    currentIntent =
      `
O cliente mudou a intenção atual para CATÁLOGO/OUTRAS OPÇÕES.

REGRAS:
- Priorize a última intenção do cliente acima do produto de origem.
- Não continue vendendo apenas o produto anterior.
- Use o CATÁLOGO ATIVO DA LOJA para apresentar categorias e linhas disponíveis.
- Ofereça opções curtas para a cliente escolher a próxima linha.
`;
  }

  if (customerIntent === "product_search") {
    currentIntent =
      `
O cliente mudou a intenção atual para BUSCA DE PRODUTO OU CATEGORIA.

REGRAS:
- Priorize a busca atual, não o produto de origem.
- Responda com base nos produtos encontrados agora.
- Se houver várias opções, apresente as mais relevantes e conduza para escolha.
`;
  }

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
