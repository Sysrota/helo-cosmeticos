import {
  searchProductsTool,
} from "../tools/search-products.tool.js";

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function productDisplayName(
  title: string
) {
  return title
    .replace(/\s*-\s*Rotina.*$/i, "")
    .replace(/\s*-\s*Helo Cosméticos.*$/i, "")
    .trim();
}

function firstExpectedFeelings(
  expectedExperience: string
) {
  return expectedExperience
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function introFromSubtitle(
  subtitle: string
) {
  const clean =
    subtitle.trim();

  if (!clean) {
    return "";
  }

  return clean
    .replace(/^a rotina completa/i, "uma rotina completa")
    .replace(/\.$/, "");
}

function isProductIntroRequest(
  message: string
) {
  const normalized =
    normalizeText(message);

  const cameFromAd =
    normalized.includes("anuncio") ||
    normalized.includes("vim pelo") ||
    normalized.includes("veio pelo");

  const wantsMore =
    normalized.includes("saber mais") ||
    normalized.includes("conhecer") ||
    normalized.includes("me fala") ||
    normalized.includes("me conte") ||
    normalized.includes("quero detalhes");

  const mentionsProduct =
    normalized.includes("kit") ||
    normalized.includes("produto") ||
    normalized.includes("primeskin");

  return (
    mentionsProduct &&
    (cameFromAd || wantsMore)
  );
}

export async function buildProductIntroResponse({
  message,
  conversationId,
}: {
  message: string;
  conversationId: number;
}) {
  if (!isProductIntroRequest(message)) {
    return null;
  }

  const products =
    await searchProductsTool({
      query:
        message,
      conversationId,
    });

  const product =
    products[0];

  if (!product) {
    return "Essa informação não está disponível aqui no momento.";
  }

  const context =
    product;
  const displayName =
    productDisplayName(context.title);
  const intro =
    introFromSubtitle(context.subtitle) ||
    "uma opção da Helô Cosméticos para cuidado diário";
  const feelings =
    firstExpectedFeelings(
      context.expected_experience
    );

  const lines = [
    `Olá! 😊 Que bom que você veio conhecer o ${displayName}.`,
    "",
    `Ele é ${intro}.`,
  ];

  if (context.is_kit) {
    if (!context.kit_items.length) {
      lines.push(
        "",
        "Vou verificar a composição exata desse kit para você."
      );
    } else {
      lines.push(
        "",
        "O kit contém:",
        ...context.kit_items.map((item) =>
          `• ${item}`
        )
      );
    }
  }

  if (feelings.length) {
    lines.push(
      "",
      `Ele é ideal para quem busca ${feelings.join(", ").toLowerCase()}.`
    );
  }

  lines.push(
    "",
    "Antes de eu te passar o valor e as opções de entrega, me conta uma coisa: você já tem uma rotina de skincare ou está começando agora?"
  );

  return lines.join("\n");
}
