import {
  Request,
  Response,
} from "express";

import {
  calculateShipping,
} from "./shipping.service.js";

export async function calculateShippingController(
  req: Request,
  res: Response
) {

  try {

    const { cep } =
      req.body;

    const shipping =
      await calculateShipping(
        cep
      );

    return res.json(
      shipping
    );

  } catch (error) {

    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Erro no cálculo",
    });
  }
}