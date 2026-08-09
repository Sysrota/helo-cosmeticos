import {
  prisma,
} from "../../../config/prisma.js";
import {
  notifyManagersAboutOrder,
} from "../../manager/manager-notification.service.js";
import {
  getOrderDisplayNumber,
  generateOrderNumber,
} from "../../order/order-number.service.js";
import {
  applyCouponToOrderService,
} from "../../coupons/coupons.service.js";

interface Props {

  conversationId:
    number;
}

export async function generateCheckoutLinkTool({
  conversationId,
}: Props) {

  // =====================
  // CONVERSATION
  // =====================

  const conversation =
    await prisma.conversation
      .findUnique({

        where: {
          id:
            conversationId,
        },
        include:{
          contact:true
        }
      });

  if (!conversation) {

    throw new Error(
      "Conversa não encontrada"
    );
  }

  // =====================
  // CART
  // =====================

  const cart =
    conversation.cart_json as any;

  if (
    !cart?.items?.length
  ) {

    throw new Error(
      "Carrinho vazio"
    );
  }

  // =====================
  // CONTACT
  // =====================

  let contact =
    await prisma.contact.findFirst({

      where: {

        phone:
          conversation.contact.phone,
      },
    });

  // =====================
  // CREATE CONTACT
  // =====================

  if (!contact) {

    contact =
      await prisma.contact.create({

        data: {

          name:
            conversation.customer_name ||
            "Cliente",

          phone:
            conversation.contact.phone,
        },
      });
  }

  // =====================
  // PRODUCTS
  // =====================

  const productIds =
    cart.items.map(
      (item: any) =>
        item.product_id
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

  // =====================
  // ITEMS
  // =====================

  let subtotal = 0;

  const items =
    cart.items.map(
      (item: any) => {

        const product =
          products.find(
            (p) =>
              p.id ===
              item.product_id
          );

        const quantity =
          Number(
            item.quantity || 1
          );

        const unit_price =
          Number(
            product?.price || 0
          );

        const total =
          quantity *
          unit_price;

        subtotal += total;

        return {

          product_id:
            item.product_id,

          quantity,

          unit_price,

          total,
        };
      }
    );

  // =====================
  // CREATE OR UPDATE PENDING ORDER
  // =====================

  const cartProductIds = [...new Set(
    items.map((item) => Number(item.product_id))
  )].sort((first, second) => first - second);

  const { order, reusedOrder } = await prisma.$transaction(
    async (transaction) => {
      // Serializa checkouts do mesmo contato para impedir que dois jobs
      // simultâneos criem pedidos pendentes duplicados.
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(${contact.id})
      `;

      const pendingOrders = await transaction.order.findMany({
        where: {
          contact_id: contact.id,
          status: "pending",
          payment_status: "pending",
          mercado_pago_payment_id: null,
          pix_code: null,
        },
        include: {
          items: {
            select: {
              product_id: true,
            },
          },
        },
        orderBy: {
          updated_at: "desc",
        },
        take: 20,
      });

      const compatibleOrders = pendingOrders.filter((pendingOrder) => {
        const pendingProductIds = [...new Set(
          pendingOrder.items.map((item) => Number(item.product_id))
        )].sort((first, second) => first - second);

        return (
          pendingProductIds.length === cartProductIds.length &&
          pendingProductIds.every(
            (productId, index) => productId === cartProductIds[index]
          )
        );
      });
      const previousOrder =
        compatibleOrders.find(
          (pendingOrder) => pendingOrder.id === conversation.last_order_id
        ) || compatibleOrders[0];

      if (previousOrder) {
        await transaction.orderItem.deleteMany({
          where: { order_id: previousOrder.id },
        });

        const updatedOrder = await transaction.order.update({
          where: { id: previousOrder.id },
          data: {
            subtotal,
            shipping: 0,
            discount: 0,
            coupon_id: null,
            coupon_code: null,
            coupon_discount: 0,
            payment_discount: 0,
            total: subtotal,
            shipping_method: null,
            shipping_price: 0,
            shipping_deadline: null,
            items: { create: items },
          },
        });

        return {
          order: updatedOrder,
          reusedOrder: true,
        };
      }

      const orderNumber = await generateOrderNumber(transaction);
      const createdOrder = await transaction.order.create({
        data: {
          order_number: orderNumber,
          contact_id: contact.id,
          subtotal,
          total: subtotal,
          status: "pending",
          payment_status: "pending",
          items: { create: items },
        },
      });

      return {
        order: createdOrder,
        reusedOrder: false,
      };
    }
  );

  if (cart.coupon_code) {
    await applyCouponToOrderService(
      order.id,
      String(cart.coupon_code)
    );
  }

  // =====================
  // URL
  // =====================

  const url =
    `${process.env.FRONTEND_URL}/checkout/${getOrderDisplayNumber(order)}`;

  await prisma.conversation.update({
    where: {
      id:
        conversationId,
    },
    data: {
      ai_stage:
        "checkout",
      checkout_url:
        url,
      last_order_id:
      order.id,
    },
  });

  void notifyManagersAboutOrder(
    order.id,
    "order_created",
    reusedOrder
      ? "Pedido atualizado pela IA no WhatsApp."
      : "Pedido criado pela IA no WhatsApp."
  ).catch((error) => {
    console.error(
      "Erro ao notificar gestores sobre pedido da IA:",
      error
    );
  });

  return {
    url,
    order_id:
      order.id,
  };
}
