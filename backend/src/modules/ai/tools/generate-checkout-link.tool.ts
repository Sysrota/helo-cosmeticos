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
  // CREATE ORDER
  // =====================

  const order =
    await prisma.order.create({

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

  return {
    url,
    order_id:
      order.id,
  };
}