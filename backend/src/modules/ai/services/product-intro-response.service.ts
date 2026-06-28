import {
  searchProductsTool,
} from "../tools/search-products.tool.js";

import { prisma }
  from "../../../config/prisma.js";

import {
  buildProductAiContext,
} from "./product-ai-context.service.js";

import {
  getCommercialPolicy,
} from "../../store-config/store-config.service.js";
import {
  getConversationCustomerFirstName,
} from "./customer-name.service.js";

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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
    return "de cuidado no dia a dia";
  }

  return `de pele ${selected.join(", ").replace(/, ([^,]*)$/, " e $1")}`;
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
        ? joinNaturalList(steps)
        : "";
    const itemLine =
      product.kit_items.length
        ? `No kit vem: ${joinNaturalList(product.kit_items)}.`
        : "";
    const routineLine =
      stepText
        ? `Ele reúne ${stepText} em uma rotina simples de skincare.`
        : `Ele reúne os passos essenciais de uma rotina de skincare.`;

    return [
      routineLine,
      itemLine,
      `A ideia é deixar a pele com sensação ${feelingSummary}.`,
    ].filter(Boolean).join("\n");
  }

  return `Ele oferece ${intro.toLowerCase()} e deixa sensação ${feelingSummary}.`;
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
      "Para eu indicar a rotina mais adequada, me conta o que você quer melhorar hoje:",
      "• Oleosidade",
      "• Ressecamento",
      "• Pele sem brilho",
      "• Quero começar uma rotina",
      "• Outro motivo",
    ];
  }

  return [
    "Para eu te indicar o cuidado mais adequado, me conta o que você quer melhorar hoje:",
    "• Hidratação",
    "• Brilho",
    "• Maciez",
    "• Reparação",
    "• Outro motivo",
  ];
}

function isGenericInfoRequest(
  message: string
) {
  const normalized =
    normalizeText(message);

  const hasVagueRef =
    normalized.includes("sobre isso") ||
    normalized.includes("sobre esse") ||
    normalized.includes("sobre este") ||
    normalized.includes("sobre essa") ||
    normalized.includes("sobre esta") ||
    normalized.includes("sobre aqui") ||
    normalized.includes("vim pelo anuncio") ||
    normalized.includes("vi o anuncio") ||
    normalized.includes("vi no anuncio");

  const hasInfoIntent =
    normalized.includes("mais informacoes") ||
    normalized.includes("informacoes sobre") ||
    normalized.includes("saber mais") ||
    normalized.includes("gostaria de saber") ||
    normalized.includes("quero saber");

  const mentionsSpecificProduct =
    normalized.includes("kit") ||
    normalized.includes("primeskin") ||
    normalized.includes("forte liso");

  return (
    (hasVagueRef || hasInfoIntent) &&
    !mentionsSpecificProduct
  );
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

async function getProdutosEmDivulgacao() {
  return prisma.product.findMany({
    where: { em_divulgacao: true, is_active: true },
    orderBy: { sort_order: "asc" },
    include: { images: { orderBy: { sort_order: "asc" } } },
  });
}

type ProductContext = ReturnType<typeof buildProductAiContext>;

async function buildIntroFromContext(
  context: ProductContext,
  conversationId: number
) {
  await prisma.conversation.updateMany({
    where: { id: conversationId },
    data: { last_product_id: context.id },
  });

  const displayName =
    productDisplayName(context.title);
  const intro =
    introFromSubtitle(context.subtitle) ||
    "uma opção da Helô Cosméticos para cuidado diário";
  const feelings =
    firstExpectedFeelings(context.expected_experience);
  const feelingSummary =
    summarizeSkinFeeling(feelings);
  const kitItemsText =
    context.kit_items.length
      ? joinNaturalList(context.kit_items.map(itemDisplayName))
      : "";
  const displayContext = {
    ...context,
    kit_items: context.kit_items.map(itemDisplayName),
  };
  const customerFirstName =
    await getConversationCustomerFirstName(
      conversationId
    );

  const greeting =
    customerFirstName
      ? `Oi, ${customerFirstName}! 😊 Vi que você se interessou pelo ${displayName}.`
      : `Oi! 😊 Vi que você se interessou pelo ${displayName}.`;

  const lines = [
    greeting,
    "",
    buildProductPresentation(displayContext, displayName, intro, feelingSummary),
  ];

  if (
    context.is_kit &&
    kitItemsText &&
    !lines[2].includes(kitItemsText)
  ) {
    lines[2] += ` Ele contém ${kitItemsText}.`;
  }

  lines.push(...buildNeedOptions(context));

  return lines.join("\n").trim();
}

export async function buildProductIntroResponse({
  message,
  conversationId,
}: {
  message: string;
  conversationId: number;
}) {
  const isExplicit = isProductIntroRequest(message);
  const isGeneric = !isExplicit && isGenericInfoRequest(message);

  if (!isExplicit && !isGeneric) {
    return null;
  }

  if (isGeneric) {
    const divulgacao = await getProdutosEmDivulgacao();

    if (divulgacao.length === 0) {
      const customerFirstName =
        await getConversationCustomerFirstName(
          conversationId
        );

      return [
        customerFirstName
          ? `Oi, ${customerFirstName}! 😊 Que bom receber você na Helô Cosméticos.`
          : "Oi! 😊 Que bom receber você na Helô Cosméticos.",
        "Você procura cuidados para pele ou cabelo?",
      ].join("\n").trim();
    }

    if (divulgacao.length === 1) {
      const commercialPolicy = await getCommercialPolicy();
      const context = buildProductAiContext(divulgacao[0] as any, commercialPolicy);
      return buildIntroFromContext(context, conversationId);
    }

    // Scenario 2: multiple products in divulgação — ask which one
    const productList = divulgacao
      .map((p) => `• ${productDisplayName(p.title)}`)
      .join("\n");
    const customerFirstName =
      await getConversationCustomerFirstName(
        conversationId
      );

    return [
      customerFirstName
        ? `Oi, ${customerFirstName}! 😊 Vi que você veio pelo anúncio.`
        : "Oi! 😊 Vi que você veio pelo anúncio.",
      "Qual produto apareceu para você?",
      productList,
    ].join("\n").trim();
  }

  // Explicit product request
  const products =
    await searchProductsTool({
      query: message,
      conversationId,
    });

  const product = products[0];

  if (!product) {
    return "Essa informação não está disponível aqui no momento.";
  }

  return buildIntroFromContext(product as unknown as ProductContext, conversationId);
}
