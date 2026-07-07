import {
  prisma,
} from "../../../config/prisma.js";

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isSimpleGreeting(
  message: string
) {
  const normalized =
    normalizeText(message)
      .replace(/[!?.,"'“”]+/g, "")
      .trim();

  return [
    "oi",
    "ola",
    "olá",
    "bom dia",
    "boa tarde",
    "boa noite",
    "opa",
    "e ai",
    "e aí",
  ].includes(normalized);
}

function productDisplayName(
  title: string
) {
  return title
    .replace(/\s*-\s*Rotina.*$/i, "")
    .replace(/\s*-\s*Helo Cosméticos.*$/i, "")
    .replace(/\s*-\s*Helô Cosméticos.*$/i, "")
    .trim();
}

function formatBRL(
  value: number
) {
  return Number(value || 0)
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
}

export async function buildConversationResumeResponse({
  message,
  conversationId,
}: {
  message: string;
  conversationId: number;
}) {
  if (!isSimpleGreeting(message)) {
    return null;
  }

  const conversation =
    await prisma.conversation.findUnique({
      where: {
        id:
          conversationId,
      },
      select: {
        last_product_id:
          true,
        cart_json:
          true,
      },
    });

  const cart =
    conversation?.cart_json as any;
  const cartItem =
    cart?.items?.[0];
  const productId =
    conversation?.last_product_id ||
    cartItem?.product_id ||
    cartItem?.id;

  if (!productId) {
    return null;
  }

  const product =
    await prisma.product.findFirst({
      where: {
        id:
          Number(productId),
        is_active:
          true,
      },
      select: {
        title:
          true,
        price:
          true,
        category:
          true,
      },
    });

  if (!product) {
    return null;
  }

  const displayName =
    productDisplayName(
      product.title
    );
  const reference =
    normalizeText(product.category)
      .includes("kit") ||
    normalizeText(displayName)
      .startsWith("kit ")
      ? "o kit"
      : "o produto";

  return `Oi! 😊 Isso, seguimos com ${reference} ${displayName} por ${formatBRL(product.price)}.\n\nMe passa seu CEP para eu montar seu pedido certinho?`;
}
