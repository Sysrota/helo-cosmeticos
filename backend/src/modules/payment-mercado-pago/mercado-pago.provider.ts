import "../../config/env.js";

import {
  MercadoPagoConfig,
} from "mercadopago";

export function getMercadoPagoAccessToken() {
  const token =
    process.env
      .MERCADO_PAGO_TOKEN
      ?.trim();

  if (!token) {
    throw new Error(
      "MERCADO_PAGO_TOKEN não configurado no backend/.env."
    );
  }

  return token;
}

export const mercadoPagoClient =
  new MercadoPagoConfig({
    accessToken:
      getMercadoPagoAccessToken(),
  });
