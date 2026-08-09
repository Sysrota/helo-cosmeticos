import { searchCouponsTool } from "../tools/search-coupons.tool.js";
import { prisma } from "../../../config/prisma.js";

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
    normalized.includes("código de desconto");

  if (!isCouponQuestion) return null;

  const result = await searchCouponsTool({ query: message });

  if (result.status !== "found" || !result.matches.length) {
    return "Vou conferir no cadastro para não te passar uma informação errada 😊 Qual é o nome da influenciadora ou o código exato do cupom?";
  }

  const coupon = result.matches[0];
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { ai_summary: true },
  });
  const memory = conversation?.ai_summary || "";
  const currentProduct = memory.match(/^PRODUTO ATUAL:\s*(.+)$/m)?.[1]?.trim();
  const hasCurrentProduct = currentProduct && currentProduct !== "Não definido";
  const savedCep = memory.match(/^CEP INFORMADO:\s*(.+)$/m)?.[1]?.trim();
  const hasCep = Boolean(savedCep && savedCep !== "Não informado");

  if (coupon.status !== "active") {
    return `${statusMessage(coupon.status)} Se você quiser, posso verificar outra condição disponível para o produto que escolheu.`;
  }

  const minimum = Number(coupon.min_subtotal || 0) > 0
    ? ` Ele é válido a partir de ${formatBRL(coupon.min_subtotal)} em produtos.`
    : "";
  const pixRule = coupon.allow_pix_discount
    ? " O desconto do PIX também pode ser aplicado, conforme aparecer no pagamento."
    : " Esse cupom não acumula com o desconto do PIX.";

  const nextStep = hasCep
    ? `Vou manter ${hasCurrentProduct ? `o ${currentProduct}` : "o produto escolhido"} e considerar esse cupom na finalização.`
    : `Me passa seu CEP para eu confirmar a entrega e montar o pedido com ${hasCurrentProduct ? `o ${currentProduct}` : "o produto que você escolheu"}.`;

  return `Que legal receber você pela indicação de ${coupon.partner_name} 😊 O cupom ${coupon.code} está ativo e oferece ${discountDescription(coupon)}.${minimum}${pixRule}\n\n${nextStep}`;
}
