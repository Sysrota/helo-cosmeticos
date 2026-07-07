import { prisma } from "../../../config/prisma.js";

const priceWords = [
  "preco",
  "preço",
  "valor",
  "custa",
  "quanto",
];

const ignoredWords = [
  "qual",
  "quanto",
  "custa",
  "preco",
  "preço",
  "valor",
  "audio",
  "transcrito",
  "olá",
  "ola",
  "ta",
  "tá",
  "esse",
  "essa",
  "este",
  "esta",
  "desse",
  "dessa",
  "deste",
  "desta",
  "produto",
  "produtos",
  "kit",
  "me",
  "fala",
  "manda",
  "envia",
  "do",
  "da",
  "de",
  "o",
  "a",
  "e",
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function isPriceRequest(message: string) {
  const normalized =
    normalizeText(message);

  return priceWords.some((word) =>
    new RegExp(`\\b${normalizeText(word)}\\b`).test(normalized)
  );
}

function productWords(message: string) {
  return normalizeText(message)
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length > 2 &&
        !ignoredWords.includes(word)
    );
}

export async function findRequestedProductPrice({
  conversationId,
  message,
}: {
  conversationId: number;
  message: string;
}) {
  if (!isPriceRequest(message)) {
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
    productWords(message);

  let product:
    | {
        id: number;
        title: string;
        price: number;
      }
    | null = null;

  if (words.length) {
    const products =
      await prisma.product.findMany({
        where: {
          is_active: true,
        },
        take: 100,
      });

    product =
      products
        .map((item) => {
          const title =
            normalizeText(item.title);
          const text =
            normalizeText(`
${item.title}
${item.subtitle}
${item.category}
${item.description}
${item.keywords}
`);

          const score =
            words.reduce((total, word) => {
              if (title.includes(word)) {
                return total + 12;
              }

              if (normalizeText(item.keywords || "").includes(word)) {
                return total + 5;
              }

              if (normalizeText(item.category || "").includes(word)) {
                return total + 3;
              }

              if (text.includes(word)) {
                return total + 1;
              }

              return total;
            }, 0);

          return {
            product: item,
            score,
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.product || null;
  }

  if (!product && conversation?.last_product_id) {
    product =
      await prisma.product.findFirst({
        where: {
          id: conversation.last_product_id,
          is_active: true,
        },
        select: {
          id: true,
          title: true,
          price: true,
        },
      });
  }

  if (!product) {
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
    price:
      product.price,
    formattedPrice:
      formatBRL(product.price),
  };
}
