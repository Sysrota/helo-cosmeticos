import { prisma }
  from "../../../config/prisma.js";

import {
  getPrimaryProductImage,
} from "./product-image.service.js";
import {
  getProductUrl,
} from "./public-url.service.js";

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
      where: {
        is_active: true,
      },

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
${product.category}
${product.description}
${product.keywords}
${product.dicas_uso}
${product.o_que_vai_sentir}
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
  const matchedProducts =
    scoredProducts
      .filter(
        (item) =>
          item.score > 0
      )
      .sort(
        (a, b) =>
          b.score - a.score
      )
      .map(
        (item) =>
          item.product
      );

  // KITS RELACIONADOS
  const relatedKits =
    products.filter((product) => {

      const isKit =
        product.category
          .toLowerCase()
          .includes("kit");

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

  // SEPARA KITS
  const individualProducts =
    finalProducts.filter(
      (product) =>
        !product.category
          .toLowerCase()
          .includes("kit")
    );

  const kits =
    finalProducts.filter(
      (product) =>
        product.category
          .toLowerCase()
          .includes("kit")
    );

  let context = "";

  // INDIVIDUAIS
  if (
    individualProducts.length
  ) {

    context += `
PRODUTOS INDIVIDUAIS:
`;

    for (const product of individualProducts) {

      context += `
ID do produto: ${product.id}

Produto: ${product.title}

Subtítulo:
${product.subtitle || "Não informado"}

Preço: R$ ${product.price}

Categoria: ${product.category}

Foto cadastrada (uso interno; nunca envie esta URL como texto ao cliente):
${getPrimaryProductImage(product) || "Nao informada"}

Link oficial do produto:
${getProductUrl(product.id)}

Descrição:
${product.description}

Destaques comerciais:
${product.destaques || "Não informado"}

Dicas de uso:
${product.dicas_uso || "Não informado"}

Indicado para / necessidades relacionadas:
${product.keywords || "Não informado"}

O que vai sentir:
${product.o_que_vai_sentir || "Não informado"}

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
ID do produto: ${product.id}

Produto: ${product.title}

Subtítulo:
${product.subtitle || "Não informado"}

Preço: R$ ${product.price}

Categoria: ${product.category}

Foto cadastrada (uso interno; nunca envie esta URL como texto ao cliente):
${getPrimaryProductImage(product) || "Nao informada"}

Link oficial do produto:
${getProductUrl(product.id)}

Descrição:
${product.description}

Destaques comerciais:
${product.destaques || "Não informado"}

Dicas de uso:
${product.dicas_uso || "Não informado"}

Indicado para / necessidades relacionadas:
${product.keywords || "Não informado"}

O que vai sentir:
${product.o_que_vai_sentir || "Não informado"}

-------------------
`;
    }
  }

  return context;
}
