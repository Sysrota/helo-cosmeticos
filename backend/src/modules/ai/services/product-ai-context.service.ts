import {
  getPrimaryProductImage,
} from "./product-image.service.js";
import {
  getProductUrl,
} from "./public-url.service.js";
import {
  type CommercialPolicy,
  type CommercialPriceResult,
  computeCommercialPrice,
  formatCommercialPriceForPrompt,
} from "./commercial-price.service.js";

type ProductImageRef = {
  image_url?: string | null;
};

export type ProductForAiContext = {
  id: number;
  title: string;
  subtitle?: string | null;
  meta_description?: string | null;
  description?: string | null;
  keywords?: string | null;
  price: number;
  category: string;
  image_url?: string | null;
  dicas_uso?: string | null;
  o_que_vai_sentir?: string | null;
  destaques?: string | null;
  composicao?: string | null;
  is_active: boolean;
  images?: ProductImageRef[];
};

function cleanText(
  value?: string | null
) {
  return String(value || "").trim();
}

function optionalText(
  value?: string | null
) {
  return cleanText(value) ||
    "Não informado no banco";
}

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

function cleanKitItem(
  value: string
) {
  return value
    .replace(/^[\s•*_-]+/, "")
    .replace(/^[^\wÀ-ÿ]+/, "")
    .replace(/\s+/g, " ")
    .replace(/[.;:,]+$/, "")
    .trim();
}

function isStopLine(
  value: string
) {
  const normalized =
    normalizeText(value);

  return [
    "ideal para",
    "desenvolvido",
    "sua formula",
    "modo de usar",
    "modo de uso",
    "utilize",
    "aplique",
    "preco",
    "valor",
  ].some((prefix) =>
    normalized.startsWith(prefix)
  );
}

function splitInlineItems(
  value: string
) {
  const clean =
    cleanKitItem(value);

  if (!clean) {
    return [];
  }

  if (clean.length > 120) {
    return [clean];
  }

  const parts =
    clean
      .split(/\s*(?:,|;|\se\s)\s*/i)
      .map(cleanKitItem)
      .filter(Boolean);

  return parts.length > 1
    ? parts
    : [clean];
}

function pushUniqueItems(
  target: string[],
  values: string[]
) {
  for (const value of values) {
    const item =
      cleanKitItem(value);

    if (
      item &&
      !target.includes(item)
    ) {
      target.push(item);
    }
  }
}

function extractItemsAfterMarker(
  text: string,
  marker: RegExp
) {
  const match =
    text.match(marker);

  if (!match || match.index === undefined) {
    return [];
  }

  const afterMarker =
    text.slice(
      match.index + match[0].length
    );

  const items: string[] = [];

  for (const rawLine of afterMarker.split(/\r?\n/)) {
    const line =
      cleanKitItem(rawLine);

    if (!line) {
      if (items.length) {
        break;
      }

      continue;
    }

    if (
      items.length &&
      isStopLine(line)
    ) {
      break;
    }

    pushUniqueItems(
      items,
      splitInlineItems(line)
    );
  }

  return items;
}

function extractInlineComposition(
  text: string
) {
  const match =
    text.match(
      /(?:compost[oa]\s+por|(?:kit\s+[\wÀ-ÿ\s-]*?\s+)?com)\s+(.+?)(?:\.\s|,\s+(?:o|a)\s+kit\b|\n|$)/i
    );

  if (!match?.[1]) {
    return [];
  }

  const inlineText =
    match[1]
      .replace(/\s+e\s+/gi, ", ")
      .trim();

  return splitInlineItems(
    inlineText
  );
}

export function isKitProduct(
  product: ProductForAiContext
) {
  const category =
    normalizeText(product.category || "");
  const title =
    normalizeText(product.title || "");
  const description =
    normalizeText(product.description || "");

  return (
    category === "kit" ||
    category.includes("kit") ||
    /\bkit\b/.test(title) ||
    /kit\s+(contem|inclui|acompanha)/.test(description)
  );
}

export function extractKitItems(
  product: ProductForAiContext
) {
  if (!isKitProduct(product)) {
    return [];
  }

  const candidates = [
    product.meta_description,
    product.description,
    product.destaques,
    product.subtitle,
  ].map(cleanText)
    .filter(Boolean);

  for (const text of candidates) {
    const items =
      extractItemsAfterMarker(
        text,
        /(?:itens\s+do\s+kit|composi[cç][aã]o(?:\s+do\s+kit)?|(?:o\s+)?kit\s+cont[eé]m|cont[eé]m|inclui|acompanha)\s*:/i
      );

    if (items.length) {
      return items.slice(0, 10);
    }

    const inlineItems =
      extractInlineComposition(
        text
      );

    if (inlineItems.length > 1) {
      return inlineItems.slice(0, 10);
    }
  }

  return [];
}

export function buildProductAiContext(
  product: ProductForAiContext,
  commercialPolicy?: CommercialPolicy
) {
  const kitItems =
    extractKitItems(product);
  const isKit =
    isKitProduct(product);
  const basePrice =
    Number(product.price || 0);
  const commercialPrice: CommercialPriceResult | null =
    commercialPolicy
      ? computeCommercialPrice(basePrice, commercialPolicy)
      : null;

  return {
    id:
      product.id,
    title:
      product.title,
    category:
      product.category,
    price:
      basePrice,
    price_formatted:
      formatBRL(basePrice),
    commercial_price:
      commercialPrice,
    subtitle:
      cleanText(product.subtitle),
    meta_description:
      cleanText(product.meta_description),
    description:
      cleanText(product.description),
    usage_tips:
      cleanText(product.dicas_uso),
    highlights:
      cleanText(product.destaques),
    expected_experience:
      cleanText(product.o_que_vai_sentir),
    composicao:
      cleanText(product.composicao),
    ai_tags:
      cleanText(product.keywords),
    is_active:
      product.is_active,
    availability:
      product.is_active
        ? "ativo"
        : "inativo",
    is_kit:
      isKit,
    kit_items:
      kitItems,
    kit_items_source:
      kitItems.length
        ? "campo textual cadastrado no produto"
        : null,
    image:
      getPrimaryProductImage(product),
    product_url:
      getProductUrl(product.id),
  };
}

export function formatProductForPrompt(
  product: ProductForAiContext,
  commercialPolicy?: CommercialPolicy
) {
  const context =
    buildProductAiContext(product, commercialPolicy);

  const kitItems =
    context.kit_items.length
      ? context.kit_items
        .map((item) => `- ${item}`)
        .join("\n")
      : "Não informado no banco";

  const priceBlock =
    context.commercial_price
      ? formatCommercialPriceForPrompt(context.commercial_price)
      : `Preço base: ${context.price_formatted}`;

  return `
ID: ${context.id}
Título: ${context.title}
Categoria: ${context.category}
Disponibilidade/ativo: ${context.availability}
${priceBlock}
Subtítulo para venda:
${optionalText(context.subtitle)}
Meta descrição SEO:
${optionalText(context.meta_description)}
Descrição:
${optionalText(context.description)}
Dicas de uso:
${optionalText(context.usage_tips)}
Destaques comerciais:
${optionalText(context.highlights)}
O que o cliente vai sentir:
${optionalText(context.expected_experience)}
Composição / Ativos principais:
${optionalText(context.composicao)}
Tags para IA:
${optionalText(context.ai_tags)}
É kit: ${context.is_kit ? "Sim" : "Não"}
Produtos/itens do kit cadastrados:
${kitItems}
Foto cadastrada (uso interno; nunca envie esta URL como texto ao cliente):
${context.image || "Não informado no banco"}
Link oficial do produto:
${context.product_url}
`;
}
