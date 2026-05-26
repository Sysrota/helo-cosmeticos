import { useContext } from "react";
import { CommercialPolicyContext } from "./commercial-policy.context";

export function useCommercialPolicy() {
  const policy = useContext(CommercialPolicyContext);
  const formattedShippingMinimum = Number(policy.free_shipping_minimum)
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  return {
    ...policy,
    formattedShippingMinimum,
    pixLabel: `${policy.pix_discount_percent}% OFF no PIX`,
    cardLabel: `${policy.card_interest_free_installments}x sem juros ou até ${policy.card_max_installments}x com juros`,
    freeShippingLabel: `Frete grátis em compras acima de ${formattedShippingMinimum}`,
  };
}
