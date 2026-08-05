import { Request, Response } from "express";

import {
  approveReviewService,
  createReviewService,
  deleteReviewService,
  getOrderReviewEligibilityService,
  hideReviewService,
  listApprovedReviewsForProductService,
  listReviewsAdminService,
  replyReviewService,
  updateReviewTextService,
} from "./reviews.service.js";

export async function listProductReviewsController(
  req: Request,
  res: Response
) {
  const productId = Number(req.params.productId);
  const { summary, reviews } = await listApprovedReviewsForProductService(
    productId
  );

  return res.json({ summary, reviews });
}

export async function getOrderReviewEligibilityController(
  req: Request,
  res: Response
) {
  const orderId = Number(req.body.order_id);
  const email = String(req.body.email || "");

  const result = await getOrderReviewEligibilityService({
    order_id: orderId,
    email,
  });

  return res.json(result);
}

export async function createReviewController(
  req: Request,
  res: Response
) {
  const photoUrl = req.file
    ? `/uploads/${req.file.filename}`
    : null;

  const review = await createReviewService({
    product_id: Number(req.body.product_id),
    name: req.body.name,
    city: req.body.city,
    state: req.body.state,
    rating: Number(req.body.rating),
    title: req.body.title,
    comment: req.body.comment,
    photo_url: photoUrl,
    recommends:
      req.body.recommends === undefined
        ? undefined
        : req.body.recommends === "true" || req.body.recommends === true,
    order_id: req.body.order_id ? Number(req.body.order_id) : null,
    email: req.body.email,
  });

  return res.status(201).json(review);
}

// =====================
// ADMIN
// =====================

export async function listReviewsAdminController(
  req: Request,
  res: Response
) {
  const approved =
    req.query.approved === undefined
      ? undefined
      : req.query.approved === "true";
  const productId = req.query.product_id
    ? Number(req.query.product_id)
    : undefined;

  const reviews = await listReviewsAdminService({
    approved,
    product_id: productId,
  });

  return res.json(reviews);
}

export async function approveReviewController(
  req: Request,
  res: Response
) {
  const review = await approveReviewService(Number(req.params.id));
  return res.json(review);
}

export async function hideReviewController(
  req: Request,
  res: Response
) {
  const review = await hideReviewService(Number(req.params.id));
  return res.json(review);
}

export async function updateReviewTextController(
  req: Request,
  res: Response
) {
  const review = await updateReviewTextService(Number(req.params.id), {
    title: req.body.title,
    comment: req.body.comment,
  });

  return res.json(review);
}

export async function replyReviewController(
  req: Request,
  res: Response
) {
  const review = await replyReviewService(
    Number(req.params.id),
    req.body.response
  );

  return res.json(review);
}

export async function deleteReviewController(
  req: Request,
  res: Response
) {
  await deleteReviewService(Number(req.params.id));
  return res.status(204).send();
}
