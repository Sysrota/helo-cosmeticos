import { Router } from "express";

import { loginController } from "./auth.controller.js";

import { asyncHandler } from "../../shared/middlewares/async-handler.js";

const router = Router();

router.post(
  "/login",
  asyncHandler(loginController)
);

export { router as authRoutes };