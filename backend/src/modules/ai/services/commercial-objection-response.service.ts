import {
  prisma,
} from "../../../config/prisma.js";
import {
  getCommercialPolicy,
  getStoreConfig,
} from "../../store-config/store-config.service.js";
import {
  searchProductsTool,
} from "../tools/search-products.tool.js";
import {
  ensureCartItemTool,
} from "../tools/add-cart-item.tool.js";
import {
  buildProductAiContext,
} from "./product-ai-context.service.js";

type ObjectionType =
  | "price"
  | "discount"
  | "original"
  | "value"
  | "effectiveness"
  | "guarantee"
  | "delivery_time";

const ignoredWords = [
  "qual",
  "quanto",
  "custa",
  "preco",
  "preço",
  "valor",
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
  "tem",
  "e",
  "o",
  "a",
  "do",
  "da",
  "de",
  "no",
  "na",
  "me",
  "fala",
  "manda",
  "passa",
  "como",
  "que",
  "desconto",
  "promocao",
  "promo",
  "oferta",
  "pix",
  "original",
  "confiavel",
  "vale",
  "pena",
  "compensa",
  "caro",
  "carinho",
  "funciona",
  "mesmo",
  "resultado",
  "garantia",
  "troca",
  "devolucao",
  "arrependimento",
  "tempo",
  "prazo",
  "demora",
  "entrega",
];

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

function cleanText(
  value?: string | null
) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanListItem(
  value: string
) {
  return cleanText(value)
    .replace(/^[\s•*_-]+/, "")
    .replace(/[.;:,]+$/, "")
    .trim();
}

function lowerFirst(
  value: string
) {
  if (!value) {
    return "";
  }

  if (value === value.toUpperCase()) {
    return value;
  }

  return `${value.charAt(0).toLocaleLowerCase("pt-BR")}${value.slice(1)}`;
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

function productDisplayName(
  title: string
) {
  return cleanText(title)
    .replace(/\s*-\s*Rotina.*$/i, "")
    .replace(/\s*-\s*Helo Cosméticos.*$/i, "")
    .replace(/\s*-\s*Helô Cosméticos.*$/i, "");
}

function detectObjection(
  message: string
): ObjectionType | null {
  const normalized =
    normalizeText(message);

  if (
    /\b(desconto|promocao|promo|pix|oferta)\b/.test(normalized)
  ) {
    return "discount";
  }

  if (
    normalized.includes("quanto tempo") ||
    normalized.includes("prazo") ||
    normalized.includes("demora") ||
    normalized.includes("entrega")
  ) {
    return "delivery_time";
  }

  if (
    /\b(preco|valor|custa|quanto)\b/.test(normalized)
  ) {
    return "price";
  }

  if (
    normalized.includes("original") ||
    normalized.includes("confiavel") ||
    normalized.includes("confiavel")
  ) {
    return "original";
  }

  if (
    normalized.includes("vale a pena") ||
    normalized.includes("compensa") ||
    normalized.includes("caro") ||
    normalized.includes("carinho")
  ) {
    return "value";
  }

  if (
    normalized.includes("funciona") ||
    normalized.includes("resultado") ||
    normalized.includes("bom mesmo") ||
    normalized.includes("da certo") ||
    normalized.includes("dá certo")
  ) {
    return "effectiveness";
  }

  if (
    normalized.includes("garantia") ||
    normalized.includes("troca") ||
    normalized.includes("devolucao") ||
    normalized.includes("devolução") ||
    normalized.includes("arrependimento")
  ) {
    return "guarantee";
  }

  return null;
}

function productWords(
  message: string
) {
  return normalizeText(message)
    .split(/[^a-z0-9]+/i)
    .map((word) =>
      word.trim()
    )
    .filter(
      (word) =>
        word.length > 2 &&
        !ignoredWords.includes(word)
    );
}

function highlightItems(
  highlights: string
) {
  return highlights
    .split(/\r?\n|;/)
    .map(cleanListItem)
    .filter(Boolean)
    .slice(0, 4);
}

function fieldItems(
  value: string
) {
  return String(value || "")
    .split(/\r?\n|;/)
    .map(cleanListItem)
    .filter(Boolean);
}

function benefitPhrase(
  value: string
) {
  const clean =
    cleanText(value)
      .replace(/\.$/, "");
  const normalized =
    normalizeText(clean);

  if (
    normalized.startsWith("a rotina")
  ) {
    return clean.replace(
      /^a rotina/i,
      "oferecer uma rotina"
    );
  }

  if (
    normalized.startsWith("rotina") ||
    normalized.startsWith("uma rotina")
  ) {
    return `oferecer ${lowerFirst(clean)}`;
  }

  return lowerFirst(clean);
}

function highlightsSentence(
  highlights: string
) {
  const items =
    highlightItems(highlights)
      .map(lowerFirst);

  if (!items.length) {
    return "";
  }

  return `Além disso, tem ${joinNaturalList(items)}.`;
}

function pixPriceText(
  price: number,
  pixDiscountPercent: number
) {
  if (
    Number(pixDiscountPercent) <= 0
  ) {
    return "";
  }

  const pixPrice =
    Number(
      (
        price *
        (1 - pixDiscountPercent / 100)
      ).toFixed(2)
    );

  if (
    pixPrice >= price
  ) {
    return "";
  }

  return ` ou ${formatBRL(pixPrice)} no PIX`;
}

function cardText(
  interestFreeInstallments: number,
  highlights = ""
) {
  if (
    interestFreeInstallments <= 1
  ) {
    return "";
  }

  const normalizedHighlights =
    normalizeText(highlights);

  if (
    normalizedHighlights.includes("sem juros") ||
    normalizedHighlights.includes("parcel")
  ) {
    return "";
  }

  return `No cartão, pode parcelar em até ${interestFreeInstallments}x sem juros.`;
}

function commercialPerks({
  highlights,
  policy,
  price,
}: {
  highlights: string;
  policy: Awaited<ReturnType<typeof getCommercialPolicy>>;
  price: number;
}) {
  const lines: string[] = [];
  const normalizedHighlights =
    normalizeText(highlights);
  const highlightText =
    highlightsSentence(highlights);

  if (highlightText) {
    lines.push(highlightText);
  }

  if (
    Number(price) >=
    Number(policy.free_shipping_minimum) &&
    !normalizedHighlights.includes("frete")
  ) {
    lines.push(
      `Esse valor entra na faixa de frete grátis acima de ${formatBRL(policy.free_shipping_minimum)} nas opções elegíveis.`
    );
  }

  if (
    policy.moto_uber_enabled
  ) {
    lines.push(
      "Em Goiânia e região metropolitana, Moto Uber e retirada ficam grátis dentro da área atendida."
    );
  }

  return lines.slice(0, 2);
}

function checkoutClose() {
  return "Se estiver tudo certo para você, já posso enviar o link para finalizar a compra.";
}

function deliveryClose(
  displayName: string
) {
  return `Vou deixar o ${displayName} separado para você 😊\n\nMe passa seu CEP que calculo a entrega certinho.`;
}

function shippingQuoteText(
  cart: any
) {
  const quote =
    cart?.shipping_quote;

  if (
    quote?.status !== "current" ||
    cart?.shipping_needs_recalculation ||
    !Array.isArray(quote.options) ||
    !quote.options.length
  ) {
    return "";
  }

  const options =
    quote.options
      .slice(0, 3)
      .map((option: any) =>
        `${option.name}: ${option.deadline}, ${Number(option.price || 0) === 0 ? "grátis" : formatBRL(option.price)}`
      )
      .join("\n");

  return `Para ${quote.destination}, ficaram estas opções:\n${options}`;
}

function buildPriceResponse({
  displayName,
  price,
  policy,
  highlights,
}: {
  displayName: string;
  price: number;
  policy: Awaited<ReturnType<typeof getCommercialPolicy>>;
  highlights: string;
}) {
  return [
    `Hoje o ${displayName} está por ${formatBRL(price)}${pixPriceText(price, policy.pix_discount_percent)}.`,
    cardText(policy.card_interest_free_installments, highlights),
    ...commercialPerks({
      highlights,
      policy,
      price,
    }),
    checkoutClose(),
  ].filter(Boolean)
    .join("\n\n");
}

function buildDiscountResponse({
  displayName,
  price,
  policy,
  highlights,
}: {
  displayName: string;
  price: number;
  policy: Awaited<ReturnType<typeof getCommercialPolicy>>;
  highlights: string;
}) {
  const pixText =
    pixPriceText(
      price,
      policy.pix_discount_percent
    );
  const priceLine =
    pixText
      ? `Tem sim 😊 No PIX, o ${displayName} fica por ${formatBRL(
          Number(
            (
              price *
              (1 - policy.pix_discount_percent / 100)
            ).toFixed(2)
          )
        )}. No cartão, o valor é ${formatBRL(price)}.`
      : `Hoje não tenho desconto automático no PIX cadastrado para o ${displayName}; o valor atual é ${formatBRL(price)}.`;

  return [
    priceLine,
    cardText(policy.card_interest_free_installments, highlights),
    ...commercialPerks({
      highlights,
      policy,
      price,
    }),
    checkoutClose(),
  ].filter(Boolean)
    .join("\n\n");
}

function buildOriginalResponse(
  displayName: string
) {
  return [
    `Sim 😊 O ${displayName} é vendido pelo canal oficial da Helô Cosméticos, com produto cadastrado no nosso catálogo e checkout seguro.`,
    "Você finaliza pelo link oficial da loja, então a compra fica registrada certinho.",
    checkoutClose(),
  ].join("\n\n");
}

function buildValueResponse({
  displayName,
  context,
  policy,
}: {
  displayName: string;
  context: ReturnType<typeof buildProductAiContext>;
  policy: Awaited<ReturnType<typeof getCommercialPolicy>>;
}) {
  const kitLine =
    context.is_kit &&
    context.kit_items.length
      ? `Ele reúne ${joinNaturalList(context.kit_items)} em uma rotina completa.`
      : cleanText(context.subtitle) ||
        cleanText(context.meta_description) ||
        `Ele reúne benefícios reais cadastrados para o ${displayName}.`;
  const feeling =
    fieldItems(
      context.expected_experience
    )[0];

  return [
    `Vale a pena se você busca uma rotina prática e bem direcionada 😊`,
    kitLine,
    feeling
      ? `A proposta é proporcionar ${lowerFirst(feeling)}.`
      : "",
    ...commercialPerks({
      highlights:
        context.highlights,
      policy,
      price:
        context.price,
    }),
    checkoutClose(),
  ].filter(Boolean)
    .join("\n\n");
}

function buildEffectivenessResponse({
  displayName,
  context,
}: {
  displayName: string;
  context: ReturnType<typeof buildProductAiContext>;
}) {
  const benefit =
    cleanText(context.subtitle) ||
    cleanText(context.meta_description) ||
    cleanText(context.description);
  const feeling =
    fieldItems(
      context.expected_experience
    )
      .slice(0, 2);

  return [
    `Funciona como uma rotina de cuidado quando usado com constância 😊`,
    benefit
      ? `O ${displayName} foi desenvolvido para ${benefitPhrase(benefit)}.`
      : `O ${displayName} foi desenvolvido para apoiar o cuidado diário.`,
    feeling.length
      ? `A ideia é entregar ${joinNaturalList(feeling.map(lowerFirst))}.`
      : "",
    "Resultado de pele varia de pessoa para pessoa, mas a rotina ajuda a manter o cuidado mais completo no dia a dia.",
    checkoutClose(),
  ].filter(Boolean)
    .join("\n\n");
}

function buildGuaranteeResponse({
  displayName,
  exchangePolicy,
}: {
  displayName: string;
  exchangePolicy: string;
}) {
  return [
    `Tem sim 😊 A compra do ${displayName} é feita pelo checkout oficial da Helô Cosméticos.`,
    exchangePolicy
      ? `A política cadastrada aqui é: ${exchangePolicy}.`
      : "Essa informação de troca não está disponível aqui no momento, mas posso verificar para você.",
    checkoutClose(),
  ].join("\n\n");
}

function buildDeliveryTimeResponse({
  displayName,
  cart,
}: {
  displayName: string;
  cart: any;
}) {
  const quoteText =
    shippingQuoteText(cart);

  if (quoteText) {
    return [
      quoteText,
      checkoutClose(),
    ].join("\n\n");
  }

  return [
    "O prazo certinho depende do CEP, porque muda conforme a região e a opção de entrega.",
    deliveryClose(displayName),
  ].join("\n\n");
}

async function findProduct({
  conversationId,
  message,
}: {
  conversationId: number;
  message: string;
}) {
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

  const words =
    productWords(message);

  if (words.length) {
    const products =
      await searchProductsTool({
        query:
          message,
        conversationId,
      });

    if (products[0]) {
      return {
        productId:
          products[0].id,
        cart:
          conversation?.cart_json,
      };
    }
  }

  if (
    conversation?.last_product_id
  ) {
    return {
      productId:
        conversation.last_product_id,
      cart:
        conversation.cart_json,
    };
  }

  return null;
}

export async function buildCommercialObjectionResponse({
  message,
  conversationId,
}: {
  message: string;
  conversationId: number;
}) {
  const objection =
    detectObjection(message);

  if (!objection) {
    return null;
  }

  const productRef =
    await findProduct({
      conversationId,
      message,
    });

  if (!productRef) {
    return null;
  }

  const product =
    await prisma.product.findFirst({
      where: {
        id:
          productRef.productId,
        is_active:
          true,
      },
      include: {
        images: {
          orderBy: {
            sort_order:
              "asc",
          },
        },
      },
    });

  if (!product) {
    return null;
  }

  const context =
    buildProductAiContext(product);
  const displayName =
    productDisplayName(context.title);
  const policy =
    await getCommercialPolicy();
  const storeConfig =
    await getStoreConfig();

  await ensureCartItemTool({
    conversationId,
    productId:
      context.id,
    quantity:
      1,
  });

  if (objection === "price") {
    return buildPriceResponse({
      displayName,
      price:
        context.price,
      policy,
      highlights:
        context.highlights,
    });
  }

  if (objection === "discount") {
    return buildDiscountResponse({
      displayName,
      price:
        context.price,
      policy,
      highlights:
        context.highlights,
    });
  }

  if (objection === "original") {
    return buildOriginalResponse(
      displayName
    );
  }

  if (objection === "value") {
    return buildValueResponse({
      displayName,
      context,
      policy,
    });
  }

  if (objection === "effectiveness") {
    return buildEffectivenessResponse({
      displayName,
      context,
    });
  }

  if (objection === "guarantee") {
    return buildGuaranteeResponse({
      displayName,
      exchangePolicy:
        cleanText(
          storeConfig.exchange_policy
        ),
    });
  }

  return buildDeliveryTimeResponse({
    displayName,
    cart:
      productRef.cart,
  });
}
