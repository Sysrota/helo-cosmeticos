import { Router }
  from "express";
import {
  connectMelhorEnvioController,
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
