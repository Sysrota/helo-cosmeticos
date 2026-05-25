import {
  Router,
} from "express";

import {
  createCheckoutController,
  trackOrderController,
  updateCheckoutDeliveryController,
} from "./checkout.controller.js";

export const checkoutRoutes =
  Router();

checkoutRoutes.post(
  "/",
  createCheckoutController
);

checkoutRoutes.post(
  "/tracking",
  trackOrderController
);

checkoutRoutes.put(
  "/:id/delivery",
  updateCheckoutDeliveryController
);
