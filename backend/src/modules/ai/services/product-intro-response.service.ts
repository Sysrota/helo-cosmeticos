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
    .map((item) =>
      item
        .trim()
        .replace(/[.;:,]+$/, "")
    )
    .filter(Boolean)
    .slice(0, 3);
}

function joinNaturalList(
  values: string[]
) {
  if (values.length <= 1) {
    return values[0] || "";
  }

  if (values.length === 2) {
    return `${values[0]} e ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")} e ${
    values[values.length - 1]
  }`;
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
    .replace(/\s+com praticidade.*$/i, "")
    .replace(/\.$/, "");
}

function summarizeSkinFeeling(
  feelings: string[]
) {
  const text =
    normalizeText(
      feelings.join(" ")
    );

  const selected: string[] = [];

  if (text.includes("limpa")) {
    selected.push("limpa");
  }

  if (
    text.includes("frescor") ||
    text.includes("fresca")
  ) {
    selected.push("fresca");
  }

  if (
    text.includes("macia") ||
    text.includes("suave")
  ) {
    selected.push("macia");
  }

  if (!selected.length) {
    return "uma sensação gostosa de cuidado no dia a dia";
  }

  return `sensação de pele ${selected.join(", ").replace(/, ([^,]*)$/, " e $1")}`;
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
  const feelingSummary =
    summarizeSkinFeeling(
      feelings
    );
  const kitItemsText =
    context.kit_items.length
      ? joinNaturalList(
          context.kit_items
        )
      : "";
  const subject =
    context.is_kit
      ? "Esse kit"
      : "Esse produto";

  const lines = [
    `Olá! 😊 Que bom que você veio conhecer o ${displayName}.`,
    `${subject} costuma agradar bastante quem procura ${intro.toLowerCase()}.`,
  ];

  if (
    context.is_kit &&
    kitItemsText
  ) {
    lines.push(
      `Ele reúne ${kitItemsText}, deixando ${feelingSummary}.`
    );
  }

  lines.push(
    "Me conta: o que mais te incomoda na sua pele hoje?"
  );

  return lines.join("\n");
}
