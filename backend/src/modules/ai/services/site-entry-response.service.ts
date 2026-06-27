import {
  searchProductsTool,
} from "../tools/search-products.tool.js";
import {
  prisma,
} from "../../../config/prisma.js";

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function cleanField(
  value?: string
) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function productDisplayName(
  title: string
) {
  return cleanField(title)
    .replace(/\s*-\s*Rotina.*$/i, "")
    .replace(/\s*-\s*Helo Cosméticos.*$/i, "")
    .replace(/\s*-\s*Helô Cosméticos.*$/i, "");
}

function fieldValue(
  message: string,
  field: string
) {
  const match =
    message.match(
      new RegExp(
        `(?:^|\\n)${field}=([^\\n]+)`,
        "i"
      )
    );

  return cleanField(
    match?.[1]
  );
}

function naturalProductName(
  message: string
) {
  const match =
    message.match(
      /p[aá]gina do (.+?)(?:\.|\n|$)/i
    );

  const value =
    cleanField(match?.[1]);

  if (
    !value ||
    normalizeText(value).includes("produto da helo")
  ) {
    return "";
  }

  return value;
}

function naturalCategoryName(
  message: string
) {
  const match =
    message.match(
      /categoria (.+?) da hel[oô]/i
    );

  return cleanField(
    match?.[1]
  );
}

function naturalCartItems(
  message: string
) {
  const lines =
    message
      .split(/\r?\n/)
      .map(cleanField)
      .filter(Boolean);

  const items =
    lines
      .filter((line) =>
        line.startsWith("•")
      )
      .map((line) =>
        cleanField(
          line.replace(/^•\s*/, "")
        )
      )
      .filter(Boolean);

  return items.join("; ");
}

function naturalCartValue(
  message: string
) {
  const match =
    message.match(
      /total:\s*([^\n]+)/i
    );

  return cleanField(
    match?.[1]
  );
}

function isSiteEntryMessage(
  message: string
) {
  const normalized =
    normalizeText(message);

  return (
    normalized.includes("vim pelo site") ||
    normalized.includes("vim pela pagina") ||
    normalized.includes("vim pela categoria") ||
    normalized.includes("vim pelo carrinho") ||
    normalized.includes("pagina inicial") ||
    normalized.includes("pagina do") ||
    normalized.includes("meu carrinho") ||
    normalized.includes("contexto do site") ||
    normalized.includes("origem=")
  );
}

function categoryResponse(
  category: string
) {
  const normalized =
    normalizeText(category);

  if (
    normalized.includes("skincare") ||
    normalized.includes("pele") ||
    normalized.includes("facial")
  ) {
    return [
      "Olá! 😊 Vi que você estava olhando nossa linha de cuidados com a pele.",
      "Para eu indicar a melhor rotina para você 😊",
      "O que você mais gostaria de melhorar hoje?",
      "• Oleosidade",
      "• Ressecamento",
      "• Pele sem brilho",
      "• Quero começar uma rotina",
    ].join("\n");
  }

  if (
    normalized.includes("cabelo") ||
    normalized.includes("shampoo") ||
    normalized.includes("condicionador") ||
    normalized.includes("mascara") ||
    normalized.includes("redutor") ||
    normalized.includes("finalizador")
  ) {
    return [
      "Olá! 😊 Vi que você estava olhando nossa linha de cuidados com o cabelo.",
      "Para eu te indicar o cuidado mais adequado 😊",
      "O que você quer melhorar hoje?",
      "• Alinhamento e redução de volume",
      "• Hidratação",
      "• Reconstrução",
      "• Finalização",
    ].join("\n");
  }

  return [
    "Olá! 😊 Vi que você estava olhando nossos produtos.",
    "O que você procura hoje?",
    "• Cuidados com a pele",
    "• Cuidados com o cabelo",
    "• Quero conhecer as duas linhas",
  ].join("\n");
}

function homeResponse() {
  return [
    "Olá! 😊 Que bom receber você aqui na Helô Cosméticos.",
    "O que você procura hoje?",
    "• Cuidados com a pele",
    "• Cuidados com o cabelo",
    "• Quero conhecer as duas linhas",
  ].join("\n");
}

export async function buildSiteEntryResponse({
  message,
  conversationId,
}: {
  message: string;
  conversationId: number;
}) {
  if (!isSiteEntryMessage(message)) {
    return null;
  }

  const origin =
    normalizeText(
      fieldValue(message, "origem")
    );
  const productName =
    fieldValue(message, "produto") ||
    naturalProductName(message);
  const productId =
    Number(
      fieldValue(message, "produto_id")
    );
  const category =
    fieldValue(message, "categoria_nome") ||
    fieldValue(message, "categoria") ||
    naturalCategoryName(message);
  const cartItems =
    fieldValue(message, "carrinho_itens") ||
    naturalCartItems(message);
  const cartValue =
    fieldValue(message, "carrinho_valor") ||
    naturalCartValue(message);
  const genericProductPage =
    normalizeText(message)
      .includes("pagina de um produto");

  if (
    origin === "carrinho" ||
    cartItems && !productName
  ) {
    return [
      `Olá! 😊 Vi que você ${
        origin === "carrinho"
          ? "está com"
          : "adicionou"
      } ${cartItems} no carrinho.`,
      cartValue
        ? `O total está em ${cartValue}.`
        : "",
      "Posso ajudar você a finalizar sua compra por aqui.",
    ].filter(Boolean)
      .join("\n");
  }

  if (
    origin === "produto" ||
    productName ||
    productId ||
    genericProductPage
  ) {
    const productById =
      Number.isFinite(productId) &&
      productId > 0
        ? await prisma.product.findUnique({
            where: {
              id:
                productId,
            },
          })
        : null;
    const products =
      productById
        ? []
        : productName
          ? await searchProductsTool({
            query:
              productName || message,
            conversationId,
          })
          : [];
    const product =
      productById ||
      products[0];

    if (productById) {
      await prisma.conversation.updateMany({
        where: {
          id:
            conversationId,
        },

        data: {
          last_product_id:
            productById.id,
        },
      });
    }

    const displayName =
      (
        product
          ? productDisplayName(product.title)
          : productDisplayName(productName)
      ) || "produto";

    return [
      `Olá! 😊 Vi que você estava olhando o ${displayName}.`,
      cartItems
        ? "Também vi que você já tem item no carrinho."
        : "",
      "Posso tirar qualquer dúvida ou ajudar você a finalizar sua compra.",
    ].filter(Boolean)
      .join("\n");
  }

  if (
    origin === "categoria" ||
    category
  ) {
    return categoryResponse(
      category
    );
  }

  if (
    origin === "home" ||
    origin === "site" ||
    normalizeText(message).includes("pagina inicial")
  ) {
    return homeResponse();
  }

  return null;
}
