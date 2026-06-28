import { useContext } from "react";
import { CommercialPolicyContext } from "./commercial-policy.context";

function joinNaturalList(values) {
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return `${values[0]} e ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} e ${values[values.length - 1]}`;
}

export function useCommercialPolicy() {
  const policy = useContext(CommercialPolicyContext);
  const pixDiscount = Number(policy.pix_discount_percent);
  const formattedShippingMinimum = Number(policy.free_shipping_minimum)
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const formattedPixDiscount =
    Number.isInteger(pixDiscount)
      ? String(pixDiscount)
      : pixDiscount.toLocaleString("pt-BR", {
          maximumFractionDigits: 2,
      });
  const paymentMethods =
    Array.isArray(policy.payment_methods)
      ? policy.payment_methods
      : [];
  const hasPaymentMethod = (id) =>
    paymentMethods.some(
      (method) =>
        method.id === id &&
        method.enabled !== false
    );
  const activePaymentMethods =
    paymentMethods.filter((method) =>
      method.enabled !== false
    );
  const paymentMethodsLabel =
    joinNaturalList(
      activePaymentMethods.map((method) =>
        method.label
      )
    );

  return {
    ...policy,
    activePaymentMethods,
    paymentMethodsLabel,
    pixEnabled: hasPaymentMethod("pix"),
    creditCardEnabled: hasPaymentMethod("credit_card"),
    boletoEnabled: hasPaymentMethod("boleto"),
    formattedShippingMinimum,
    formattedPixDiscount,
    pixLabel: "Desconto exclusivo no PIX",
    cardLabel: `${policy.card_interest_free_installments}x sem juros ou até ${policy.card_max_installments}x com juros`,
    freeShippingLabel: `Frete grátis em compras acima de ${formattedShippingMinimum}`,
  };
}
