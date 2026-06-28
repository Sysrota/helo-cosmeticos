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
  | "delivery_time"
  | "hesitation"
  | "comparison"
  | "necessity";

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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function formatBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function cleanText(value?: string | null) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanListItem(value: string) {
  return cleanText(value)
    .replace(/^[\s•*_-]+/, "")
    .replace(/[.;:,]+$/, "")
    .trim();
}

function lowerFirst(value: string) {
  if (!value) return "";
  if (value === value.toUpperCase()) return value;
  return `${value.charAt(0).toLocaleLowerCase("pt-BR")}${value.slice(1)}`;
}

function joinNaturalList(values: string[]) {
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return `${values[0]} e ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} e ${values[values.length - 1]}`;
}

function productDisplayName(title: string) {
  return cleanText(title)
    .replace(/\s*-\s*Rotina.*$/i, "")
    .replace(/\s*-\s*Helo Cosméticos.*$/i, "")
    .replace(/\s*-\s*Helô Cosméticos.*$/i, "");
}

function highlightItems(highlights: string) {
  return highlights
    .split(/\r?\n|;/)
    .map(cleanListItem)
    .filter(Boolean)
    .slice(0, 4);
}

function fieldItems(value: string) {
  return String(value || "")
    .split(/\r?\n|;/)
    .map(cleanListItem)
    .filter(Boolean);
}

function benefitPhrase(value: string) {
  const clean = cleanText(value).replace(/\.$/, "");
  const normalized = normalizeText(clean);

  if (normalized.startsWith("a rotina")) {
    return clean.replace(/^a rotina/i, "oferecer uma rotina");
  }

  if (normalized.startsWith("rotina") || normalized.startsWith("uma rotina")) {
    return `oferecer ${lowerFirst(clean)}`;
  }

  return lowerFirst(clean);
}

function paymentEnabled(
  policy: Awaited<ReturnType<typeof getCommercialPolicy>>,
  methodId: string
) {
  return policy.payment_methods.some(
    (method) =>
      method.id === methodId &&
      method.enabled
  );
}

function highlightsSentence(
  highlights: string,
  showSecurePurchase = true
) {
  const items =
    highlightItems(highlights)
      .filter((item) =>
        showSecurePurchase ||
        !normalizeText(item).includes("compra segura")
      )
      .map(lowerFirst);

  if (!items.length) return "";
  return [
    "Além disso, tem:",
    ...items.map((item) =>
      `• ${item}`
    ),
  ].join("\n");
}

function pixDiscountedPrice(price: number, pixDiscountPercent: number) {
  return Number((price * (1 - pixDiscountPercent / 100)).toFixed(2));
}

function pixLine(price: number, pixDiscountPercent: number) {
  if (Number(pixDiscountPercent) <= 0) return "";
  const discounted = pixDiscountedPrice(price, pixDiscountPercent);
  if (discounted >= price) return "";
  return `No PIX sai por ${formatBRL(discounted)}.`;
}

function cardLine(interestFreeInstallments: number, highlights = "") {
  if (interestFreeInstallments <= 1) return "";
  const normalized = normalizeText(highlights);
  if (normalized.includes("sem juros") || normalized.includes("parcel")) return "";
  return `No cartão pode parcelar em até ${interestFreeInstallments}x sem juros.`;
}

function freeShippingLine(price: number, freeShippingMinimum: number, highlights = "") {
  const normalized = normalizeText(highlights);
  if (normalized.includes("frete")) return "";
  if (Number(price) < Number(freeShippingMinimum)) return "";
  return `Esse valor já entra na faixa de frete grátis acima de ${formatBRL(freeShippingMinimum)} nas opções elegíveis.`;
}

function motoUberLine(motoUberEnabled: boolean) {
  if (!motoUberEnabled) return "";
  return "Em Goiânia e região metropolitana, retirada e Moto Uber são grátis.";
}

function checkoutClose() {
  return "Se fizer sentido para você, já posso enviar o link para finalizar.";
}

function deliveryClose(displayName: string) {
  return `Vou deixar o ${displayName} separado para você 😊\n\nMe passa seu CEP que calculo a entrega certinho.`;
}

function shippingQuoteText(cart: any) {
  const quote = cart?.shipping_quote;

  if (
    quote?.status !== "current" ||
    cart?.shipping_needs_recalculation ||
    !Array.isArray(quote.options) ||
    !quote.options.length
  ) {
    return "";
  }

  const options = quote.options
    .slice(0, 3)
    .map((option: any) =>
      `${option.name}: ${option.deadline}, ${Number(option.price || 0) === 0 ? "grátis" : formatBRL(option.price)}`
    )
    .join("\n");

  return `Para ${quote.destination}, ficaram estas opções:\n${options}`;
}

// ─── DETECÇÃO DE OBJEÇÃO ────────────────────────────────────────────────────

function detectObjection(message: string): ObjectionType | null {
  const normalized = normalizeText(message);

  // Guidance — customer is insecure or starting from zero.
  if (
    /^nao sei[\s.!?]*$/.test(normalized) ||
    normalized.includes("nao sei bem") ||
    normalized.includes("nao tenho certeza") ||
    normalized.includes("nunca fiz skincare") ||
    normalized.includes("nunca usei skincare") ||
    normalized.includes("nunca cuidei da pele") ||
    normalized.includes("estou comecando") ||
    normalized.includes("to comecando") ||
    normalized.includes("sou iniciante") ||
    normalized.includes("nao entendo muito") ||
    normalized.includes("entendo pouco") ||
    normalized.includes("pode me ajudar") ||
    normalized.includes("me ajuda a escolher")
  ) {
    return "necessity";
  }

  // Hesitation — "vou pensar", "depois eu vejo" etc.
  if (
    normalized.includes("vou pensar") ||
    normalized.includes("preciso pensar") ||
    normalized.includes("deixa eu pensar") ||
    normalized.includes("vou pesquisar") ||
    normalized.includes("depois eu vejo") ||
    normalized.includes("depois eu decido") ||
    normalized.includes("depois vejo") ||
    normalized.includes("mais tarde") ||
    normalized.includes("deixa pra depois") ||
    normalized.includes("deixa para depois") ||
    normalized.includes("nao sei ainda") ||
    normalized.includes("não sei ainda") ||
    normalized.includes("deixa eu ver") ||
    normalized.includes("vou ver") && normalized.includes("depois")
  ) {
    return "hesitation";
  }

  // Comparison — "estou comparando", "qual a diferença"
  if (
    normalized.includes("comparando") ||
    normalized.includes("estou vendo outro") ||
    normalized.includes("qual a diferenca") ||
    normalized.includes("qual é a diferença") ||
    normalized.includes("outra marca") ||
    normalized.includes("concorrente") ||
    normalized.includes("diferenca para") ||
    normalized.includes("diferença para") ||
    normalized.includes("em relacao a outro") ||
    /\bversus\b|\bvs\b/.test(normalized)
  ) {
    return "comparison";
  }

  // Necessity — "não sei se preciso"
  if (
    normalized.includes("nao sei se preciso") ||
    normalized.includes("não sei se preciso") ||
    normalized.includes("sera que preciso") ||
    normalized.includes("será que preciso") ||
    normalized.includes("nao sei se e pra mim") ||
    normalized.includes("nao sei se é para mim") ||
    normalized.includes("nao sei se serve")
  ) {
    return "necessity";
  }

  // Discount — "tem desconto?", "consegue melhorar?"
  if (
    /\b(desconto|promocao|promo|pix|oferta)\b/.test(normalized) ||
    normalized.includes("consegue melhorar") ||
    normalized.includes("pode melhorar") ||
    normalized.includes("tem algum desconto") ||
    normalized.includes("aceita pix")
  ) {
    return "discount";
  }

  // Delivery time
  if (
    normalized.includes("quanto tempo") ||
    normalized.includes("prazo") ||
    normalized.includes("demora") ||
    normalized.includes("entrega") && (
      normalized.includes("quanto") ||
      normalized.includes("quando") ||
      normalized.includes("dias")
    )
  ) {
    return "delivery_time";
  }

  // Price — asking for price info
  if (/\b(preco|valor|custa|quanto custa|quanto é|quanto e)\b/.test(normalized)) {
    return "price";
  }

  // Trust / original
  if (
    normalized.includes("original") ||
    normalized.includes("confiavel") ||
    normalized.includes("pode confiar") ||
    normalized.includes("nunca ouvi falar") ||
    normalized.includes("nunca vi essa marca") ||
    normalized.includes("conheco nao") ||
    normalized.includes("nao conheco") ||
    normalized.includes("e confiavel") ||
    normalized.includes("é confiavel")
  ) {
    return "original";
  }

  // Value / too expensive
  if (
    normalized.includes("vale a pena") ||
    normalized.includes("compensa") ||
    /\b(caro|carinha|salgad)\b/.test(normalized) ||
    normalized.includes("muito caro") ||
    normalized.includes("achei caro") ||
    normalized.includes("esta caro") ||
    normalized.includes("e caro") ||
    normalized.includes("é caro") ||
    normalized.includes("alto demais") ||
    normalized.includes("muito alto") ||
    normalized.includes("pricey") ||
    normalized.includes("nao tenho esse valor") ||
    normalized.includes("não tenho esse valor")
  ) {
    return "value";
  }

  // Effectiveness / "funciona mesmo?"
  if (
    normalized.includes("funciona") ||
    normalized.includes("resultado") ||
    normalized.includes("bom mesmo") ||
    normalized.includes("da certo") ||
    normalized.includes("dá certo") ||
    normalized.includes("serve mesmo") ||
    normalized.includes("é bom mesmo")
  ) {
    return "effectiveness";
  }

  // Guarantee / returns
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

// ─── CONSTRUTORES DE RESPOSTA ────────────────────────────────────────────────

function buildValueResponse({
  displayName,
  context,
  policy,
}: {
  displayName: string;
  context: ReturnType<typeof buildProductAiContext>;
  policy: Awaited<ReturnType<typeof getCommercialPolicy>>;
}) {
  const price = context.price;

  // Justificativa de valor
  let justification = "";
  if (context.is_kit && context.kit_items.length) {
    justification = `O ${displayName} reúne ${joinNaturalList(context.kit_items)} — você leva tudo em uma rotina completa, sem precisar comprar cada passo separadamente.`;
  } else {
    const sub = cleanText(context.subtitle) || cleanText(context.meta_description);
    if (sub) {
      justification = `O ${displayName} foi desenvolvido para ${benefitPhrase(sub)}.`;
    }
  }

  // Diferenciais
  const perks: string[] = [];
  const hlText = highlightsSentence(
    context.highlights,
    policy.show_secure_purchase
  );
  if (hlText) perks.push(hlText);

  const pix = paymentEnabled(policy, "pix")
    ? pixLine(price, policy.pix_discount_percent)
    : "";
  const card = paymentEnabled(policy, "credit_card")
    ? cardLine(policy.card_interest_free_installments, context.highlights)
    : "";
  const freeShip = freeShippingLine(price, policy.free_shipping_minimum, context.highlights);
  const motoUber = motoUberLine(policy.moto_uber_enabled);

  if (pix) perks.push(pix);
  if (card) perks.push(card);
  if (freeShip) perks.push(freeShip);
  if (motoUber) perks.push(motoUber);

  return [
    "Entendo você 😊",
    justification,
    perks.length ? perks.join("\n\n") : "",
    checkoutClose(),
  ].filter(Boolean).join("\n\n");
}

function buildDiscountResponse({
  displayName,
  context,
  policy,
}: {
  displayName: string;
  context: ReturnType<typeof buildProductAiContext>;
  policy: Awaited<ReturnType<typeof getCommercialPolicy>>;
}) {
  const price = context.price;
  const pixEnabled = paymentEnabled(policy, "pix");
  const cardEnabled = paymentEnabled(policy, "credit_card");
  const pixDiscount = pixEnabled
    ? Number(policy.pix_discount_percent)
    : 0;

  let priceLine = "";
  if (pixDiscount > 0) {
    const discounted = pixDiscountedPrice(price, pixDiscount);
    priceLine = cardEnabled
      ? `Temos sim 😊 No PIX, o ${displayName} fica por ${formatBRL(discounted)} — no cartão, o valor cheio é ${formatBRL(price)}.`
      : `Temos sim 😊 No PIX, o ${displayName} fica por ${formatBRL(discounted)}.`;
  } else if (cardEnabled) {
    priceLine = `Desconto avulso não temos no momento, mas o ${displayName} pode ser parcelado em até ${policy.card_interest_free_installments}x sem juros no cartão.`;
  } else {
    priceLine = `Desconto avulso não temos no momento. O valor atual do ${displayName} é ${formatBRL(price)}.`;
  }

  const perks: string[] = [];
  const card = cardEnabled
    ? cardLine(policy.card_interest_free_installments, context.highlights)
    : "";
  const hlText = highlightsSentence(
    context.highlights,
    policy.show_secure_purchase
  );
  const freeShip = freeShippingLine(price, policy.free_shipping_minimum, context.highlights);
  const motoUber = motoUberLine(policy.moto_uber_enabled);

  if (pixDiscount > 0 && card) perks.push(card);
  if (hlText) perks.push(hlText);
  if (freeShip) perks.push(freeShip);
  if (motoUber) perks.push(motoUber);

  return [
    priceLine,
    perks.join("\n\n"),
    checkoutClose(),
  ].filter(Boolean).join("\n\n");
}

function buildPriceResponse({
  displayName,
  context,
  policy,
}: {
  displayName: string;
  context: ReturnType<typeof buildProductAiContext>;
  policy: Awaited<ReturnType<typeof getCommercialPolicy>>;
}) {
  const price = context.price;
  const pix = paymentEnabled(policy, "pix")
    ? pixLine(price, policy.pix_discount_percent)
    : "";
  const card = paymentEnabled(policy, "credit_card")
    ? cardLine(policy.card_interest_free_installments, context.highlights)
    : "";

  const perks: string[] = [];
  const hlText = highlightsSentence(
    context.highlights,
    policy.show_secure_purchase
  );
  const freeShip = freeShippingLine(price, policy.free_shipping_minimum, context.highlights);
  const motoUber = motoUberLine(policy.moto_uber_enabled);

  if (hlText) perks.push(hlText);
  if (freeShip) perks.push(freeShip);
  if (motoUber) perks.push(motoUber);

  const priceBase = `Hoje o ${displayName} está por ${formatBRL(price)}${pix ? ` — ou ${formatBRL(pixDiscountedPrice(price, policy.pix_discount_percent))} no PIX` : ""}.`;

  return [
    priceBase,
    card,
    perks.join("\n\n"),
    checkoutClose(),
  ].filter(Boolean).join("\n\n");
}

function buildOriginalResponse(
  displayName: string,
  policy: Awaited<ReturnType<typeof getCommercialPolicy>>
) {
  return [
    policy.show_secure_purchase
      ? `Pode confiar 😊 O ${displayName} é vendido pelo canal oficial da Helô Cosméticos, com produto cadastrado no catálogo e checkout seguro.`
      : `Pode confiar 😊 O ${displayName} é vendido pelo canal oficial da Helô Cosméticos e está cadastrado no nosso catálogo.`,
    "Você finaliza pelo link oficial da loja — a compra fica registrada certinho.",
    checkoutClose(),
  ].join("\n\n");
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
  const feelings = fieldItems(context.expected_experience).slice(0, 2);

  return [
    `Funciona como uma rotina de cuidado quando usado com constância 😊`,
    benefit
      ? `O ${displayName} foi desenvolvido para ${benefitPhrase(benefit)}.`
      : `O ${displayName} foi desenvolvido para apoiar o cuidado diário.`,
    feelings.length
      ? `A ideia é entregar ${joinNaturalList(feelings.map(lowerFirst))}.`
      : "",
    "Resultado de pele varia de pessoa para pessoa, mas a rotina ajuda a manter o cuidado mais completo no dia a dia.",
    checkoutClose(),
  ].filter(Boolean).join("\n\n");
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
  const quoteText = shippingQuoteText(cart);

  if (quoteText) {
    return [quoteText, checkoutClose()].join("\n\n");
  }

  return [
    "O prazo certinho depende do CEP, porque muda conforme a região e a opção de entrega.",
    deliveryClose(displayName),
  ].join("\n\n");
}

function buildHesitationResponse(displayName?: string) {
  const ref = displayName ? ` sobre o ${displayName}` : "";
  return [
    "Sem problemas 😊",
    `Tem alguma dúvida${ref} ou algo que esteja impedindo sua decisão? Posso te ajudar a esclarecer.`,
  ].join("\n\n");
}

function buildComparisonResponse({
  displayName,
  context,
  policy,
}: {
  displayName: string;
  context: ReturnType<typeof buildProductAiContext>;
  policy: Awaited<ReturnType<typeof getCommercialPolicy>>;
}) {
  const sub = cleanText(context.subtitle) || cleanText(context.meta_description);
  const hlText = highlightsSentence(
    context.highlights,
    policy.show_secure_purchase
  );

  const mainLine = sub
    ? `O ${displayName} foi desenvolvido para ${benefitPhrase(sub)}.`
    : `O ${displayName} é um produto da Helô Cosméticos, desenvolvido para o cuidado diário.`;

  return [
    "Ótima pergunta 😊 Só posso falar com segurança pelo que tenho cadastrado aqui sobre o nosso produto.",
    mainLine,
    hlText,
    "Se quiser que eu busque outro produto do nosso catálogo para comparar diretamente, é só me dizer o nome.",
  ].filter(Boolean).join("\n\n");
}

function isSkinCareContext(
  context: ReturnType<typeof buildProductAiContext>
) {
  const text = normalizeText([
    context.title,
    context.category,
    context.subtitle,
    context.meta_description,
    context.description,
    context.expected_experience,
    context.kit_items.join(" "),
  ].join(" "));

  return (
    text.includes("skincare") ||
    text.includes("pele") ||
    text.includes("facial") ||
    text.includes("hidratante") ||
    text.includes("limpeza")
  );
}

function careStepsText(
  context: ReturnType<typeof buildProductAiContext>
) {
  const text = normalizeText([
    context.subtitle,
    context.description,
    context.expected_experience,
    context.kit_items.join(" "),
  ].join(" "));
  const steps: string[] = [];

  if (
    text.includes("limpeza") ||
    text.includes("limpar") ||
    text.includes("gel")
  ) {
    steps.push("limpeza");
  }

  if (
    text.includes("renovacao") ||
    text.includes("renovar") ||
    text.includes("esfoliante")
  ) {
    steps.push("renovação");
  }

  if (
    text.includes("hidratacao") ||
    text.includes("hidratar") ||
    text.includes("hidratante")
  ) {
    steps.push("hidratação");
  }

  return joinNaturalList(steps);
}

function buildNecessityResponse({
  displayName,
  context,
}: {
  displayName: string;
  context: ReturnType<typeof buildProductAiContext>;
}) {
  const isSkinCare =
    isSkinCareContext(context);
  const steps =
    careStepsText(context);
  const subtitle =
    cleanText(context.subtitle) ||
    cleanText(context.meta_description);
  const recommendation =
    isSkinCare && steps
      ? `Se você está começando, o ${displayName} faz sentido porque reúne ${steps} em uma rotina simples.`
      : subtitle
        ? `Para começar, o ${displayName} faz sentido porque foi desenvolvido para ${benefitPhrase(subtitle)}.`
        : `Para começar, o ${displayName} ajuda a organizar um cuidado simples no dia a dia.`;
  const questionLine =
    isSkinCare
      ? "Só me diz uma coisa: sua pele é mais oleosa ou mais seca?"
      : "Só me diz uma coisa: você busca mais hidratação ou controle de frizz/volume?";

  return [
    "Sem problema 😊 Muitas pessoas começam assim.",
    recommendation,
    questionLine,
  ].join("\n\n");
}

function buildGeneralNecessityResponse() {
  return [
    "Sem problema 😊 Muitas pessoas começam assim.",
    "Eu te ajudo a escolher sem complicar.",
    "Só me diz uma coisa: você quer cuidar mais da pele ou do cabelo?",
  ].join("\n\n");
}

// ─── FUNÇÃO PRINCIPAL ────────────────────────────────────────────────────────

function productWords(message: string) {
  return normalizeText(message)
    .split(/[^a-z0-9]+/i)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !ignoredWords.includes(word));
}

async function findProduct({
  conversationId,
  message,
}: {
  conversationId: number;
  message: string;
}) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { last_product_id: true, cart_json: true },
  });

  const words = productWords(message);

  if (words.length) {
    const products = await searchProductsTool({ query: message, conversationId });
    if (products[0]) {
      return { productId: products[0].id, cart: conversation?.cart_json };
    }
  }

  if (conversation?.last_product_id) {
    return { productId: conversation.last_product_id, cart: conversation.cart_json };
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
  const objection = detectObjection(message);

  if (!objection) return null;

  // Hesitation doesn't need a specific product context
  if (objection === "hesitation") {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { last_product_id: true },
    });

    let displayName: string | undefined;

    if (conversation?.last_product_id) {
      const product = await prisma.product.findFirst({
        where: { id: conversation.last_product_id, is_active: true },
        select: { title: true },
      });
      if (product) displayName = productDisplayName(product.title);
    }

    return buildHesitationResponse(displayName);
  }

  const productRef = await findProduct({ conversationId, message });

  if (!productRef) {
    if (objection === "necessity") {
      return buildGeneralNecessityResponse();
    }

    return null;
  }

  const product = await prisma.product.findFirst({
    where: { id: productRef.productId, is_active: true },
    include: {
      images: { orderBy: { sort_order: "asc" } },
    },
  });

  if (!product) return null;

  const context = buildProductAiContext(product);
  const displayName = productDisplayName(context.title);
  const policy = await getCommercialPolicy();
  const storeConfig = await getStoreConfig();

  await ensureCartItemTool({ conversationId, productId: context.id, quantity: 1 });

  if (objection === "value") {
    return buildValueResponse({ displayName, context, policy });
  }

  if (objection === "discount") {
    return buildDiscountResponse({ displayName, context, policy });
  }

  if (objection === "price") {
    return buildPriceResponse({ displayName, context, policy });
  }

  if (objection === "original") {
    return buildOriginalResponse(displayName, policy);
  }

  if (objection === "effectiveness") {
    return buildEffectivenessResponse({ displayName, context });
  }

  if (objection === "guarantee") {
    return buildGuaranteeResponse({
      displayName,
      exchangePolicy: cleanText(storeConfig.exchange_policy),
    });
  }

  if (objection === "delivery_time") {
    return buildDeliveryTimeResponse({ displayName, cart: productRef.cart });
  }

  if (objection === "comparison") {
    return buildComparisonResponse({ displayName, context, policy });
  }

  if (objection === "necessity") {
    return buildNecessityResponse({ displayName, context });
  }

  return null;
}
