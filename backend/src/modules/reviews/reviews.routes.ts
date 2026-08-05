import { Router } from "express";

import { upload } from "../../config/multer.js";
import { auth } from "../../shared/middlewares/auth.js";
import { asyncHandler } from "../../shared/middlewares/async-handler.js";
import {
  approveReviewController,
  createReviewController,
  deleteReviewController,
  getOrderReviewEligibilityController,
  hideReviewController,
  listProductReviewsController,
  listReviewsAdminController,
  replyReviewController,
  updateReviewTextController,
} from "./reviews.controller.js";

export const reviewRoutes = Router();

// =====================
// PÚBLICO
// =====================

reviewRoutes.get(
  "/product/:productId",
  asyncHandler(listProductReviewsController)
);

// Reaproveita a verificação de posse do pedido do Acompanhar Pedido
// (número do pedido + e-mail cadastrado) para liberar quais produtos
// deste pedido pago ainda podem ser avaliados como compra verificada.
reviewRoutes.post(
  "/order-eligibility",
  asyncHandler(getOrderReviewEligibilityController)
);

reviewRoutes.post(
  "/",
  upload.single("foto"),
  asyncHandler(createReviewController)
);

// =====================
// ADMIN
// =====================

reviewRoutes.get(
  "/",
  auth,
  asyncHandler(listReviewsAdminController)
);

reviewRoutes.patch(
  "/:id/approve",
  auth,
  asyncHandler(approveReviewController)
);

reviewRoutes.patch(
  "/:id/hide",
  auth,
  asyncHandler(hideReviewController)
);

reviewRoutes.patch(
  "/:id",
  auth,
  asyncHandler(updateReviewTextController)
);

reviewRoutes.post(
  "/:id/reply",
  auth,
  asyncHandler(replyReviewController)
);

reviewRoutes.delete(
  "/:id",
  auth,
  asyncHandler(deleteReviewController)
);
