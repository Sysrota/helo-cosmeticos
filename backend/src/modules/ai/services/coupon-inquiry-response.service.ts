import { searchCouponsTool } from "../tools/search-coupons.tool.js";
import { prisma } from "../../../config/prisma.js";
import { previewCouponService } from "../../coupons/coupons.service.js";

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function discountDescription(coupon: any) {
  if (coupon.discount_type === "percent") {
    return `${Number(coupon.discount_value)}% de desconto`;
  }
  if (coupon.discount_type === "fixed") {
    return `${formatBRL(coupon.discount_value)} de desconto`;
  }
  if (coupon.discount_type === "free_shipping") {
    return "frete grátis";
  }
  return "o benefício cadastrado";
}

function statusMessage(status: string) {
  if (status === "expired") return "Esse cupom está expirado no momento.";
  if (status === "inactive") return "Esse cupom está inativo no momento.";
  if (status === "not_started") return "Esse cupom ainda não começou a valer.";
  if (status === "usage_limit_reached") return "Esse cupom atingiu o limite de utilizações.";
  return "Não consegui confirmar esse cupom como ativo.";
}

export async function buildCouponInquiryResponse({
  message,
  conversationId,
}: {
  message: string;
  conversationId: number;
}) {
  const normalized = normalizeText(message);
  const isCouponQuestion =
    /\b(cupom|coupon)\b/.test(normalized) ||
    normalized.includes("codigo de desconto") ||
    normalized.includes("código de desconto") ||
    normalized.includes("fui indicado") ||
    normalized.includes("fui indicada") ||
    normalized.includes("indicacao") ||
    normalized.includes("indicação");

  if (!isCouponQuestion) return null;

  const result = await searchCouponsTool({ query: message });

  if (result.status !== "found" || !result.matches.length) {
    return "Vou conferir no cadastro para não te passar uma informação errada 😊 Qual é o nome da influenciadora ou o código exato do cupom?";
  }

  const coupon = result.matches[0];
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      ai_summary: true,
      cart_json: true,
      last_product_id: true,
    },
  });
  const memory = conversation?.ai_summary || "";
  const currentProduct = memory.match(/^PRODUTO ATUAL:\s*(.+)$/m)?.[1]?.trim();
  const hasCurrentProduct = currentProduct && currentProduct !== "Não definido";
  const savedCep = memory.match(/^CEP INFORMADO:\s*(.+)$/m)?.[1]?.trim();
  const hasCep = Boolean(savedCep && savedCep !== "Não informado");

  if (coupon.status !== "active") {
    return `${statusMessage(coupon.status)} Se você quiser, posso verificar outra condição disponível para o produto que escolheu.`;
  }

  const cart = conversation?.cart_json
    ? JSON.parse(JSON.stringify(conversation.cart_json))
    : { items: [] };
  const previewItems = cart.items?.length
    ? cart.items
    : conversation?.last_product_id
      ? [{ product_id: conversation.last_product_id, quantity: 1 }]
      : [];

  let finalValue = "";

  if (previewItems.length) {
    try {
      const preview = await previewCouponService(coupon.code, previewItems);
      finalValue = formatBRL(preview.totals.totalAfterCoupon);
      cart.coupon_code = coupon.code;
      cart.coupon_discount = preview.totals.couponDiscount;
      cart.total_after_coupon = preview.totals.totalAfterCoupon;

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { cart_json: cart },
      });
    } catch {
      finalValue = "";
    }
  }

  const nextStep = hasCep
    ? `Vou manter ${hasCurrentProduct ? `o ${currentProduct}` : "o produto escolhido"} e considerar esse cupom na finalização.`
    : `Me passa seu CEP para eu confirmar a entrega e montar o pedido com ${hasCurrentProduct ? `o ${currentProduct}` : "o produto que você escolheu"}.`;

  const confirmation = finalValue
    ? `Sim 😊 O cupom da ${coupon.partner_name} está ativo. Com o desconto, ${hasCurrentProduct ? `o ${currentProduct}` : "seu pedido"} fica por ${finalValue}.`
    : `Sim 😊 O cupom da ${coupon.partner_name} está ativo e oferece ${discountDescription(coupon)}.`;

  return `${confirmation}\n\n${nextStep}`;
}
