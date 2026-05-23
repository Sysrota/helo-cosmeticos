import { Router }
  from "express";

import {
  createCardPaymentController,
  createPixPaymentController,
} from "./payment.controller";
import { mercadoPagoWebhook } from "./webhooks/mercado-pago.webhook";

export const paymentRoutes =
  Router();

paymentRoutes.post("/pix",createPixPaymentController);

paymentRoutes.post("/webhook",mercadoPagoWebhook);

paymentRoutes.post("/card",createCardPaymentController);