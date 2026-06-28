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
    normalized.includes("te ama") ||
    normalized.includes("jesus") ||
    normalized.includes("deus") ||
    normalized.includes("loja") ||
    normalized.includes("empresa") ||
    normalized.includes("atendimento") ||
    normalized.includes("oficial") ||
    normalized.includes("cliente") ||
    normalized.includes("cosmetico") ||
    normalized.includes("cosmeticos") ||
    normalized.includes("studio") ||
    normalized.includes("salao") ||
    normalized.includes("estetica")
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

  if (
    !/^\p{L}[\p{L}'-]*$/u.test(firstName) ||
    normalizeText(firstName).length < 2
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
