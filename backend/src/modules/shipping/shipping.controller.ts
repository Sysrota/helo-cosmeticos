import {
  Request,
  Response,
} from "express";

import {
  calculateProductShipping,
  calculateShipping,
  findAddressByCep,
} from "./shipping.service.js";

export async function findAddressByCepController(
  req: Request,
  res: Response
) {

  try {

    const address =
      await findAddressByCep(
        String(req.params.cep || "")
      );

    return res.json(
      address
    );

  } catch (error) {

    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao buscar CEP",
    });
  }
}

export async function calculateShippingController(
  req: Request,
  res: Response
) {

  try {

    const {
      cep,
      order_id,
    } = req.body;

    const shipping =
      await calculateShipping({
        cep,
        order_id,
      });

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

export async function calculateProductShippingController(
  req: Request,
  res: Response
) {

  try {

    const {
      cep,
      product_id,
      quantity,
    } = req.body;

    const shipping =
      await calculateProductShipping({
        cep:
          String(cep || ""),
        product_id:
          Number(product_id),
        quantity:
          Number(quantity || 1),
      });

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
