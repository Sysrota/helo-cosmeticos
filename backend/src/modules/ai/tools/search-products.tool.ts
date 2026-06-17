import { prisma }
  from "../../../config/prisma.js";

import {
  getPrimaryProductImage,
} from "../services/product-image.service.js";

interface Props {
  query: string;
  conversationId?: number;
}

export async function searchProductsTool({
  query,
  conversationId,
}: Props) {

  const search =
    query.toLowerCase();

  const words =
    search
      .split(" ")
      .map(
        (word) =>
          word.trim()
      )
      .filter(
        (word) =>
          word.length > 2
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
        .toLowerCase();

      let score = 0;

      for (const word of words) {

        if (
          product.title
            .toLowerCase()
            .includes(word)
        ) {

          score += 10;
        }

        if (
          product.keywords
            ?.toLowerCase()
            .includes(word)
        ) {

          score += 9;
        }

        if (
          product.category
            .toLowerCase()
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
