import {
  Request,
  Response,
} from "express";
import { listOrdersService, showOrderService, updateOrderService } from "./order.service";


export async function listOrdersController(
  _: Request,
  res: Response
) {

  const orders =
    await listOrdersService();

  return res.json(
    orders
  );
}


export async function showOrderController(
  req: Request,
  res: Response
) {

  const order =
    await showOrderService(
      Number(
        req.params.id
      )
    );

  return res.json(
    order
  );
}

export async function updateOrderController(
  req: Request,
  res: Response
) {

  try {

    console.log("da",req.body);

    const order =
      await updateOrderService({
        id: Number(
          req.params.id
        ),

        ...req.body,
      });

    return res.json(
      order
    );

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      error:
        "Erro ao atualizar pedido",
    });
  }
}