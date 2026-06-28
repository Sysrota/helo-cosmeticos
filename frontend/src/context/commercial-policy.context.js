import { createContext } from "react";

export const defaultCommercialPolicy = {
  free_shipping_minimum: 99,
  pix_discount_percent: 10,
  card_interest_free_installments: 3,
  card_max_installments: 12,
  show_secure_purchase: true,
  payment_methods: [
    {
      id: "pix",
      label: "PIX",
      enabled: true,
    },
    {
      id: "credit_card",
      label: "Cartão de Crédito",
      enabled: true,
    },
    {
      id: "boleto",
      label: "Boleto Bancário",
      enabled: false,
    },
  ],
};

export const CommercialPolicyContext = createContext(defaultCommercialPolicy);
