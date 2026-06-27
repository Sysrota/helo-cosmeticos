import { prisma }
  from "../../../config/prisma.js";

import {
  buildProductAiContext,
} from "../services/product-ai-context.service.js";
import {
  debugAiLog,
} from "../services/debug-log.service.js";

interface Props {
  query: string;
  conversationId?: number;
}

const ignoredWords = [
  "oi",
  "oie",
  "ola",
  "olá",
  "bom",
  "boa",
  "dia",
  "tarde",
  "noite",
  "qual",
  "quanto",
  "custa",
  "preco",
  "preço",
  "valor",
  "quero",
  "queria",
  "tem",
  "vim",
  "veio",
  "vindo",
  "pelo",
  "pela",
  "anuncio",
  "anúncio",
  "saber",
  "sobre",
  "esse",
  "essa",
  "este",
  "esta",
  "desse",
  "dessa",
  "deste",
  "desta",
  "mais",
  "produto",
  "produtos",
  "do",
  "da",
  "de",
  "o",
  "a",
  "e",
  "para",
  "pra",
  "um",
  "uma",
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function searchProductsTool({
  query,
  conversationId,
}: Props) {

  const search =
    normalizeText(query);

  const words =
    search
      .split(/[^a-z0-9]+/i)
      .map(
        (word) =>
          word.trim()
      )
      .filter(
        (word) =>
          word.length > 2 &&
          !ignoredWords.includes(word)
      );

  const products =
    await prisma.product.findMany({
      include: {
        images: {
          orderBy: {
            sort_order: "asc",
          },
        },
      },

      take: 100,
    });

  const scoredProducts =
    products.map((product) => {

      const text = `
${product.title}
${product.subtitle}
${product.meta_description}
${product.description}
${product.category}
${product.keywords}
${product.dicas_uso}
${product.o_que_vai_sentir}
${product.destaques}
`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      let score = 0;

      for (const word of words) {

        if (
          normalizeText(product.title)
            .includes(word)
        ) {

          score += 10;
        }

        if (
          product.keywords
            ? normalizeText(product.keywords)
            .includes(word)
            : false
        ) {

          score += 9;
        }

        if (
          normalizeText(product.category)
            .includes(word)
        ) {

          score += 7;
        }

        if (
          text.includes(word)
        ) {

          score += 2;
        }
      }

      return {
        product,
        score,
      };
    });

  const rankedProducts =
    scoredProducts
      .filter(
        (item) =>
          item.score > 0
      )
      .sort(
        (a, b) =>
          b.score - a.score
      );

  const strongTitleMatches =
    words.length > 1
      ? rankedProducts.filter((item) =>
          words.every((word) =>
            normalizeText(
              item.product.title
            ).includes(word)
          )
        )
      : [];

  const results =
    (strongTitleMatches.length
      ? strongTitleMatches
      : rankedProducts)
    .slice(0, 6)
    .map(
      (item) => ({
        ...buildProductAiContext(
          item.product
        ),

        score:
          item.score,
      })
    );

  debugAiLog(
    "Produto detectado",
    {
      query,
      palavras_consideradas:
        words,
      melhor_resultado:
        results[0]
          ? {
              id:
                results[0].id,
              titulo:
                results[0].title,
              score:
                results[0].score,
            }
          : null,
    }
  );

  debugAiLog(
    "Produto retornado do banco",
    results[0] || null
  );

  debugAiLog(
    "Campos enviados para o modelo",
    results
  );

  if (
    conversationId &&
    results.length
  ) {
    await prisma.conversation.update({
      where: {
        id: conversationId,
      },

      data: {
        last_product_id:
          results[0].id,
      },
    });
  }

  return results;
}
