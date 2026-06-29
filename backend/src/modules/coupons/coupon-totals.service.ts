import { prisma } from "../../config/prisma.js";
import { getCommercialPolicy } from "../store-config/store-config.service.js";

type PaymentMethod =
  | "pix"
  | "credit_card"
  | "boleto"
  | null
  | undefined;

interface CouponLike {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_subtotal: number;
  max_discount: number | null;
  allow_pix_discount: boolean;
}

interface OrderLike {
  subtotal: number;
  shipping: number;
  coupon?: CouponLike | null;
}

export function roundMoney(
  value: number
) {
  return Number(
    Number(value || 0).toFixed(2)
  );
}

export function calculateCouponDiscount(
  coupon: CouponLike | null | undefined,
  subtotal: number,
  shipping: number
) {
  if (!coupon) {
    return 0;
  }

  if (
    Number(subtotal || 0) <
    Number(coupon.min_subtotal || 0)
  ) {
    return 0;
  }

  if (coupon.discount_type === "free_shipping") {
    return roundMoney(shipping);
  }

  if (coupon.discount_type === "fixed") {
    return roundMoney(
      Math.min(
        Number(coupon.discount_value || 0),
        Number(subtotal || 0)
      )
    );
  }

  if (coupon.discount_type === "percent") {
    const rawDiscount =
      Number(subtotal || 0) *
      (
        Number(coupon.discount_value || 0) /
        100
      );

    const cappedDiscount =
      coupon.max_discount
        ? Math.min(
            rawDiscount,
            Number(coupon.max_discount)
          )
        : rawDiscount;

    return roundMoney(
      Math.min(
        cappedDiscount,
        Number(subtotal || 0)
      )
    );
  }

  return 0;
}

export async function calculateOrderTotals(
  order: OrderLike,
  paymentMethod?: PaymentMethod
) {
  const subtotal =
    roundMoney(
      Number(order.subtotal || 0)
    );
  const shipping =
    roundMoney(
      Number(order.shipping || 0)
    );
  const regularTotal =
    roundMoney(
      subtotal + shipping
    );
  const couponDiscount =
    calculateCouponDiscount(
      order.coupon,
      subtotal,
      shipping
    );
  const totalAfterCoupon =
    roundMoney(
      Math.max(
        0,
        regularTotal - couponDiscount
      )
    );

  let paymentDiscount = 0;

  if (
    paymentMethod === "pix" &&
    (
      !order.coupon ||
      order.coupon.allow_pix_discount
    )
  ) {
    const commercialPolicy =
      await getCommercialPolicy();

    paymentDiscount =
      roundMoney(
        totalAfterCoupon *
        (
          commercialPolicy.pix_discount_percent /
          100
        )
      );
  }

  const total =
    roundMoney(
      Math.max(
        0,
        totalAfterCoupon - paymentDiscount
      )
    );

  return {
    subtotal,
    shipping,
    regularTotal,
    couponDiscount,
    paymentDiscount,
    discount:
      roundMoney(
        couponDiscount +
        paymentDiscount
      ),
    totalAfterCoupon,
    total,
  };
}

export async function calculatePersistedOrderTotals(
  orderId: number,
  paymentMethod?: PaymentMethod
) {
  const order =
    await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        coupon: true,
      },
    });

  if (!order) {
    throw new Error(
      "Pedido não encontrado"
    );
  }

  return calculateOrderTotals(
    order,
    paymentMethod
  );
}
