import { Request, Response } from "express";

export async function uploadFileController(
  req: Request,
  res: Response
) {
  if (!req.file) {
    return res.status(400).json({
      error: "Arquivo não enviado",
    });
  }

  return res.status(201).json({
    filename: req.file.filename,

    url: `/uploads/${req.file.filename}`,
  });
}