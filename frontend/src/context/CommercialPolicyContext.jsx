import { useEffect, useMemo, useState } from "react";
import {
  CommercialPolicyContext,
  defaultCommercialPolicy,
} from "./commercial-policy.context";

const API_URL = import.meta.env.VITE_API_URL || "/api";

function numberOrDefault(value, fallback) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function CommercialPolicyProvider({ children }) {
  const [policy, setPolicy] = useState(defaultCommercialPolicy);

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/store-config`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Configuração indisponível");
        }

        return response.json();
      })
      .then((config) => {
        if (!active) {
          return;
        }

        setPolicy({
          free_shipping_minimum: numberOrDefault(
            config.free_shipping_minimum,
            defaultCommercialPolicy.free_shipping_minimum
          ),
          pix_discount_percent: numberOrDefault(
            config.pix_discount_percent,
            defaultCommercialPolicy.pix_discount_percent
          ),
          card_interest_free_installments: numberOrDefault(
            config.card_interest_free_installments,
            defaultCommercialPolicy.card_interest_free_installments
          ),
          card_max_installments: numberOrDefault(
            config.card_max_installments,
            defaultCommercialPolicy.card_max_installments
          ),
        });
      })
      .catch(() => {
        if (active) {
          setPolicy(defaultCommercialPolicy);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => policy, [policy]);

  return (
    <CommercialPolicyContext.Provider value={value}>
      {children}
    </CommercialPolicyContext.Provider>
  );
}
