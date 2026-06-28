function formatBRL(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export interface CommercialPolicy {
  pix_discount_percent: number;
  card_interest_free_installments: number;
  card_max_installments: number;
  payment_methods?: Array<{
    id: string;
    enabled: boolean;
  }>;
}

export interface CommercialPriceResult {
  basePrice: number;
  pixEnabled: boolean;
  creditCardEnabled: boolean;
  pixPrice: number;
  pixDiscountPercent: number;
  pixSavings: number;
  installmentsWithoutInterest: number;
  maxInstallments: number;
  installmentValue: number;
  basePrice_formatted: string;
  pixPrice_formatted: string;
  pixSavings_formatted: string;
  installmentValue_formatted: string;
}

function paymentEnabled(
  policy: CommercialPolicy,
  methodId: string
) {
  if (!Array.isArray(policy.payment_methods)) {
    return true;
  }

  return policy.payment_methods.some(
    (method) =>
      method.id === methodId &&
      method.enabled !== false
  );
}

export function computeCommercialPrice(
  basePrice: number,
  policy: CommercialPolicy
): CommercialPriceResult {
  const base = Number(basePrice || 0);
  const pixEnabled =
    paymentEnabled(policy, "pix");
  const creditCardEnabled =
    paymentEnabled(policy, "credit_card");
  const pixDiscountPercent =
    pixEnabled
      ? Number(policy.pix_discount_percent || 0)
      : 0;
  const pixPrice = Number(
    (base * (1 - pixDiscountPercent / 100)).toFixed(2)
  );
  const pixSavings = Number((base - pixPrice).toFixed(2));
  const installmentsWithoutInterest = Math.max(1, policy.card_interest_free_installments);
  const maxInstallments = Math.max(installmentsWithoutInterest, policy.card_max_installments);
  const installmentValue = Number((base / installmentsWithoutInterest).toFixed(2));

  return {
    basePrice: base,
    pixEnabled,
    creditCardEnabled,
    pixPrice,
    pixDiscountPercent,
    pixSavings,
    installmentsWithoutInterest,
    maxInstallments,
    installmentValue,
    basePrice_formatted: formatBRL(base),
    pixPrice_formatted: formatBRL(pixPrice),
    pixSavings_formatted: formatBRL(pixSavings),
    installmentValue_formatted: formatBRL(installmentValue),
  };
}

export function formatCommercialPriceForPrompt(
  cp: CommercialPriceResult
): string {
  const lines: string[] = [];

  lines.push(
    cp.creditCardEnabled
      ? `Preço no cartão: ${cp.basePrice_formatted}`
      : `Preço: ${cp.basePrice_formatted}`
  );

  if (cp.pixEnabled && cp.pixDiscountPercent > 0) {
    lines.push(
      `Preço no PIX: ${cp.pixPrice_formatted}` +
      ` (${cp.pixDiscountPercent}% de desconto — economia de ${cp.pixSavings_formatted})`
    );
  } else if (cp.pixEnabled) {
    lines.push(`Preço no PIX: ${cp.basePrice_formatted} (sem desconto adicional)`);
  }

  if (cp.creditCardEnabled && cp.installmentsWithoutInterest > 1) {
    lines.push(
      `Parcelamento sem juros: até ${cp.installmentsWithoutInterest}x` +
      ` de ${cp.installmentValue_formatted}`
    );
  }

  if (cp.creditCardEnabled && cp.maxInstallments > cp.installmentsWithoutInterest) {
    lines.push(
      `Parcelamento máximo: até ${cp.maxInstallments}x` +
      ` (com juros a partir da ${cp.installmentsWithoutInterest + 1}ª parcela)`
    );
  }

  return lines.join("\n");
}
