import { Request, Response } from "express";

import { generateMandaBemLabel } from "./manda-bem-label.service.js";

export async function generateMandaBemLabelController(
  req: Request,
  res: Response
) {
  try {
    const result = await generateMandaBemLabel(Number(req.params.orderId));

    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Erro ao gerar etiqueta",
    });
  }
}
