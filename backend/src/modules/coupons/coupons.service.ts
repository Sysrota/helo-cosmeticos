import { prisma } from "../../config/prisma.js";
import {
  calculateOrderTotals,
  roundMoney,
} from "./coupon-totals.service.js";

const PAID_STATUSES = [
  "paid",
  "approved",
];

export function normalizeCouponCode(
  value: string
) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function parseDate(
  value: unknown
) {
  if (!value) {
    return null;
  }

  const date =
    new Date(String(value));

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function parseOptionalNumber(
  value: unknown
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function couponPayload(
  body: any
) {
  const code =
    normalizeCouponCode(
      body.code
    );
  const discountType =
    String(
      body.discount_type || ""
    );

  if (!code) {
    throw new Error(
      "Informe o código do cupom."
    );
  }

  if (
    ![
      "percent",
      "fixed",
      "free_shipping",
    ].includes(discountType)
  ) {
    throw new Error(
      "Tipo de desconto inválido."
    );
  }

  return {
    code,
    name:
      String(
        body.name || code
      ).trim(),
    partner_name:
      String(
        body.partner_name || ""
      ).trim(),
    partner_email:
      body.partner_email
        ? String(
            body.partner_email
          ).trim()
        : null,
    discount_type:
      discountType,
    discount_value:
      roundMoney(
        Number(
          body.discount_value || 0
        )
      ),
    min_subtotal:
      roundMoney(
        Number(
          body.min_subtotal || 0
        )
      ),
    max_discount:
      parseOptionalNumber(
        body.max_discount
      ),
    starts_at:
      parseDate(
        body.starts_at
      ),
    ends_at:
      parseDate(
        body.ends_at
      ),
    usage_limit:
      parseOptionalNumber(
        body.usage_limit
      ),
    usage_limit_per_customer:
      parseOptionalNumber(
        body.usage_limit_per_customer
      ),
    allow_pix_discount:
      body.allow_pix_discount !==
      false,
    commission_percent:
      roundMoney(
        Number(
          body.commission_percent || 0
        )
      ),
    is_active:
      body.is_active !== false,
  };
}

async function getCouponUsage(
  couponId: number,
  contactId?: number
) {
  const [totalUsage, customerUsage] =
    await Promise.all([
      prisma.couponRedemption.count({
        where: {
          coupon_id:
            couponId,
        },
      }),
      contactId
        ? prisma.couponRedemption.count({
            where: {
              coupon_id:
                couponId,
              contact_id:
                contactId,
            },
          })
        : Promise.resolve(0),
    ]);

  return {
    totalUsage,
    customerUsage,
  };
}

export async function listCouponsService() {
  const coupons =
    await prisma.coupon.findMany({
      orderBy: {
        created_at:
          "desc",
      },
      include: {
        _count: {
          select: {
            redemptions: true,
          },
        },
      },
    });

  return coupons.map((coupon) => ({
    ...coupon,
    usage_count:
      coupon._count.redemptions,
  }));
}

export async function createCouponService(
  body: any
) {
  const data =
    couponPayload(body);

  if (!data.partner_name) {
    throw new Error(
      "Informe o nome da influencer/parceira."
    );
  }

  return prisma.coupon.create({
    data,
  });
}

export async function updateCouponService(
  id: number,
  body: any
) {
  const data =
    couponPayload(body);

  return prisma.coupon.update({
    where: {
      id,
    },
    data,
  });
}

async function validateCouponForSubtotal(
  code: string,
  subtotal: number
) {
  const normalizedCode =
    normalizeCouponCode(code);

  const coupon =
    await prisma.coupon.findUnique({
      where: {
        code:
          normalizedCode,
      },
    });

  if (!coupon) {
    throw new Error(
      "Cupom não encontrado."
    );
  }

  const now =
    new Date();

  if (!coupon.is_active) {
    throw new Error(
      "Cupom inativo."
    );
  }

  if (
    coupon.starts_at &&
    coupon.starts_at > now
  ) {
    throw new Error(
      "Cupom ainda não está disponível."
    );
  }

  if (
    coupon.ends_at &&
    coupon.ends_at < now
  ) {
    throw new Error(
      "Cupom expirado."
    );
  }

  if (
    Number(subtotal || 0) <
    Number(coupon.min_subtotal || 0)
  ) {
    throw new Error(
      `Cupom válido para compras acima de R$ ${Number(coupon.min_subtotal).toFixed(2)}.`
    );
  }

  const usage =
    await getCouponUsage(
      coupon.id
    );

  if (
    coupon.usage_limit &&
    usage.totalUsage >=
      coupon.usage_limit
  ) {
    throw new Error(
      "Limite de uso do cupom atingido."
    );
  }

  return coupon;
}

export async function previewCouponService(
  code: string,
  cart: any[] = [],
  shippingPrice = 0
) {
  if (!cart.length) {
    throw new Error(
      "Carrinho vazio."
    );
  }

  const productIds =
    cart.map(
      (item) =>
        Number(
          item.product_id ??
          item.id
        )
    );

  const products =
    await prisma.product.findMany({
      where: {
        id: {
          in:
            productIds,
        },
      },
    });

  let subtotal = 0;

  for (const item of cart) {
    const productId =
      Number(
        item.product_id ??
        item.id
      );
    const product =
      products.find(
        (current) =>
          current.id ===
          productId
      );

    if (!product) {
      throw new Error(
        "Um ou mais produtos não estão disponíveis."
      );
    }

    subtotal +=
      Number(product.price || 0) *
      Number(item.quantity || 1);
  }

  const coupon =
    await validateCouponForSubtotal(
      code,
      subtotal
    );

  const totals =
    await calculateOrderTotals({
      subtotal,
      shipping:
        Number(shippingPrice || 0),
      coupon,
    });

  return {
    coupon,
    totals,
    message:
      "Cupom aplicado.",
  };
}

export async function validateCouponForOrder(
  code: string,
  orderId: number
) {
  const normalizedCode =
    normalizeCouponCode(code);

  const order =
    await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        contact: true,
        coupon: true,
      },
    });

  if (!order) {
    throw new Error(
      "Pedido não encontrado."
    );
  }

  if (
    order.mercado_pago_payment_id ||
    [
      "paid",
      "approved",
    ].includes(
      String(
        order.payment_status || ""
      )
    )
  ) {
    throw new Error(
      "Não é possível alterar cupom após iniciar o pagamento."
    );
  }

  const coupon =
    await validateCouponForSubtotal(
      normalizedCode,
      order.subtotal
    );

  const usage =
    await getCouponUsage(
      coupon.id,
      order.contact_id
    );

  if (
    coupon.usage_limit &&
    usage.totalUsage >=
      coupon.usage_limit
  ) {
    throw new Error(
      "Limite de uso do cupom atingido."
    );
  }

  if (
    coupon.usage_limit_per_customer &&
    usage.customerUsage >=
      coupon.usage_limit_per_customer
  ) {
    throw new Error(
      "Este cliente já atingiu o limite de uso deste cupom."
    );
  }

  return {
    order,
    coupon,
  };
}

export async function applyCouponToOrderService(
  orderId: number,
  code: string
) {
  const {
    order,
    coupon,
  } =
    await validateCouponForOrder(
      code,
      orderId
    );

  const totals =
    await calculateOrderTotals({
      subtotal:
        order.subtotal,
      shipping:
        order.shipping,
      coupon,
    });

  const updatedOrder =
    await prisma.order.update({
      where: {
        id:
          order.id,
      },
      data: {
        coupon_id:
          coupon.id,
        coupon_code:
          coupon.code,
        coupon_discount:
          totals.couponDiscount,
        payment_discount:
          0,
        discount:
          totals.couponDiscount,
        total:
          totals.total,
      },
      include: {
        contact: true,
        coupon: true,
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
          },
        },
      },
    });

  return {
    order:
      updatedOrder,
    coupon,
    totals,
    message:
      "Cupom aplicado com sucesso.",
  };
}

export async function removeCouponFromOrderService(
  orderId: number
) {
  const order =
    await prisma.order.findUnique({
      where: {
        id:
          orderId,
      },
    });

  if (!order) {
    throw new Error(
      "Pedido não encontrado."
    );
  }

  if (order.mercado_pago_payment_id) {
    throw new Error(
      "Não é possível remover cupom após iniciar o pagamento."
    );
  }

  const totals =
    await calculateOrderTotals({
      subtotal:
        order.subtotal,
      shipping:
        order.shipping,
      coupon:
        null,
    });

  return prisma.order.update({
    where: {
      id:
        orderId,
    },
    data: {
      coupon_id:
        null,
      coupon_code:
        null,
      coupon_discount:
        0,
      payment_discount:
        0,
      discount:
        0,
      total:
        totals.total,
    },
    include: {
      contact: true,
      coupon: true,
      items: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
        },
      },
    },
  });
}

export async function syncCouponRedemption(
  orderId: number,
  status?: string | null
) {
  const order =
    await prisma.order.findUnique({
      where: {
        id:
          orderId,
      },
    });

  if (
    !order ||
    !order.coupon_id ||
    !order.coupon_code
  ) {
    return null;
  }

  return prisma.couponRedemption.upsert({
    where: {
      coupon_id_order_id: {
        coupon_id:
          order.coupon_id,
        order_id:
          order.id,
      },
    },
    update: {
      discount:
        order.coupon_discount,
      subtotal:
        order.subtotal,
      total:
        order.total,
      status:
        status ||
        order.payment_status ||
        order.status,
    },
    create: {
      coupon_id:
        order.coupon_id,
      order_id:
        order.id,
      contact_id:
        order.contact_id,
      code:
        order.coupon_code,
      discount:
        order.coupon_discount,
      subtotal:
        order.subtotal,
      total:
        order.total,
      status:
        status ||
        order.payment_status ||
        order.status,
    },
  });
}

export async function couponReportService() {
  const coupons =
    await prisma.coupon.findMany({
      orderBy: [
        {
          partner_name:
            "asc",
        },
        {
          code:
            "asc",
        },
      ],
      include: {
        redemptions: {
          include: {
            order: true,
            contact: true,
          },
        },
      },
    });

  const rows =
    coupons.map((coupon) => {
      const redemptions =
        coupon.redemptions;
      const paidRedemptions =
        redemptions.filter((redemption) =>
          PAID_STATUSES.includes(
            String(
              redemption.order.payment_status ||
              redemption.order.status ||
              redemption.status
            )
          )
        );

      const paidRevenue =
        paidRedemptions.reduce(
          (sum, redemption) =>
            sum +
            Number(
              redemption.order.total || 0
            ),
          0
        );
      const paidSubtotal =
        paidRedemptions.reduce(
          (sum, redemption) =>
            sum +
            Number(
              redemption.order.subtotal || 0
            ),
          0
        );
      const discountTotal =
        redemptions.reduce(
          (sum, redemption) =>
            sum +
            Number(
              redemption.discount || 0
            ),
          0
        );
      const commission =
        roundMoney(
          paidSubtotal *
          (
            Number(
              coupon.commission_percent || 0
            ) /
            100
          )
        );

      return {
        coupon_id:
          coupon.id,
        code:
          coupon.code,
        name:
          coupon.name,
        partner_name:
          coupon.partner_name,
        partner_email:
          coupon.partner_email,
        is_active:
          coupon.is_active,
        discount_type:
          coupon.discount_type,
        discount_value:
          coupon.discount_value,
        commission_percent:
          coupon.commission_percent,
        total_orders:
          redemptions.length,
        paid_orders:
          paidRedemptions.length,
        pending_orders:
          redemptions.length -
          paidRedemptions.length,
        revenue_total:
          roundMoney(
            paidRevenue
          ),
        subtotal_total:
          roundMoney(
            paidSubtotal
          ),
        discount_total:
          roundMoney(
            discountTotal
          ),
        average_ticket:
          paidRedemptions.length
            ? roundMoney(
                paidRevenue /
                paidRedemptions.length
              )
            : 0,
        estimated_commission:
          commission,
        orders:
          redemptions.map((redemption) => ({
            id:
              redemption.order.id,
            order_number:
              redemption.order.order_number,
            customer:
              redemption.contact.name,
            payment_status:
              redemption.order.payment_status,
            status:
              redemption.order.status,
            subtotal:
              redemption.order.subtotal,
            discount:
              redemption.discount,
            total:
              redemption.order.total,
            created_at:
              redemption.order.created_at,
          })),
      };
    });

  const summary =
    rows.reduce(
      (acc, row) => ({
        coupons:
          acc.coupons + 1,
        total_orders:
          acc.total_orders +
          row.total_orders,
        paid_orders:
          acc.paid_orders +
          row.paid_orders,
        revenue_total:
          roundMoney(
            acc.revenue_total +
            row.revenue_total
          ),
        discount_total:
          roundMoney(
            acc.discount_total +
            row.discount_total
          ),
        estimated_commission:
          roundMoney(
            acc.estimated_commission +
            row.estimated_commission
          ),
      }),
      {
        coupons: 0,
        total_orders: 0,
        paid_orders: 0,
        revenue_total: 0,
        discount_total: 0,
        estimated_commission: 0,
      }
    );

  return {
    summary,
    rows,
  };
}

export async function deleteCouponService(
  id: number
) {
  return prisma.coupon.update({
    where: {
      id,
    },
    data: {
      is_active:
        false,
    },
  });
}
