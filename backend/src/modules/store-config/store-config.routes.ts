import { Router }
  from "express";

import {
  getStoreConfigController,
  updateStoreConfigController,
} from "./store-config.controller.js";

export const storeConfigRoutes =
  Router();

storeConfigRoutes.get(
  "/",
  getStoreConfigController
);

storeConfigRoutes.put(
  "/",
  updateStoreConfigController
);