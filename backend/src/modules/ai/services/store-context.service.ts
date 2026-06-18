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
    Number(policy.pix_discount_percent) > 0
      ? "PIX tem desconto exclusivo no checkout."
      : "PIX disponível no checkout.";

  const paymentMethods =
    Array.isArray(config.payment_methods)
      ? config.payment_methods
        .filter((method: any) => method.enabled)
        .map((method: any) => method.label)
        .join(", ")
      : "Consulte no checkout";
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
${paymentMethods}

INFORMAÇÕES DE ENTREGA:
Valor e prazo finais devem ser informados somente após o cálculo pelo CEP.

CONDIÇÕES COMERCIAIS VIGENTES:
- ${pixCondition}
- Cartão: até ${policy.card_interest_free_installments}x sem juros ou até ${policy.card_max_installments}x com juros.
- Entrega: frete grátis em compras acima de ${shippingMinimum} nas opções elegíveis; Moto Uber mantém valor fixo quando aparecer.
- Moto Uber: ${policy.moto_uber_enabled ? "disponível para Goiânia e região metropolitana com valor fixo de R$ 10,00 cobrado no checkout." : "indisponível no momento."}
- O cálculo retornado pelo sistema já apresenta o valor final de frete para informar ao cliente.

HORÁRIO DE ATENDIMENTO:
${config.business_hours}

POLÍTICA DE TROCA:
${config.exchange_policy}

REGRAS COMPLEMENTARES DE ATENDIMENTO:
${config.ai_rules}
`;
}
