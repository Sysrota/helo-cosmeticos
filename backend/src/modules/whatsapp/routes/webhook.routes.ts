import { Router } from "express";

import {
  verifyWebhookController,
  receiveWebhookController,
} from "../controllers/webhook.controller.js";

const router = Router();

router.get(
  "/webhook",
  verifyWebhookController
);

router.post(
  "/webhook",
  receiveWebhookController
);

export {
  router as webhookRoutes,
};