import { prisma }
  from "../../../config/prisma.js";

import {
  buildProductAiContext,
  formatProductForPrompt,
  isKitProduct,
} from "./product-ai-context.service.js";
import {
  debugAiLog,
} from "./debug-log.service.js";

const ignoredWords = [
  "oi",
  "oie",
  "ola",
  "olá",
  "boa",
  "bom",
  "dia",
  "tarde",
  "noite",
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
  "qual",
  "quanto",
  "custa",
  "preco",
  "preço",
  "valor",
  "algo",
  "para",
  "pra",
  "de",
  "do",
  "da",
  "um",
  "uma",
  "e",
  "com",
  "mais",
  "menos",
  "produto",
  "produtos",
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function getProductsContext(
  message: string
) {

  const search =
    normalizeText(message);

  // REMOVE PALAVRAS INÚTEIS
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
          !ignoredWords.includes(
            word
          )
      );

  if (!words.length) {
    return null;
  }

  const products =
    await prisma.product.findMany({
      include: {
        images: {
          orderBy: {
            sort_order: "asc",
          },
        },
      },

      take: 50,
    });

  // SCORE PRODUTOS
  const scoredProducts =
    products.map((product) => {

      const text = `
${product.title}
${product.subtitle}
${product.meta_description}
${product.category}
${product.description}
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

        // TITLE
        if (
          product.title
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(word)
        ) {
          score += 10;
        }

        // KEYWORDS
        if (
          product.keywords
            ? normalizeText(product.keywords)
            .includes(word)
            : false
        ) {
          score += 8;
        }

        // CATEGORY
        if (
          product.category
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(word)
        ) {
          score += 6;
        }

        // DESCRIPTION
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

  // PRODUTOS RELEVANTES
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

  const matchedProducts =
    (strongTitleMatches.length
      ? strongTitleMatches
      : rankedProducts)
      .map(
        (item) =>
          item.product
      );

  // KITS RELACIONADOS
  const relatedKits =
    products.filter((product) => {

      const isKit =
        isKitProduct(
          product
        );

      if (!isKit) {
        return false;
      }

      const text = `
${product.title}
${product.description}
${product.keywords}
`
        .toLowerCase();

      return matchedProducts.some(
        (matched) => {

          return (
            text.includes(
              matched.title
                .toLowerCase()
            ) ||

            matched.category
              .toLowerCase()
              .includes("skincare") &&

            text.includes(
              "skincare"
            )
          );
        }
      );
    });

  // REMOVE DUPLICADOS
  const finalProducts =
    [
      ...matchedProducts,
      ...relatedKits,
    ]
      .filter(
        (product, index, self) =>
          index ===
          self.findIndex(
            (p) =>
              p.id === product.id
          )
      )
      .slice(0, 6);

  if (!finalProducts.length) {
    return null;
  }

  const primaryProduct =
    finalProducts[0];
  const secondaryProducts =
    finalProducts.slice(1);

  // SEPARA KITS
  const individualProducts =
    secondaryProducts.filter(
      (product) =>
        !isKitProduct(
          product
        )
    );

  const kits =
    secondaryProducts.filter(
      (product) =>
        isKitProduct(
          product
        )
    );

  debugAiLog(
    "Produto detectado",
    {
      mensagem:
        message,
      palavras_consideradas:
        words,
      produtos:
        finalProducts.map((product) => ({
          id:
            product.id,
          titulo:
            product.title,
          categoria:
            product.category,
          ativo:
            product.is_active,
          kit:
            isKitProduct(product),
        })),
    }
  );

  debugAiLog(
    "Produto retornado do banco",
    finalProducts[0]
      ? buildProductAiContext(
          finalProducts[0]
        )
      : null
  );

  let context = "";

  context += `
PRODUTO MAIS RELEVANTE:

${formatProductForPrompt(primaryProduct)}
-------------------
`;

  // INDIVIDUAIS
  if (
    individualProducts.length
  ) {

    context += `
PRODUTOS INDIVIDUAIS:
`;

    for (const product of individualProducts) {

      context += `
${formatProductForPrompt(product)}
-------------------
`;
    }
  }

  // KITS
  if (kits.length) {

    context += `
KITS RELACIONADOS:
`;

    for (const product of kits) {

      context += `
${formatProductForPrompt(product)}
-------------------
`;
    }
  }

  debugAiLog(
    "Campos enviados para o modelo",
    context
  );

  return context;
}
