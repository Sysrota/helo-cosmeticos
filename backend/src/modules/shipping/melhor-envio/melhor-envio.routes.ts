import { Router }
  from "express";
import { connectMelhorEnvioController, melhorEnvioCallbackController } from "./melhor-envio.controller";

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