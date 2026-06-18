import { prisma } from "../../../config/prisma.js";

type ProductImageRef = {
  image_url?: string | null;
};

type ProductWithImages = {
  id: number;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  category?: string | null;
  keywords?: string | null;
  image_url?: string | null;
  images?: ProductImageRef[];
};

const imageRequestWords = [
  "foto",
  "fotos",
  "imagem",
  "imagens",
  "img",
];

const ignoredProductWords = [
  "manda",
  "mandar",
  "mandei",
  "envia",
  "enviar",
  "envie",
  "mostra",
  "mostrar",
  "quero",
  "queria",
  "pode",
  "tem",
  "ver",
  "desse",
  "deste",
  "dessa",
  "desta",
  "esse",
  "este",
  "essa",
  "esta",
  "produto",
  "produtos",
  "foto",
  "fotos",
  "imagem",
  "imagens",
  "img",
  "pra",
  "para",
  "por",
  "favor",
  "do",
  "da",
  "de",
  "um",
  "uma",
  "o",
  "a",
  "e",
];

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}

function getProductWords(
  message: string
) {
  return normalizeText(message)
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length > 2 &&
        !ignoredProductWords.includes(
          word
        )
    );
}

export function getPrimaryProductImage(
  product: ProductWithImages
) {
  return (
    product.images?.find(
      (image) =>
        Boolean(
          image.image_url?.trim()
        )
    )?.image_url ||
    product.image_url ||
    ""
  );
}

export function isProductImageRequest(
  message: string
) {
  const normalized =
    normalizeText(message);

  return imageRequestWords.some(
    (word) =>
      new RegExp(
        `\\b${word}\\b`
      ).test(normalized)
  );
}

export function isAiImageDeliveryResponse(
  response: string
) {
  const normalized =
    normalizeText(response || "");

  const mentionsImage =
    imageRequestWords.some(
      (word) =>
        new RegExp(
          `\\b${word}\\b`
        ).test(normalized)
    );

  if (!mentionsImage) {
    return false;
  }

  const deniesImage =
    normalized.includes("nao tenho") ||
    normalized.includes("nao possuo") ||
    normalized.includes("sem foto") ||
    normalized.includes("sem imagem") ||
    normalized.includes("nao consigo enviar") ||
    normalized.includes("nao tenho acesso");

  if (deniesImage) {
    return false;
  }

  return (
    normalized.includes("aqui esta") ||
    normalized.includes("segue") ||
    normalized.includes("vou enviar") ||
    normalized.includes("te envio") ||
    normalized.includes("envio a") ||
    normalized.includes("enviar a") ||
    normalized.includes("conferir")
  );
}

export function buildProductImageCaption(
  response: string,
  productTitle: string
) {
  const fallback =
    `Claro, segue a foto do ${productTitle}.`;

  const normalized =
    normalizeText(response || "");

  const deniesImage =
    normalized.includes("nao tenho") ||
    normalized.includes("nao possuo") ||
    normalized.includes("sem foto") ||
    normalized.includes("sem imagem") ||
    normalized.includes("nao consigo enviar") ||
    normalized.includes("nao tenho acesso");

  if (
    !response?.trim() ||
    deniesImage
  ) {
    return fallback;
  }

  return response;
}

export async function findRequestedProductImage({
  conversationId,
  message,
}: {
  conversationId: number;
  message: string;
}) {
  if (
    !isProductImageRequest(message)
  ) {
    return null;
  }

  const conversation =
    await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },

      select: {
        last_product_id: true,
      },
    });

  const words =
    getProductWords(message);

  let product:
    | ProductWithImages
    | null = null;

  if (words.length) {
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

    product =
      products
        .map((item) => {
          const text =
            normalizeText(`
${item.title}
${item.subtitle}
${item.category}
${item.description}
${item.keywords}
`);

          const score =
            words.reduce(
              (total, word) => {
                if (
                  normalizeText(
                    item.title
                  ).includes(word)
                ) {
                  return total + 10;
                }

                if (
                  normalizeText(
                    item.keywords || ""
                  ).includes(word)
                ) {
                  return total + 6;
                }

                if (
                  normalizeText(
                    item.category || ""
                  ).includes(word)
                ) {
                  return total + 4;
                }

                if (
                  text.includes(word)
                ) {
                  return total + 1;
                }

                return total;
              },
              0
            );

          return {
            product: item,
            score,
          };
        })
        .filter(
          (item) =>
            item.score > 0 &&
            Boolean(
              getPrimaryProductImage(
                item.product
              )
            )
        )
        .sort(
          (a, b) =>
            b.score - a.score
        )[0]?.product || null;
  }

  if (
    !product &&
    conversation?.last_product_id
  ) {
    product =
      await prisma.product.findFirst({
        where: {
          id: conversation.last_product_id,
          is_active: true,
        },

        include: {
          images: {
            orderBy: {
              sort_order: "asc",
            },
          },
        },
      });
  }

  const imageUrl =
    product
      ? getPrimaryProductImage(product)
      : "";

  if (
    !product ||
    !imageUrl
  ) {
    return null;
  }

  await prisma.conversation.update({
    where: {
      id: conversationId,
    },

    data: {
      last_product_id:
        product.id,
    },
  });

  return {
    productId:
      product.id,

    productTitle:
      product.title,

    imageUrl,
  };
}

export async function findLastProductImage(
  conversationId: number
) {
  const conversation =
    await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },

      select: {
        last_product_id: true,
      },
    });

  if (!conversation?.last_product_id) {
    return null;
  }

  const product =
    await prisma.product.findFirst({
      where: {
        id: conversation.last_product_id,
        is_active: true,
      },

      include: {
        images: {
          orderBy: {
            sort_order: "asc",
          },
        },
      },
    });

  const imageUrl =
    product
      ? getPrimaryProductImage(product)
      : "";

  if (
    !product ||
    !imageUrl
  ) {
    return null;
  }

  return {
    productId:
      product.id,

    productTitle:
      product.title,

    imageUrl,
  };
}
