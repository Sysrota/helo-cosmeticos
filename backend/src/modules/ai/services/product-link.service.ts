import { prisma } from "../../../config/prisma.js";
import {
  getProductUrl,
} from "./public-url.service.js";

const linkWords = [
  "link",
  "url",
];

const checkoutWords = [
  "checkout",
  "pagamento",
  "pagar",
  "pix",
  "cartao",
  "cartão",
  "finalizar",
  "finaliza",
  "fechar",
  "pedido",
  "carrinho",
];

const ignoredWords = [
  "manda",
  "mandar",
  "envia",
  "enviar",
  "envie",
  "me",
  "o",
  "a",
  "do",
  "da",
  "de",
  "dos",
  "das",
  "produto",
  "produtos",
  "link",
  "url",
  "por",
  "favor",
  "esse",
  "essa",
  "este",
  "esta",
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function isProductLinkRequest(message: string) {
  const normalized =
    normalizeText(message);

  const hasLinkWord =
    linkWords.some((word) =>
      new RegExp(`\\b${word}\\b`).test(normalized)
    );

  if (!hasLinkWord) {
    return false;
  }

  return !checkoutWords.some((word) =>
    new RegExp(`\\b${normalizeText(word)}\\b`).test(normalized)
  );
}

export async function findRequestedProductLink({
  conversationId,
  message,
}: {
  conversationId: number;
  message: string;
}) {
  if (!isProductLinkRequest(message)) {
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
              if (normalizeText(item.title).includes(word)) {
                return total + 10;
              }

              if (normalizeText(item.keywords || "").includes(word)) {
                return total + 6;
              }

              if (normalizeText(item.category || "").includes(word)) {
                return total + 4;
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
    productUrl:
      getProductUrl(product.id),
  };
}
