import { Router } from "express";
import {
  commissionOrdersController,
  commissionStatementPdfController,
  couponReportController,
  createCommissionPayoutController,
  createCouponController,
  deleteCommissionPayoutController,
  deleteCouponController,
  listCommissionPayoutsController,
  listCouponsController,
  pendingCommissionController,
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

couponRoutes.get(
  "/commission-orders",
  commissionOrdersController
);

couponRoutes.post(
  "/preview",
  previewCouponController
);

couponRoutes.delete(
  "/commission-payouts/:payoutId",
  deleteCommissionPayoutController
);

couponRoutes.get(
  "/:id/commission-payouts",
  listCommissionPayoutsController
);

couponRoutes.post(
  "/:id/commission-payouts",
  createCommissionPayoutController
);

couponRoutes.get(
  "/:id/commission-pending",
  pendingCommissionController
);

couponRoutes.get(
  "/:id/commission-statement.pdf",
  commissionStatementPdfController
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
