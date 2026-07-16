import { Router } from "express";

import { generateMandaBemLabelController } from "./manda-bem.controller.js";
import { asyncHandler } from "../../../shared/middlewares/async-handler.js";

export const mandaBemRoutes = Router();

mandaBemRoutes.post(
  "/orders/:orderId/label",
  asyncHandler(generateMandaBemLabelController)
);
