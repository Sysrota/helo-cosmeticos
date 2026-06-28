import { prisma }
  from "../../../config/prisma.js";
import {
  getCommercialPolicy,
} from "../../store-config/store-config.service.js";
import {
  getProductsUrl,
} from "./public-url.service.js";

const categoryLabels: Record<string, string> = {
  shampoo: "Shampoo",
  condicionador: "Condicionador",
  mascara: "Máscara capilar",
  redutor: "Redutor de volume",
  skincare: "Skincare e cuidados faciais",
  finalizador: "Finalizador",
  kit: "Kits",
};

function joinNaturalList(
  values: string[],
  connector = "e"
) {
  if (values.length <= 1) {
    return values[0] || "";
  }

  if (values.length === 2) {
    return `${values[0]} ${connector} ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")} ${connector} ${
    values[values.length - 1]
  }`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function productLine(product: {
  title: string;
  subtitle?: string | null;
  category: string;
  description?: string | null;
  keywords?: string | null;
}) {
  const text =
    normalizeText(`
${product.title}
${product.subtitle || ""}
${product.category}
${product.description || ""}
${product.keywords || ""}
`);

  if (
    [
      "cabelo",
      "capilar",
      "fios",
      "liso",
      "redutor",
      "shampoo",
      "finalizador",
      "progressiva",
    ].some((word) => text.includes(word))
  ) {
    return "Cabelo e cuidados capilares";
  }

  if (
    [
      "pele",
      "facial",
      "skincare",
      "hidratante",
      "esfoliante",
      "limpeza",
    ].some((word) => text.includes(word))
  ) {
    return "Pele, skincare e cuidados faciais";
  }

  return categoryLabels[product.category] || product.category;
}

function formatCatalogSummary(
  products: Array<{
    title: string;
    subtitle?: string | null;
    category: string;
    description?: string | null;
    keywords?: string | null;
  }>
) {
  if (!products.length) {
    return "Nenhum produto ativo cadastrado no momento.";
  }

  const categories =
    new Map<string, number>();
  const lines =
    new Map<string, string[]>();

  for (const product of products) {
    const category =
      categoryLabels[product.category] ||
      product.category;
    const line =
      productLine(product);

    categories.set(
      category,
      (categories.get(category) || 0) + 1
    );

    lines.set(
      line,
      [
        ...(lines.get(line) || []),
        product.title,
      ]
    );
  }

  const categoryText =
    [...categories.entries()]
      .map(([category, count]) =>
        `- ${category}: ${count} produto(s)`
      )
      .join("\n");

  const lineText =
    [...lines.entries()]
      .map(([line, titles]) =>
        `- ${line}: ${titles.slice(0, 5).join("; ")}`
      )
      .join("\n");

  return `
CATEGORIAS ATIVAS:
${categoryText}

LINHAS/CUIDADOS ATIVOS:
${lineText}
`;
}

export async function getStoreContext() {

  const config =
    await prisma.storeConfig.findFirst();

  if (!config) {
    return null;
  }

  const policy =
    await getCommercialPolicy();
  const shippingMinimum =
    policy.free_shipping_minimum
      .toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
  const pixCondition =
    policy.payment_methods.some(
      (method) =>
        method.id === "pix" &&
        method.enabled
    ) &&
    Number(policy.pix_discount_percent) > 0
      ? "PIX tem desconto exclusivo na hora do pagamento."
      : "PIX disponível na hora do pagamento.";

  const paymentMethods =
    policy.payment_methods
      .filter((method) =>
        method.enabled
      );
  const paymentMethodIds =
    new Set(
      paymentMethods.map((method) =>
        method.id
      )
    );
  const fasterPaymentMethods =
    [
      paymentMethodIds.has("pix")
        ? "PIX"
        : "",
      paymentMethodIds.has("credit_card")
        ? "cartão"
        : "",
    ].filter(Boolean);
  const boletoCondition =
    fasterPaymentMethods.length
      ? `Boleto bancário: disponível na hora do pagamento. A confirmação pode levar mais tempo do que ${joinNaturalList(fasterPaymentMethods, "ou")}. O pedido é separado somente após confirmação do pagamento. Para liberação mais rápida, recomende ${joinNaturalList(fasterPaymentMethods, "ou")}. Não afirme prazo exato de compensação.`
      : "Boleto bancário: disponível na hora do pagamento. A confirmação pode levar mais tempo e o pedido é separado somente após confirmação do pagamento. Não afirme prazo exato de compensação.";
  const paymentMethodsText =
    paymentMethods.length
      ? `Aceitamos ${joinNaturalList(
          paymentMethods.map((method) =>
            method.label
          )
        )}.`
      : "Nenhuma forma de pagamento está marcada como disponível no momento.";
  const commercialConditions = [
    paymentMethodIds.has("pix")
      ? pixCondition
      : "",
    paymentMethodIds.has("credit_card")
      ? `Cartão: até ${policy.card_interest_free_installments}x sem juros ou até ${policy.card_max_installments}x com juros.`
      : "",
    paymentMethodIds.has("boleto")
      ? boletoCondition
      : "",
    policy.show_secure_purchase
      ? "Compra segura: habilitada para comunicação comercial."
      : "",
    `Condição de entrega: pedidos acima de ${shippingMinimum} entram nas opções grátis elegíveis; nesses casos, peça o CEP para montar o pedido e verificar prazo/opções.`,
    `Retirada e Moto Uber: ${policy.moto_uber_enabled ? `Retirar em mãos e Moto Uber são grátis para Goiânia e região metropolitana em qualquer valor de compra.` : "indisponíveis no momento."}`,
    "Se o pedido atingir a condição de entrega grátis, peça o CEP para montar o pedido e verificar prazo/opções; não diga que vai calcular entrega.",
    "Fale em consultar valor de entrega somente quando o valor do pedido ficar abaixo da condição de entrega grátis ou quando o cliente perguntar diretamente sobre entrega.",
  ].filter(Boolean);
  const activeProducts =
    await prisma.product.findMany({
      where: {
        is_active: true,
      },
      select: {
        title: true,
        subtitle: true,
        category: true,
        description: true,
        keywords: true,
      },
      orderBy: [
        {
          sort_order: "asc",
        },
        {
          created_at: "desc",
        },
      ],
      take: 100,
    });
  const productsUrl =
    getProductsUrl();

  return `
CATÁLOGO ATIVO DA LOJA:
${formatCatalogSummary(activeProducts)}

LINK DO CATÁLOGO NO SITE:
${productsUrl}

REGRAS PARA PERGUNTAS SOBRE O QUE A LOJA VENDE:
- Quando o cliente perguntar "o que vocês vendem", "trabalham com o que" ou parecido, responda usando as CATEGORIAS ATIVAS e LINHAS/CUIDADOS ATIVOS acima.
- Não liste categorias genéricas que não aparecem no catálogo ativo.
- Se houver produtos de cabelo e pele, cite os dois.
- Se só houver um produto em uma linha, diga "temos" ou "hoje temos", sem chamar de linha completa.
- Quando o cliente estiver explorando opções, comparando produtos ou quiser ver o catálogo, convide a acessar o LINK DO CATÁLOGO NO SITE.
- Não empurre o link em toda mensagem; use quando for útil para o cliente ver mais opções.

FORMAS DE PAGAMENTO:
${paymentMethodsText}

REGRAS DE PAGAMENTO:
- Use somente as formas marcadas acima como disponíveis.
- Nunca mencione PIX, Cartão de Crédito ou Boleto Bancário se a forma não estiver marcada como disponível.
- Só mencione "Compra segura" quando CONDIÇÕES COMERCIAIS VIGENTES indicar compra segura habilitada.

INFORMAÇÕES DE ENTREGA:
- Valor e prazo finais devem ser informados somente após consulta pelo CEP.
- Se a compra já atingir a condição de entrega grátis, peça o CEP para montar o pedido e verificar prazo/opções. Não diga que vai calcular entrega nesse caso.
- Fale em consultar valor de entrega somente quando o valor do pedido ficar abaixo da condição de entrega grátis ou quando o cliente perguntar diretamente sobre entrega.

CONDIÇÕES COMERCIAIS VIGENTES:
${commercialConditions.map((line) => `- ${line}`).join("\n")}

HORÁRIO DE ATENDIMENTO:
${config.business_hours}

POLÍTICA DE TROCA:
${config.exchange_policy}

REGRAS COMPLEMENTARES DE ATENDIMENTO:
${config.ai_rules}
`;
}
