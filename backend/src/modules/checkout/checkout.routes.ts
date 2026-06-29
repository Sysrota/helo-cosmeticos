import {
  Router,
} from "express";

import {
  createCheckoutController,
  trackOrderController,
  updateCheckoutDeliveryController,
} from "./checkout.controller.js";
import {
  applyCheckoutCouponController,
  removeCheckoutCouponController,
} from "../coupons/coupons.controller.js";

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

checkoutRoutes.post(
  "/:id/coupon",
  applyCheckoutCouponController
);

checkoutRoutes.delete(
  "/:id/coupon",
  removeCheckoutCouponController
);
