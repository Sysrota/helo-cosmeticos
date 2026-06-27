import multer from "multer";

import path from "path";

import fs from "fs";

// Sempre backend/uploads/, independente do CWD do processo
// __dirname em dist/config/multer.js → ../../uploads = backend/uploads/
const uploadPath =
  path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, {
    recursive: true,
  });
}

export const upload = multer({
  storage: multer.diskStorage({
    destination: (
      _req,
      _file,
      callback
    ) => {
      callback(null, uploadPath);
    },

    filename: (
      _req,
      file,
      callback
    ) => {
      const filename = `${Date.now()}-${file.originalname}`;

      callback(
        null,
        filename.replace(/\s/g, "-")
      );
    },
  }),

  fileFilter: (
    _req,
    file,
    callback
  ) => {
    const allowed = [

      // Imagens
      "image/jpeg",
      "image/png",
      "image/webp",

      // Áudios
      "audio/ogg",
      "audio/webm",
      "audio/mpeg",

      // Documentos
      "application/pdf",
    ];

    if (
      !allowed.includes(file.mimetype)
    ) {
      return callback(
        new Error(
          "Formato inválido"
        )
      );
    }

    callback(null, true);
  },

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});