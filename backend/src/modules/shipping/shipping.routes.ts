import { Router }
  from "express";

import {
  calculateShippingController,
} from "./shipping.controller.js";
import { auth } from "../../shared/middlewares/auth.js";
import { asyncHandler } from "../../shared/middlewares/async-handler.js";



const shippingRoutes =
  Router();


shippingRoutes.post(
  "/calculate",
  auth,
  asyncHandler(
    calculateShippingController
  )
);

export {
  shippingRoutes,
};