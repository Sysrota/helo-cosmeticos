import { Router } from "express";
import {
  couponReportController,
  createCouponController,
  deleteCouponController,
  listCouponsController,
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
