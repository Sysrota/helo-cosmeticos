import { Router }
  from "express";

import {
  calculateProductShippingController,
  calculateShippingController,
  findAddressByCepController,
} from "./shipping.controller.js";
import { asyncHandler } from "../../shared/middlewares/async-handler.js";



const shippingRoutes =
  Router();

shippingRoutes.get(
  "/address/:cep",
  asyncHandler(
    findAddressByCepController
  )
);

shippingRoutes.post(
  "/product-quote",
  asyncHandler(
    calculateProductShippingController
  )
);

shippingRoutes.post(
  "/calculate",
  asyncHandler(
    calculateShippingController
  )
);

export {
  shippingRoutes,
};
