import { prisma }
  from "../../../config/prisma.js";
import {
  getCommercialPolicy,
} from "../../store-config/store-config.service.js";

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
Valor e prazo finais devem ser informados somente após o cálculo pelo CEP.

CONDIÇÕES COMERCIAIS VIGENTES:
- PIX: ${policy.pix_discount_percent}% de desconto no checkout.
- Cartão: até ${policy.card_interest_free_installments}x sem juros ou até ${policy.card_max_installments}x com juros.
- Entrega: frete grátis em compras acima de ${shippingMinimum}, para qualquer localidade atendida.
- Moto Uber: ${policy.moto_uber_enabled ? "disponível para Goiânia e região metropolitana; o cliente paga o valor da corrida diretamente no envio, fora do checkout." : "indisponível no momento."}
- O cálculo retornado pelo sistema já apresenta o valor final de frete para informar ao cliente.

HORÁRIO DE ATENDIMENTO:
${config.business_hours}

POLÍTICA DE TROCA:
${config.exchange_policy}

REGRAS COMPLEMENTARES DE ATENDIMENTO:
${config.ai_rules}
`;
}
