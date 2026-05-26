import { Router }
  from "express";

import {
  getStoreConfigController,
  updateStoreConfigController,
} from "./store-config.controller.js";
import { auth } from "../../shared/middlewares/auth.js";
import { asyncHandler } from "../../shared/middlewares/async-handler.js";

export const storeConfigRoutes =
  Router();

storeConfigRoutes.get(
  "/",
  asyncHandler(
    getStoreConfigController
  )
);

storeConfigRoutes.put(
  "/",
  auth,
  asyncHandler(
    updateStoreConfigController
  )
);
