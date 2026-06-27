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

  const history =
    messages
      .map((msg) =>
        `${msg.sender_type}: ${msg.content}`
      )
      .join("\n");

  const response =
    await openai.chat.completions
      .create({
        model:
          "gpt-4.1-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `
Você é um sistema de memória comercial para um chatbot de vendas.

Analise a conversa e extraia o estado atual em JSON.

Retorne SOMENTE JSON válido, sem explicações.

Campos obrigatórios:
{
  "produto_atual": "nome exato do último produto/kit de interesse do cliente (null se não definido)",
  "itens_escolhidos": ["lista dos produtos que o cliente confirmou querer"],
  "itens_removidos": ["lista dos produtos que o cliente explicitamente descartou ou substituiu"],
  "necessidade": "necessidade de pele ou cabelo informada (null se não informada)",
  "categoria": "pele | cabelo | ambos | null",
  "cep_informado": "CEP se o cliente informou (null se não informou)",
  "etapa": "descoberta | apresentacao | negociacao | endereco | frete | checkout | concluido",
  "intencao_mudou": true ou false (true se na última mensagem o cliente mudou o produto ou pedido de interesse),
  "resumo": "resumo curto em até 2 frases do estado atual da conversa"
}
`,
          },
          {
            role: "user",
            content: history,
          },
        ],
        response_format: {
          type: "json_object",
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

  // Serializa o estado estruturado para o campo ai_summary
  const structuredSummary = [
    `PRODUTO ATUAL: ${memory.produto_atual || "Não definido"}`,
    `ITENS ESCOLHIDOS: ${(memory.itens_escolhidos || []).join(", ") || "Nenhum"}`,
    `ITENS REMOVIDOS/DESCARTADOS: ${(memory.itens_removidos || []).join(", ") || "Nenhum"}`,
    `NECESSIDADE: ${memory.necessidade || "Não informada"}`,
    `CATEGORIA: ${memory.categoria || "Não definida"}`,
    `CEP INFORMADO: ${memory.cep_informado || "Não informado"}`,
    `ETAPA: ${memory.etapa || "descoberta"}`,
    `INTENÇÃO MUDOU NA ÚLTIMA MENSAGEM: ${memory.intencao_mudou ? "SIM" : "não"}`,
    `RESUMO: ${memory.resumo || ""}`,
  ].join("\n");

  await prisma.conversation
    .update({
      where: {
        id: conversationId,
      },
      data: {
        ai_summary:
          structuredSummary,
        ai_stage:
          memory.etapa || null,
      },
    });

  return memory;
}
