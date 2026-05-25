import { prisma }
  from "../../../config/prisma.js";

export async function getStoreContext() {

  const config =
    await prisma.storeConfig.findFirst();

  if (!config) {
    return null;
  }

  const paymentMethods =
    Array.isArray(config.payment_methods)
      ? config.payment_methods
        .filter((method: any) => method.enabled)
        .map((method: any) => method.label)
        .join(", ")
      : "Consulte no checkout";

  return `
FORMAS DE PAGAMENTO:
${paymentMethods}

INFORMAÇÕES DE ENTREGA:
${config.shipping_info}

CONDIÇÕES COMERCIAIS VIGENTES:
- PIX: 10% de desconto no checkout.
- Cartão: até 3x sem juros ou até 12x com juros.
- Entrega: frete grátis para Goiânia e região metropolitana.
- Demais localidades: abatimento de até R$ 25,00 no frete calculado pelo CEP.
- O cálculo retornado pelo sistema já apresenta o valor final de frete para informar ao cliente.

HORÁRIO DE ATENDIMENTO:
${config.business_hours}

POLÍTICA DE TROCA:
${config.exchange_policy}

REGRAS COMPLEMENTARES DE ATENDIMENTO:
${config.ai_rules}
`;
}
