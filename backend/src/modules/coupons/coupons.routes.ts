import { Router } from "express";
import {
  couponReportController,
  createCouponController,
  deleteCouponController,
  listCouponsController,
  previewCouponController,
  updateCouponController,
} from "./coupons.controller.js";

export const couponRoutes =
  Router();

couponRoutes.get(
  "/",
  listCouponsController
);

couponRoutes.get(
  "/report",
  couponReportController
);

couponRoutes.post(
  "/preview",
  previewCouponController
);

couponRoutes.post(
  "/",
  createCouponController
);

couponRoutes.put(
  "/:id",
  updateCouponController
);

couponRoutes.delete(
  "/:id",
  deleteCouponController
);
