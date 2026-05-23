import {
  Request,
  Response,
} from "express";

import {
  prisma,
} from "../../../config/prisma.js";

export async function getAiCartController(
  req: Request,
  res: Response
) {

  try {

    const { token } =
      req.params;

    const conversation =
      await prisma.conversation
        .findFirst({

          where: {
            checkout_token:
              token,
          },
        });

    if (!conversation) {

      return res.status(404)
        .json({
          error:
            "Carrinho não encontrado",
        });
    }

    return res.json({

      cart:
        conversation.cart_json,
    });

  } catch (error) {

    return res.status(500)
      .json({
        error:
          "Erro ao buscar carrinho",
      });
  }
}