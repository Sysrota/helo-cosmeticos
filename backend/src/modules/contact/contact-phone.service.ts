import { prisma } from "../../config/prisma.js";

export function normalizeContactPhone(value?: string | null) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // O WhatsApp pode entregar celulares brasileiros antigos sem o nono
  // dígito: 62 9214-3262 e 62 9 9214-3262 representam a mesma linha.
  if (
    digits.length === 10 &&
    /^[1-9]{2}[6-9]/.test(digits)
  ) {
    digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

export function contactPhonesMatch(
  first?: string | null,
  second?: string | null
) {
  const normalizedFirst = normalizeContactPhone(first);
  const normalizedSecond = normalizeContactPhone(second);

  return Boolean(
    normalizedFirst &&
    normalizedSecond &&
    normalizedFirst === normalizedSecond
  );
}

export async function findContactByPhone(phone?: string | null) {
  const normalizedPhone = normalizeContactPhone(phone);
  if (!normalizedPhone) return null;

  const canonicalContact = await prisma.contact.findUnique({
    where: { phone: normalizedPhone },
  });
  if (canonicalContact) return canonicalContact;

  const rawPhone = String(phone || "").trim();
  if (rawPhone && rawPhone !== normalizedPhone) {
    const exactLegacyContact = await prisma.contact.findUnique({
      where: { phone: rawPhone },
    });
    if (exactLegacyContact) return exactLegacyContact;
  }

  // Compatibilidade temporária com contatos antigos formatados. Novos
  // registros passam a usar sempre o formato canônico.
  const legacyContacts = await prisma.contact.findMany({
    orderBy: { updated_at: "desc" },
  });

  return legacyContacts.find((contact) =>
    contactPhonesMatch(contact.phone, normalizedPhone)
  ) || null;
}

export async function findOrCreateContactByPhone({
  phone,
  name,
}: {
  phone: string;
  name?: string;
}) {
  const normalizedPhone = normalizeContactPhone(phone);
  const existingContact = await findContactByPhone(normalizedPhone);

  if (existingContact) return existingContact;

  return prisma.contact.upsert({
    where: { phone: normalizedPhone },
    update: {},
    create: {
      phone: normalizedPhone,
      name,
    },
  });
}
