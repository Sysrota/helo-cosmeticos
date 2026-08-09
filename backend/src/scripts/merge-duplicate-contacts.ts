import "dotenv/config";

import { prisma } from "../config/prisma.js";
import { normalizeContactPhone } from "../modules/contact/contact-phone.service.js";

const EXECUTE_FLAG = "--execute";
const CONFIRMATION = "--confirm=UNIFICAR_CLIENTES_DUPLICADOS";

function bestText(values: Array<string | null>) {
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .sort((first, second) => second.length - first.length)[0] || null;
}

async function main() {
  const contacts = await prisma.contact.findMany({
    orderBy: { created_at: "asc" },
    include: {
      _count: {
        select: {
          conversations: true,
          orders: true,
          addresses: true,
        },
      },
    },
  });
  const groups = new Map<string, typeof contacts>();

  for (const contact of contacts) {
    const normalizedPhone = normalizeContactPhone(contact.phone);
    if (!normalizedPhone) continue;
    groups.set(normalizedPhone, [
      ...(groups.get(normalizedPhone) || []),
      contact,
    ]);
  }

  const duplicates = [...groups.entries()]
    .filter(([, groupedContacts]) => groupedContacts.length > 1);

  console.table(
    duplicates.flatMap(([phone, groupedContacts]) =>
      groupedContacts.map((contact, index) => ({
        telefone_normalizado: phone,
        manter: index === 0 ? "sim" : "não",
        id: contact.id,
        nome: contact.name || "-",
        telefone_atual: contact.phone,
        conversas: contact._count.conversations,
        pedidos: contact._count.orders,
        enderecos: contact._count.addresses,
      }))
    )
  );

  console.log(`\nGrupos duplicados: ${duplicates.length}`);
  console.log(
    `Contatos que serão removidos: ${duplicates.reduce(
      (total, [, groupedContacts]) => total + groupedContacts.length - 1,
      0
    )}`
  );

  if (!process.argv.includes(EXECUTE_FLAG)) {
    console.log("Modo de prévia: nada foi alterado.");
    console.log(
      `Para executar: npm run contacts:merge-duplicates -- ${EXECUTE_FLAG} ${CONFIRMATION}`
    );
    return;
  }

  if (!process.argv.includes(CONFIRMATION)) {
    throw new Error(`Confirmação ausente: ${CONFIRMATION}`);
  }

  let removedContacts = 0;

  for (const [phone, groupedContacts] of duplicates) {
    const survivor = groupedContacts[0];
    const duplicateIds = groupedContacts.slice(1).map((contact) => contact.id);
    const allIds = groupedContacts.map((contact) => contact.id);

    await prisma.$transaction(async (transaction) => {
      await transaction.conversation.updateMany({
        where: { contact_id: { in: duplicateIds } },
        data: { contact_id: survivor.id },
      });
      await transaction.order.updateMany({
        where: { contact_id: { in: duplicateIds } },
        data: { contact_id: survivor.id },
      });
      await transaction.contactAddress.updateMany({
        where: { contact_id: { in: duplicateIds } },
        data: { contact_id: survivor.id },
      });
      await transaction.couponRedemption.updateMany({
        where: { contact_id: { in: duplicateIds } },
        data: { contact_id: survivor.id },
      });
      await transaction.productReview.updateMany({
        where: { contact_id: { in: duplicateIds } },
        data: { contact_id: survivor.id },
      });
      await transaction.contact.deleteMany({
        where: { id: { in: duplicateIds } },
      });
      await transaction.contact.update({
        where: { id: survivor.id },
        data: {
          phone,
          name: bestText(groupedContacts.map((contact) => contact.name)),
          email: bestText(groupedContacts.map((contact) => contact.email)),
          cpf: bestText(groupedContacts.map((contact) => contact.cpf)),
          city: bestText(groupedContacts.map((contact) => contact.city)),
          state: bestText(groupedContacts.map((contact) => contact.state)),
          notes: bestText(groupedContacts.map((contact) => contact.notes)),
          blocked_ai: groupedContacts.some((contact) => contact.blocked_ai),
          priority: groupedContacts.some((contact) => contact.priority),
          total_spent: groupedContacts.reduce(
            (total, contact) => total + Number(contact.total_spent || 0),
            0
          ),
        },
      });
    });

    removedContacts += allIds.length - 1;
  }

  console.log(`\nContatos duplicados removidos: ${removedContacts}`);
  console.log("Conversas, pedidos e demais vínculos foram preservados.");
}

main()
  .catch((error) => {
    console.error("Erro ao unificar contatos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
