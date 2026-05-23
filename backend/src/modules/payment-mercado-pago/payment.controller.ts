import {
  Request,
  Response,
} from "express";
import { createPixPaymentService } from "./create-pix-payment.service";

import {
  MercadoPagoConfig
} from "mercadopago";
import { createCardPaymentService } from "./create-card-payment.service";

const client =
  new MercadoPagoConfig({

    accessToken:
      process.env
        .MERCADO_PAGO_ACCESS_TOKEN!,
  });


export async function createPixPaymentController(
  req: Request,
  res: Response
) {

  try {

    const payment =
      await createPixPaymentService({
        order_id:
          Number(
            req.body.order_id
          ),
      });

    return res.json(
      payment
    );

  } catch (error) {


    console.log(
        JSON.stringify(
            error,
            null,
            2
        )
        );

    return res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Erro ao gerar PIX",
    });
  }
}

export async function createCardPaymentController(
  req: Request,
  res: Response
) {

  console.log("Chegand",req.body)  

  try {

    const payment =
      await createCardPaymentService({

        order_id:
          Number(
            req.body.order_id
          ),

        token:
          req.body.token,

        issuer_id:
          req.body.issuer_id,

        payment_method_id:
          req.body.payment_method_id,

        transaction_amount:
          req.body.transaction_amount,

        installments:
          req.body.installments,

        payer:
          req.body.payer,
      });

    return res.json(
      payment
    );

  } catch (error) {

    console.log(
      JSON.stringify(
        error,
        null,
        2
      )
    );

    return res.status(400).json({

      error:
        error instanceof Error

          ? error.message

          : "Erro ao pagar cartão",
    });
  }
}
