import {
  Router,
} from "express";

import {
  createCheckoutController,
  updateCheckoutDeliveryController,
} from "./checkout.controller.js";

export const checkoutRoutes =
  Router();

checkoutRoutes.post(
  "/",
  createCheckoutController
);

checkoutRoutes.put(
  "/:id/delivery",
  updateCheckoutDeliveryController
);
