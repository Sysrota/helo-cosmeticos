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

function itemDisplayName(
  item: string
) {
  return item
    .replace(/\bPrimeSkin\b/gi, "")
    .replace(/\s+/g, " ")
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

function stepsFromText(
  value: string
) {
  const normalized =
    normalizeText(value);
  const steps: string[] = [];

  if (
    normalized.includes("limpar") ||
    normalized.includes("limpeza")
  ) {
    steps.push("limpeza");
  }

  if (
    normalized.includes("renovar") ||
    normalized.includes("renovacao") ||
    normalized.includes("esfoliante")
  ) {
    steps.push("renovação");
  }

  if (
    normalized.includes("hidratar") ||
    normalized.includes("hidratacao") ||
    normalized.includes("hidratante")
  ) {
    steps.push("hidratação");
  }

  return steps;
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

function buildProductPresentation(
  product: {
    title: string;
    subtitle: string;
    description: string;
    expected_experience: string;
    is_kit: boolean;
    kit_items: string[];
  },
  displayName: string,
  intro: string,
  feelingSummary: string
) {
  if (product.is_kit) {
    const steps =
      stepsFromText(
        [
          product.subtitle,
          product.description,
          product.kit_items.join(" "),
        ].join(" ")
      );
    const stepText =
      steps.length
        ? `: ${joinNaturalList(steps)}`
        : "";
    const countText =
      product.kit_items.length
        ? `${product.kit_items.length} passos`
        : "passos";
    const itemText =
      product.kit_items.length
        ? `${joinNaturalList(product.kit_items)} para uma rotina completa de skincare`
        : `os ${countText} de uma rotina completa de skincare`;

    return `O ${displayName} reúne ${itemText}${stepText}, proporcionando ${feelingSummary}.`;
  }

  return `O ${displayName} oferece ${intro.toLowerCase()}, proporcionando ${feelingSummary}.`;
}

function isSkinCareContext(
  product: {
    title: string;
    category: string;
    subtitle: string;
    description: string;
  }
) {
  const text =
    normalizeText(
      [
        product.title,
        product.category,
        product.subtitle,
        product.description,
      ].join(" ")
    );

  return (
    text.includes("skincare") ||
    text.includes("facial") ||
    text.includes("pele")
  );
}

function buildNeedOptions(
  product: {
    title: string;
    category: string;
    subtitle: string;
    description: string;
  }
) {
  if (
    isSkinCareContext(product)
  ) {
    return [
      "Para eu indicar a melhor rotina para você 😊",
      "O que você mais gostaria de melhorar na sua pele hoje?",
      "• Oleosidade",
      "• Ressecamento",
      "• Pele sem brilho",
      "• Quero começar uma rotina",
      "• Outro motivo",
    ];
  }

  return [
    "Para eu te indicar o cuidado mais adequado 😊",
    "O que você mais gostaria de melhorar hoje?",
    "• Hidratação",
    "• Brilho",
    "• Maciez",
    "• Reparação",
    "• Outro motivo",
  ];
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
          context.kit_items.map(
            itemDisplayName
          )
        )
      : "";
  const displayContext = {
    ...context,
    kit_items:
      context.kit_items.map(
        itemDisplayName
      ),
  };

  const lines = [
    `Olá! 😊 Que bom que você veio conhecer o ${displayName}.`,
    buildProductPresentation(
      displayContext,
      displayName,
      intro,
      feelingSummary
    ),
  ];

  if (
    context.is_kit &&
    kitItemsText &&
    !lines[1].includes(kitItemsText)
  ) {
    lines[1] += ` Ele contém ${kitItemsText}.`;
  }

  lines.push(
    "",
    ...buildNeedOptions(context)
  );

  return lines.join("\n");
}
