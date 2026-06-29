import { prisma }
  from "../../../config/prisma.js";

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function titleCaseName(
  value: string
) {
  const lower =
    value.toLocaleLowerCase("pt-BR");

  return `${lower.charAt(0).toLocaleUpperCase("pt-BR")}${lower.slice(1)}`;
}

const nonPersonalNameTerms = [
  "aprenda",
  "atendimento",
  "beleza",
  "cliente",
  "cosmetico",
  "cosmeticos",
  "deus",
  "empresa",
  "estetica",
  "helo",
  "helô",
  "jesus",
  "loja",
  "oficial",
  "promo",
  "promocao",
  "promoção",
  "salao",
  "salão",
  "site",
  "studio",
  "suporte",
  "vendas",
];

const nonPersonalPhrasePatterns = [
  "te ama",
  "clique aqui",
  "compre",
  "curso",
  "delivery",
  "grupo",
  "melhor",
  "oracao",
  "oração",
  "siga",
  "venda",
];

export function extractPersonalFirstName(
  rawName?: string | null
) {
  const name =
    String(rawName || "")
      .replace(/[^\p{L}\s'-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const normalized =
    normalizeText(name);

  if (!name || name.length < 2) {
    return "";
  }

  if (
    nonPersonalPhrasePatterns.some((pattern) =>
      normalized.includes(pattern)
    )
  ) {
    return "";
  }

  const parts =
    name.split(/\s+/)
      .filter(Boolean);

  if (
    parts.length > 3 ||
    parts.some((part) =>
      part.length > 24
    )
  ) {
    return "";
  }

  const firstName =
    parts[0];
  const normalizedFirstName =
    normalizeText(firstName);

  if (
    !/^\p{L}[\p{L}'-]*$/u.test(firstName) ||
    normalizedFirstName.length < 2 ||
    nonPersonalNameTerms.includes(normalizedFirstName)
  ) {
    return "";
  }

  return titleCaseName(firstName);
}

export async function getConversationCustomerFirstName(
  conversationId: number
) {
  const conversation =
    await prisma.conversation.findUnique({
      where: {
        id:
          conversationId,
      },
      select: {
        contact: {
          select: {
            name:
              true,
          },
        },
      },
    });

  return extractPersonalFirstName(
    conversation?.contact?.name
  );
}
