import { Router } from "express";

import {
  listProducts,
  getProduct,
  storeProduct,
  updateProductController,
  deleteProductController,
  reorderProductsController,
} from "./products.controller.js";

import { createProductImageController, deleteProductImageController, updateProductImageController } from "./products-images.controller.js";

import { asyncHandler } from "../../shared/middlewares/async-handler.js";

import { auth } from "../../shared/middlewares/auth.js";

import { upload } from "../../config/multer.js";

const router = Router();

router.get(
  "/",
  asyncHandler(listProducts)
);

router.get(
  "/:id",
  asyncHandler(getProduct)
);

router.post(
  "/",
  auth,
  asyncHandler(storeProduct)
);

router.put(
  "/order",
  auth,
  asyncHandler(reorderProductsController)
);

router.put(
  "/:id",
  auth,
  asyncHandler(updateProductController)
);

router.delete(
  "/:id",
  auth,
  asyncHandler(deleteProductController)
);

router.post(
  "/:id/images",
  auth,
  asyncHandler(
    createProductImageController
  )
);

router.put(
  "/:id/images/:imageId",
  auth,
  asyncHandler(
    updateProductImageController
  )
);

router.delete(
  "/:id/images/:imageId",
  auth,
  asyncHandler(
    deleteProductImageController
  )
);

export { router as productsRoutes };
