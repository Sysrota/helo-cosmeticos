import { prisma }
  from "../../../config/prisma.js";

export async function getStoreContext() {

  const config =
    await prisma.storeConfig.findFirst();

  if (!config) {
    return null;
  }

  return `
FORMAS DE PAGAMENTO:
${config.payment_methods}

INFORMAÇÕES DE ENTREGA:
${config.shipping_info}

HORÁRIO DE ATENDIMENTO:
${config.business_hours}

POLÍTICA DE TROCA:
${config.exchange_policy}
`;
}