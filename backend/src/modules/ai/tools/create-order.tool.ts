import {
  prisma,
} from "../../../config/prisma.js";

interface Props {
  conversationId: number;
}

export async function createOrderTool({
  conversationId,
}: Props) {

  // =========================
  // CONVERSATION
  // =========================

  const conversation =
    await prisma.conversation
      .findUnique({
        where: {
          id: conversationId,
        },

        include: {
          contact: true,
        },
      });

  if (!conversation) {

    throw new Error(
      "Conversa não encontrada"
    );
  }

  // =========================
  // CART
  // =========================

  const cart: any =
    conversation.cart_json;

  if (
    !cart ||
    !cart.items ||
    !cart.items.length
  ) {

    throw new Error(
      "Carrinho vazio"
    );
  }

  // =========================
  // CONTACT
  // =========================

  if (
    !conversation.contact
  ) {

    throw new Error(
      "Contato não encontrado"
    );
  }

  // =========================
  // CREATE ORDER
  // =========================

  const order =
    await prisma.order
      .create({

        data: {

          contact: {
            connect: {
              id:
                conversation.contact.id,
            },
          },

          subtotal:
            Number(cart.subtotal),

          total:
            Number(cart.total),

          status:
            "pending",

          payment_status:
            "pending",

          payment_method:
            "pix",

          items: {

            create:
              cart.items.map(
                (item: any) => ({

                  product_id:
                    item.product_id,

                  quantity:
                    item.quantity,

                  unit_price:
                    Number(item.price),

                  total:
                    Number(item.price) *
                    Number(item.quantity),
                })
              ),
          },
        },

        include: {
          items: true,
        },
      });

  // =========================
  // UPDATE CONVERSATION
  // =========================

  await prisma.conversation
    .update({
      where: {
        id: conversationId,
      },

      data: {

        ai_stage:
          "checkout",
      },
    });

  return order;
}