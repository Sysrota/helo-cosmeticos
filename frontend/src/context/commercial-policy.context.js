import { createContext } from "react";

export const defaultCommercialPolicy = {
  free_shipping_minimum: 99,
  pix_discount_percent: 10,
  card_interest_free_installments: 3,
  card_max_installments: 12,
};

export const CommercialPolicyContext = createContext(defaultCommercialPolicy);
