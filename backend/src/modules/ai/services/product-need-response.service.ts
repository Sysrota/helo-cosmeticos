import {
  prisma,
} from "../../../config/prisma.js";
import {
  buildProductAiContext,
} from "./product-ai-context.service.js";
import {
  ensureCartItemTool,
} from "../tools/add-cart-item.tool.js";
import {
  getCommercialPolicy,
} from "../../store-config/store-config.service.js";

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

function cleanListItem(
  value: string
) {
  return value
    .replace(/^[\s•*_-]+/, "")
    .replace(/\s+/g, " ")
    .replace(/[.;:,]+$/, "")
    .trim();
}

function lowerFirst(
  value: string
) {
  if (!value) {
    return "";
  }

  if (
    value === value.toUpperCase()
  ) {
    return value;
  }

  return `${value.charAt(0).toLocaleLowerCase("pt-BR")}${value.slice(1)}`;
}

function commercialHighlightsText(
  highlights: string,
  showSecurePurchase = true,
  hideShippingHighlights = false
) {
  const items =
    highlights
      .split(/\r?\n|;/)
      .map(cleanListItem)
      .filter((item) =>
        Boolean(item) &&
        (
          showSecurePurchase ||
          !normalizeText(item).includes("compra segura")
        ) &&
        (
          !hideShippingHighlights ||
          !normalizeText(item).includes("frete")
        )
      )
      .slice(0, 6)
      .map(lowerFirst);

  if (!items.length) {
    return "";
  }

  return [
    "Além disso, tem:",
    ...items.map((item) =>
      `• ${item}`
    ),
  ].join("\n");
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

function productOrderReference(
  displayName: string
) {
  const normalized =
    normalizeText(displayName);

  if (
    normalized.startsWith("kit ")
  ) {
    return `o ${displayName}`;
  }

  return displayName;
}

function reachesFreeShipping(
  price: number,
  freeShippingMinimum: number
) {
  return (
    Number(freeShippingMinimum) > 0 &&
    Number(price) >= Number(freeShippingMinimum)
  );
}

function itemDisplayName(
  item: string
) {
  return item
    .replace(/\bPrimeSkin\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findKitItem(
  items: string[],
  patterns: string[]
) {
  return items.find((item) => {
    const normalized =
      normalizeText(item);

    return patterns.some((pattern) =>
      normalized.includes(pattern)
    );
  });
}

function detectSkinNeed(
  message: string
) {
  const normalized =
    normalizeText(message);

  if (
    /\boleos/.test(normalized) ||
    normalized.includes("oleosidade")
  ) {
    return "oleosidade";
  }

  if (
    normalized.includes("ressec") ||
    normalized.includes("seca")
  ) {
    return "ressecamento";
  }

  if (
    normalized.includes("sem brilho") ||
    normalized.includes("brilho") ||
    normalized.includes("vico") ||
    normalized.includes("luminos")
  ) {
    return "pele_sem_brilho";
  }

  if (
    normalized.includes("comecar") ||
    normalized.includes("começar") ||
    normalized.includes("rotina")
  ) {
    return "comecar_rotina";
  }

  if (
    normalized.includes("outro motivo") ||
    normalized === "outro" ||
    normalized === "outro motivo"
  ) {
    return "outro_motivo";
  }

  return null;
}

function buildNeedExplanation({
  need,
  displayName,
  kitItems,
}: {
  need: string;
  displayName: string;
  kitItems: string[];
}) {
  const cleanser =
    findKitItem(
      kitItems,
      [
        "gel",
        "limpeza",
      ]
    );
  const scrub =
    findKitItem(
      kitItems,
      [
        "esfoliante",
        "renov",
      ]
    );
  const moisturizer =
    findKitItem(
      kitItems,
      [
        "hidratante",
        "hidrat",
      ]
    );
  const cleanserLabel =
    cleanser
      ? itemDisplayName(cleanser)
      : "gel de limpeza";
  const scrubLabel =
    scrub
      ? itemDisplayName(scrub)
      : "esfoliante";
  const moisturizerLabel =
    moisturizer
      ? itemDisplayName(moisturizer)
      : "hidratante";

  if (need === "oleosidade") {
    return [
      "Entendi 😊",
      `Para oleosidade, o ${displayName} faz sentido porque começa com ${cleanserLabel}, que ajuda a limpar as impurezas do dia a dia. Depois, ${scrubLabel} auxilia na renovação e ${moisturizerLabel} fecha a rotina com hidratação e sensação de conforto.`,
      "A proposta é deixar a pele com sensação mais limpa e fresca, sem complicar seu cuidado diário.",
    ];
  }

  if (need === "ressecamento") {
    return [
      "Entendi 😊",
      `Para ressecamento, o ${displayName} faz sentido porque combina limpeza, renovação e hidratação em uma rotina só. ${moisturizerLabel} entra para proporcionar hidratação e sensação de pele mais macia ao toque.`,
      "A ideia é deixar a pele com sensação de cuidado, conforto e suavidade no dia a dia.",
    ];
  }

  if (need === "pele_sem_brilho") {
    return [
      "Entendi 😊",
      `Para pele sem brilho, o ${displayName} faz sentido porque ${scrubLabel} auxilia na renovação da pele e ${moisturizerLabel} finaliza com hidratação. Essa combinação favorece uma sensação de pele mais fresca, macia e com aparência cuidada.`,
      "É uma rotina simples para trazer mais viço sem adicionar muitos passos.",
    ];
  }

  if (need === "outro_motivo") {
    return [
      "Perfeito 😊",
      `O ${displayName} reúne ${cleanserLabel}, ${scrubLabel} e ${moisturizerLabel} para fazer uma rotina simples de skincare: limpar, renovar e hidratar.`,
      "A proposta é deixar a pele com sensação limpa, fresca e macia, sem complicar seu cuidado diário.",
    ];
  }

  return [
    "Entendi 😊",
    `Para começar uma rotina, o ${displayName} faz sentido porque organiza os cuidados em três passos fáceis: limpeza, renovação e hidratação.`,
    `Você usa ${cleanserLabel}, depois ${scrubLabel} e finaliza com ${moisturizerLabel}, deixando a pele com sensação limpa, fresca e macia.`,
  ];
}

export async function buildProductNeedResponse({
  message,
  conversationId,
}: {
  message: string;
  conversationId: number;
}) {
  const need =
    detectSkinNeed(message);

  if (
    !need
  ) {
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
      },
    });

  if (!conversation?.last_product_id) {
    return null;
  }

  const product =
    await prisma.product.findFirst({
      where: {
        id:
          conversation.last_product_id,
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
  const commercialPolicy =
    await getCommercialPolicy();
  const displayName =
    productDisplayName(context.title);
  const priceSubject =
    context.is_kit
      ? "O kit"
      : "O produto";
  const lines =
    buildNeedExplanation({
      need,
      displayName,
      kitItems:
        context.kit_items,
    });
  const highlightsText =
    commercialHighlightsText(
      context.highlights,
      commercialPolicy.show_secure_purchase,
      reachesFreeShipping(
        context.price,
        commercialPolicy.free_shipping_minimum
      )
    );

  if (highlightsText) {
    lines.push(
      highlightsText
    );
  }

  await ensureCartItemTool({
    conversationId,
    productId:
      product.id,
    quantity:
      1,
  });

  const cepReason =
    reachesFreeShipping(
      context.price,
      commercialPolicy.free_shipping_minimum
    )
      ? "para eu montar seu pedido certinho"
      : "que já calculo a entrega certinho";

  lines.push(
    `Vou deixar ${productOrderReference(displayName)} separado para você 😊\n\n${priceSubject} está ${formatBRL(context.price)}. Me passa seu CEP ${cepReason}?`
  );

  return lines.join("\n\n");
}
