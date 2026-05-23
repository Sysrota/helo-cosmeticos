import {
  Router,
} from "express";

import {
  createCheckoutController,
} from "./checkout.controller.js";

export const checkoutRoutes =
  Router();

checkoutRoutes.post(
  "/",
  createCheckoutController
);