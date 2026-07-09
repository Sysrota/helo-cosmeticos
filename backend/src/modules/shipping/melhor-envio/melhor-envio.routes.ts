import { Router }
  from "express";
import {
  connectMelhorEnvioController,
  generateMelhorEnvioLabelController,
  melhorEnvioCallbackController,
  melhorEnvioWebhookController,
} from "./melhor-envio.controller";

export const melhorEnvioRoutes =
  Router();

melhorEnvioRoutes.get(
  "/connect",
  connectMelhorEnvioController
);

melhorEnvioRoutes.get(
  "/callback",
  melhorEnvioCallbackController
);

melhorEnvioRoutes.post(
  "/webhook",
  melhorEnvioWebhookController
);

melhorEnvioRoutes.post(
  "/orders/:orderId/label",
  generateMelhorEnvioLabelController
);
