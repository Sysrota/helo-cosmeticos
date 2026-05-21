import express from "express";

import cors from "cors";

import path from "path";

import { productsRoutes } from "./modules/products/products.routes.js";

import { authRoutes } from "./modules/auth/auth.routes.js";

import { attendanceRoutes } from "./modules/attendance/attendance.routes.js";
import { webhookRoutes } from "./modules/whatsapp/routes/webhook.routes.js";
import { errorHandler } from "./shared/middlewares/error-handler.js";
import { uploadRoutes } from "./modules/uploads/uploads.routes.js";
import testRoutes from "./routes/test.routes.js";
import { shippingRoutes } from "./modules/shipping/shipping.routes.js";


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
  "/test",
  testRoutes
);

app.use(
  "/upload",
  uploadRoutes
);


app.use("/attendance",attendanceRoutes);

app.use("/whatsapp",webhookRoutes);

app.use("/shipping",shippingRoutes);



app.use(
  "/uploads",
  express.static(
    path.resolve("uploads")
  )
);

app.use(errorHandler);

export { app };
