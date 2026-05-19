import express from "express";

import cors from "cors";

import path from "path";

import { productsRoutes } from "./modules/products/products.routes.js";

import { authRoutes } from "./modules/auth/auth.routes.js";

import { attendanceRoutes } from "./modules/attendance/attendance.routes.js";
import { webhookRoutes } from "./modules/whatsapp/routes/webhook.routes.js";
import { errorHandler } from "./shared/middlewares/error-handler.js";
import { uploadRoutes } from "./modules/uploads/uploads.routes.js";

const app = express();

app.use(cors());

app.use(express.json());

app.use(
  "/uploads",
  express.static(
    path.resolve("uploads")
  )
);

app.get("/health", (_req, res) => {
  return res.json({
    ok: true,
    message: "API funcionando",
  });
});

app.use("/auth", authRoutes);

app.use("/products", productsRoutes);

app.use(
  "/upload",
  uploadRoutes
);


app.use("/attendance",attendanceRoutes);

app.use("/whatsapp",webhookRoutes);

app.use(
  "/uploads",
  express.static(
    path.resolve("uploads")
  )
);

app.use(errorHandler);

export { app };
