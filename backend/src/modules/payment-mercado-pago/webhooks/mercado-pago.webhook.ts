import {
  Request,
  Response,
} from "express";

import {
  syncMercadoPagoPayment,
} from "../payment-sync.service.js";

function getPaymentIdFromRequest(
  req: Request
) {
  return (
    req.body?.data?.id ||
    req.body?.id ||
    req.query?.["data.id"] ||
    req.query?.id
  );
}

export async function mercadoPagoWebhook(
  req: Request,
  res: Response
) {

  try {

    console.log(
      "WEBHOOK MP:",
      req.body
    );

    const paymentId =
      getPaymentIdFromRequest(
        req
      );

    if (!paymentId) {

      return res.sendStatus(200);
    }

    const result =
      await syncMercadoPagoPayment(
        String(paymentId)
      );

    console.log({
      payment_id:
        result.payment.id,
      payment_status:
        result.payment.status,
      order_id:
        result.order?.id ||
        null,
    });

    return res.sendStatus(200);

  } catch (error) {

    console.log(error);

    return res.sendStatus(200);
  }
}
