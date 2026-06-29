import { prisma }
  from "../../config/prisma.js";
import {
  syncOrderPaymentStatus,
} from "../payment-mercado-pago/payment-sync.service.js";
import {
  sendOrderStatusMovementEmail,
} from "../notification/order-email.service.js";
import {
  sendOrderStatusUpdateWhatsApp,
} from "../notification/order-whatsapp-template.service.js";
import {
  Request,
  Response,
} from "express";
import {
  generateOrderNumber,
} from "./order-number.service.js";

interface Item {
  product_id: number;

  quantity: number;
}

interface Props {
  contact_id: number;

  items: Item[];
}

export async function createOrderService({
  contact_id,
  items,
}: Props) {

  let subtotal = 0;

  const products =
    await prisma.product.findMany({
      where: {
        id: {
          in: items.map(
            (i) =>
              i.product_id
          ),
        },
      },
    });

  const orderItems =
    items.map((item) => {

      const product =
        products.find(
          (p) =>
            p.id ===
            item.product_id
        );

      const unit_price =
        product?.price || 0;

      const total =
        unit_price *
        item.quantity;

      subtotal += total;

      return {
        product_id:
          item.product_id,

        quantity:
          item.quantity,

        unit_price,

        total,
      };
    });

  return prisma.$transaction(
    async (transaction) => {
      const orderNumber =
        await generateOrderNumber(
          transaction
        );

      return transaction.order.create({
        data: {
          order_number:
            orderNumber,

          contact_id,

          subtotal,

          total:
            subtotal,

          items: {
            create:
              orderItems,
          },
        },

        include: {
          items: {
            include: {
              product: true,
            },
          },

          contact: {
            include: {
              addresses: {
                orderBy: {
                  updated_at: "desc",
                },
                take: 1,
              },
            },
          },
        },
      });
    }
  );
}


export async function createOrderController(
  req: Request,
  res: Response
) {

  try {

    const order =
      await createOrderService(
        req.body
      );

    return res.json(
      order
    );

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      error:
        "Erro ao criar pedido",
    });
  }
}

export async function listOrdersService() {
  const pendingOrders =
    await prisma.order.findMany({
      where: {
        mercado_pago_payment_id: {
          not:
            null,
        },
        payment_status: {
          notIn: [
            "paid",
            "approved",
          ],
        },
      },
      orderBy: {
        created_at:
          "desc",
      },
      take:
        20,
    });

  await Promise.allSettled(
    pendingOrders.map((order) =>
      syncOrderPaymentStatus(
        order
      )
    )
  );

  return prisma.order.findMany({
    orderBy: {
      created_at: "desc",
    },

    include: {
      contact: true,

      coupon: true,

      items: {
        include: {
          product: true,
        },
      },
    },
  });
}

export async function showOrderService(
  orderCode: string | number
) {
  const orderId =
    Number(orderCode);
  const orderNumber =
    String(orderCode);

  const order =
    await prisma.order.findFirst({
    where: {
      OR: [
        {
          id: orderId,
        },
        {
          order_number:
            orderNumber,
        },
      ],
    },

    include: {
      contact: {
        include: {
          addresses: {
            orderBy: {
              updated_at: "desc",
            },
            take: 1,
          },
        },
      },

      coupon: true,

      items: {
        include: {
          product:{
            include:{
              images:true
            }
          }
        },
      },
    },
  });

  if (!order) {
    return order;
  }

  try {
    const syncResult =
      await syncOrderPaymentStatus(
        order
      );

    if (syncResult?.order) {
      return prisma.order.findFirst({
        where: {
          OR: [
            {
              id:
                orderId,
            },
            {
              order_number:
                orderNumber,
            },
          ],
        },

        include: {
          contact: {
            include: {
              addresses: {
                orderBy: {
                  updated_at:
                    "desc",
                },
                take:
                  1,
              },
            },
          },

          coupon: true,

          items: {
            include: {
              product: {
                include: {
                  images:
                    true,
                },
              },
            },
          },
        },
      });
    }
  } catch (error) {
    console.error(
      "Erro ao sincronizar pagamento ao buscar pedido:",
      error
    );
  }

  return order;
}

interface Item {
  product_id: number;

  quantity: number;

  unit_price: number;
}

interface Props {
  id: number;

  status: string;

  subtotal: number;

  shipping: number;

  discount: number;

  total: number;

  items: Item[];

  shipping_deadline: string;

  shipping_method: string;

  shipping_price: number;
}

export async function updateOrderService({
  id,
  status,
  subtotal,
  shipping,
  discount,
  total,
  items,
  shipping_method,
  shipping_price,
  shipping_deadline
}: Props) {

  const previousOrder =
    await prisma.order.findUnique({
      where: {
        id,
      },
      select: {
        status: true,
      },
    });

  // UPDATE PEDIDO
  await prisma.order.update({
    where: {
      id,
    },

    data: {
      status,

      subtotal,

      shipping,

      discount,

      total,

      shipping_method,

      shipping_price,

      shipping_deadline,
    },
  });

  // REMOVE ITENS ANTIGOS
  await prisma.orderItem.deleteMany({
    where: {
      order_id: id,
    },
  });

  // RECRIA ITENS
  if (items.length) {

    await prisma.orderItem.createMany({
      data:
        items.map((item) => ({
          order_id: id,

          product_id:
            item.product_id,

          quantity:
            item.quantity,

          unit_price:
            item.unit_price,

          total:
            item.quantity *
            item.unit_price,
        })),
    });
  }

  const updatedOrder =
    await prisma.order.findUnique({
    where: {
      id,
    },

    include: {
      contact: true,

      coupon: true,

      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (
    previousOrder?.status !==
    status
  ) {
    void sendOrderStatusMovementEmail(
      id,
      status
    ).catch((error) => {
      console.error(
        "Erro ao disparar e-mail de movimentação do pedido:",
        error
      );
    });

    void sendOrderStatusUpdateWhatsApp(
      id,
      status
    ).catch((error) => {
      console.error(
        "Erro ao disparar WhatsApp de movimentação do pedido:",
        error
      );
    });
  }

  return updatedOrder;
}
