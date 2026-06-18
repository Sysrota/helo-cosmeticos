import { prisma }
  from "../../../config/prisma.js";

import {
  getPrimaryProductImage,
} from "../services/product-image.service.js";
import {
  getProductUrl,
} from "../services/public-url.service.js";

interface Props {
  query: string;
  conversationId?: number;
}

const ignoredWords = [
  "qual",
  "quanto",
  "custa",
  "preco",
  "preço",
  "valor",
  "quero",
  "queria",
  "tem",
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

      take: 100,
    });

  const scoredProducts =
    products.map((product) => {

      const text = `
${product.title}
${product.subtitle}
${product.description}
${product.category}
${product.keywords}
${product.dicas_uso}
${product.o_que_vai_sentir}
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

  const results =
    scoredProducts
    .filter(
      (item) =>
        item.score > 0
    )
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(0, 6)
    .map(
      (item) => ({
        id:
          item.product.id,

        title:
          item.product.title,

        subtitle:
          item.product.subtitle,

        price:
          item.product.price,

        category:
          item.product.category,

        description:
          item.product.description,

        indications:
          item.product.keywords,

        usage_tips:
          item.product.dicas_uso,

        expected_experience:
          item.product.o_que_vai_sentir,

        image:
          getPrimaryProductImage(
            item.product
          ),

        product_url:
          getProductUrl(
            item.product.id
          ),

        score:
          item.score,
      })
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
