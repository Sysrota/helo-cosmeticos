import {
  prisma,
} from "../../../config/prisma.js";

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

  const previousOrder =
    conversation.last_order_id
      ? await prisma.order.findUnique({
        where: {
          id:
            conversation.last_order_id,
        },
      })
      : null;

  const canUpdateOrder =
    previousOrder?.status === "pending" &&
    previousOrder?.payment_status === "pending" &&
    !previousOrder?.mercado_pago_payment_id &&
    !previousOrder?.pix_code;

  const order =
    canUpdateOrder && previousOrder
      ? await prisma.$transaction(
        async (transaction) => {
          await transaction.orderItem.deleteMany({
            where: {
              order_id:
                previousOrder.id,
            },
          });

          return transaction.order.update({
            where: {
              id:
                previousOrder.id,
            },
            data: {
              subtotal,
              shipping:
                0,
              discount:
                0,
              total:
                subtotal,
              shipping_method:
                null,
              shipping_price:
                0,
              shipping_deadline:
                null,
              items: {
                create:
                  items,
              },
            },
          });
        }
      )
      : await prisma.order.create({

        data: {

          contact_id:
            contact.id,

          subtotal,

          total:
            subtotal,

          status:
            "pending",

          payment_status:
            "pending",

          items: {

            create:
              items,
          },
        },
      });

  // =====================
  // URL
  // =====================

  const url =
    `${process.env.FRONTEND_URL}/checkout/${order.id}`;

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

  return {
    url,
    order_id:
      order.id,
  };
}
