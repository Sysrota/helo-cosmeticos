import { Router }
  from "express";

import {
  createCardPaymentController,
  createPixPaymentController,
  createBoletoPaymentController,
} from "./payment.controller";
import { mercadoPagoWebhook } from "./webhooks/mercado-pago.webhook";

export const paymentRoutes =
  Router();

paymentRoutes.post("/pix", createPixPaymentController);
paymentRoutes.post("/card", createCardPaymentController);
paymentRoutes.post("/boleto", createBoletoPaymentController);
paymentRoutes.post("/webhook", mercadoPagoWebhook);