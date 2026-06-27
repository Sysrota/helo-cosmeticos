import express from "express";

import cors from "cors";

import path from "path";

import { fileURLToPath } from "url";

import { productsRoutes } from "./modules/products/products.routes.js";

import { authRoutes } from "./modules/auth/auth.routes.js";

import { attendanceRoutes } from "./modules/attendance/attendance.routes.js";
import { webhookRoutes } from "./modules/whatsapp/routes/webhook.routes.js";
import { errorHandler } from "./shared/middlewares/error-handler.js";
import { uploadRoutes } from "./modules/uploads/uploads.routes.js";
import { shippingRoutes } from "./modules/shipping/shipping.routes.js";
import { contactRoutes } from "./modules/contact/contact.routes.js";
import { updateContactController } from "./modules/contact/contact.controller.js";
import { orderRoutes } from "./modules/order/order.routes.js";
import { storeConfigRoutes } from "./modules/store-config/store-config.routes.js";
import { melhorEnvioRoutes } from "./modules/shipping/melhor-envio/melhor-envio.routes.js";
import { paymentRoutes } from "./modules/payment-mercado-pago/payment.routes.js";
import { aiRoutes } from "./modules/ai/ai.routes.js";
import { checkoutRoutes } from "./modules/checkout/checkout.routes.js";


const __dirname =
  path.dirname(
    fileURLToPath(import.meta.url)
  );

// Sempre backend/uploads/, independente do CWD do processo
const UPLOADS_DIR =
  path.join(__dirname, "../uploads");

const app = express();

app.use(cors());

app.use(express.json());

app.use(
  "/uploads",
  express.static(UPLOADS_DIR)
);

app.get("/health", (_req, res) => {
  return res.json({
    ok: true,
    message: "API funcionando",
  });
});

app.use("/auth", authRoutes);

app.use("/products", productsRoutes);

app.use("/upload",uploadRoutes);

app.use("/attendance",attendanceRoutes);

app.use("/whatsapp",webhookRoutes);

app.use("/shipping",shippingRoutes);

app.use("/contacts",contactRoutes);

app.use("/orders",orderRoutes);

app.use("/store-config",storeConfigRoutes);

app.use("/shipping/melhor-envio",melhorEnvioRoutes);

app.use("/payment",paymentRoutes);

app.use("/ai",aiRoutes);

app.use("/checkout",checkoutRoutes);



contactRoutes.put("/:id",updateContactController);



app.use(
  "/uploads",
  express.static(UPLOADS_DIR)
);

app.use(errorHandler);

export { app };
