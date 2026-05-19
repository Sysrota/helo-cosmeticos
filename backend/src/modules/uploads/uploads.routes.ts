import { Router } from "express";

import { upload } from "../../config/multer.js";

import { auth } from "../../shared/middlewares/auth.js";

const router = Router();

router.post(
  "/",
  auth,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error:
          "Arquivo não enviado",
      });
    }

    return res.status(201).json({
      image_url:
        `/uploads/${req.file.filename}`,
    });
  }
);

export {
  router as uploadRoutes,
};