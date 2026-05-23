import { Router }
  from "express";
import { createOrderController } from "./order.service";
import { listOrdersController, showOrderController, updateOrderController } from "./order.controller";


export const orderRoutes =
  Router();

orderRoutes.post("/",createOrderController);

orderRoutes.get("/",listOrdersController);

orderRoutes.get("/:id",showOrderController);

orderRoutes.put("/:id",updateOrderController);