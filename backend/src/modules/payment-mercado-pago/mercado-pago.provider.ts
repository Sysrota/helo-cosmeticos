import "dotenv/config";

import {
  MercadoPagoConfig,
} from "mercadopago";

export const mercadoPagoClient =
  new MercadoPagoConfig({

    
    accessToken:
      process.env
        .MERCADO_PAGO_TOKEN || "",
  });