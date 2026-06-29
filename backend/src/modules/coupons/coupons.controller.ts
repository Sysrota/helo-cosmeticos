import {
  Request,
  Response,
} from "express";
import {
  applyCouponToOrderService,
  couponReportService,
  createCouponService,
  deleteCouponService,
  listCouponsService,
  removeCouponFromOrderService,
  updateCouponService,
} from "./coupons.service.js";

function errorMessage(
  error: unknown,
  fallback: string
) {
  return error instanceof Error
    ? error.message
    : fallback;
}

export async function listCouponsController(
  _req: Request,
  res: Response
) {
  const coupons =
    await listCouponsService();

  return res.json(
    coupons
  );
}

export async function createCouponController(
  req: Request,
  res: Response
) {
  try {
    const coupon =
      await createCouponService(
        req.body
      );

    return res.status(201).json(
      coupon
    );
  } catch (error) {
    return res.status(400).json({
      error:
        errorMessage(
          error,
          "Erro ao criar cupom."
        ),
    });
  }
}

export async function updateCouponController(
  req: Request,
  res: Response
) {
  try {
    const coupon =
      await updateCouponService(
        Number(req.params.id),
        req.body
      );

    return res.json(
      coupon
    );
  } catch (error) {
    return res.status(400).json({
      error:
        errorMessage(
          error,
          "Erro ao atualizar cupom."
        ),
    });
  }
}

export async function deleteCouponController(
  req: Request,
  res: Response
) {
  const coupon =
    await deleteCouponService(
      Number(req.params.id)
    );

  return res.json(
    coupon
  );
}

export async function couponReportController(
  _req: Request,
  res: Response
) {
  const report =
    await couponReportService();

  return res.json(
    report
  );
}

export async function applyCheckoutCouponController(
  req: Request,
  res: Response
) {
  try {
    const result =
      await applyCouponToOrderService(
        Number(req.params.id),
        String(req.body.code || "")
      );

    return res.json(
      result
    );
  } catch (error) {
    return res.status(400).json({
      error:
        errorMessage(
          error,
          "Erro ao aplicar cupom."
        ),
    });
  }
}

export async function removeCheckoutCouponController(
  req: Request,
  res: Response
) {
  try {
    const order =
      await removeCouponFromOrderService(
        Number(req.params.id)
      );

    return res.json({
      order,
      message:
        "Cupom removido.",
    });
  } catch (error) {
    return res.status(400).json({
      error:
        errorMessage(
          error,
          "Erro ao remover cupom."
        ),
    });
  }
}
