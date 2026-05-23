import {
  Router,
} from "express";

import {
  getAiCartController,
} from "./controllers/ai-cart.controller.js";

const aiRoutes =
  Router();

aiRoutes.get(
  "/cart/:token",
  getAiCartController
);

export {
  aiRoutes,
};