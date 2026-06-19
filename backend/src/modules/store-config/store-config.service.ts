import { prisma }
  from "../../config/prisma.js";

export const DEFAULT_COMMERCIAL_POLICY = {
  free_shipping_minimum: 99,
  moto_uber_enabled: true,
  pix_discount_percent: 10,
  card_interest_free_installments: 3,
  card_max_installments: 12,
};

function positiveNumber(
  value: unknown,
  fallback: number
) {
  const parsed =
    Number(value);

  return Number.isFinite(parsed) &&
    parsed >= 0
    ? parsed
    : fallback;
}

export async function getStoreConfig() {

  return prisma.storeConfig.upsert({
    where: {
      id: 1,
    },
    update: {},
    create: {
      id: 1,
      ...DEFAULT_COMMERCIAL_POLICY,
    },
  });
}

export async function getCommercialPolicy() {
  const config =
    await getStoreConfig();

  const interestFreeInstallments =
    Math.max(
      1,
      Math.floor(
        positiveNumber(
          config.card_interest_free_installments,
          DEFAULT_COMMERCIAL_POLICY.card_interest_free_installments
        )
      )
    );
  const maxInstallments =
    Math.max(
      interestFreeInstallments,
      Math.floor(
        positiveNumber(
          config.card_max_installments,
          DEFAULT_COMMERCIAL_POLICY.card_max_installments
        )
      )
    );

  return {
    free_shipping_minimum:
      positiveNumber(
        config.free_shipping_minimum,
        DEFAULT_COMMERCIAL_POLICY.free_shipping_minimum
      ),
    moto_uber_enabled:
      config.moto_uber_enabled,
    pix_discount_percent:
      Math.min(
        100,
        positiveNumber(
          config.pix_discount_percent,
          DEFAULT_COMMERCIAL_POLICY.pix_discount_percent
        )
      ),
    card_interest_free_installments:
      interestFreeInstallments,
    card_max_installments:
      maxInstallments,
  };
}

function normalizeManagerPhone(value: unknown): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  // adiciona DDI 55 se o número não tiver (até 11 dígitos = DDD + número sem DDI)
  return digits.startsWith("55") && digits.length > 11
    ? digits
    : `55${digits}`;
}

export async function updateStoreConfig(
  data: any
) {

  return prisma.storeConfig.update({
    where: {
      id: 1,
    },

    data: {
      payment_methods:
        data.payment_methods,
      shipping_methods:
        data.shipping_methods,
      shipping_info:
        String(data.shipping_info || ""),
      free_shipping_minimum:
        positiveNumber(
          data.free_shipping_minimum,
          DEFAULT_COMMERCIAL_POLICY.free_shipping_minimum
        ),
      moto_uber_enabled:
        data.moto_uber_enabled !==
        false,
      pix_discount_percent:
        Math.min(
          100,
          positiveNumber(
            data.pix_discount_percent,
            DEFAULT_COMMERCIAL_POLICY.pix_discount_percent
          )
        ),
      card_interest_free_installments:
        Math.max(
          1,
          Math.floor(
            positiveNumber(
              data.card_interest_free_installments,
              DEFAULT_COMMERCIAL_POLICY.card_interest_free_installments
            )
          )
        ),
      card_max_installments:
        Math.max(
          Math.max(
            1,
            Math.floor(
              positiveNumber(
                data.card_interest_free_installments,
                DEFAULT_COMMERCIAL_POLICY.card_interest_free_installments
              )
            )
          ),
          Math.floor(
            positiveNumber(
              data.card_max_installments,
              DEFAULT_COMMERCIAL_POLICY.card_max_installments
            )
          )
        ),
      business_hours:
        String(data.business_hours || ""),
      exchange_policy:
        String(data.exchange_policy || ""),
      ai_rules:
        String(data.ai_rules || ""),
      manager_phone_1:
        normalizeManagerPhone(data.manager_phone_1),
      manager_phone_2:
        normalizeManagerPhone(data.manager_phone_2),
    },
  });
}
