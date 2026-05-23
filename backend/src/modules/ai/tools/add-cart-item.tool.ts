import { prisma }
  from "../../../config/prisma.js";

interface Props {
  conversationId: number;
  productId: number;
  quantity?: number;
}

export async function addCartItemTool({
  conversationId,
  productId,
  quantity = 1,
}: Props) {

  const product =
    await prisma.product
      .findUnique({
        where: {
          id: productId,
        },
      });

  if (!product) {
    throw new Error(
      "Produto não encontrado"
    );
  }

  const conversation =
    await prisma.conversation
      .findUnique({
        where: {
          id: conversationId,
        },
      });

  if (!conversation) {
    throw new Error(
      "Conversa não encontrada"
    );
  }

  let cart: any = {
    items: [],
    subtotal: 0,
    total: 0,
  };

  if (
    conversation.cart_json
  ) {

    cart =
      JSON.parse(
        JSON.stringify(
          conversation.cart_json
        )
      );
  }

  const existingItem =
    cart.items.find(
      (item: any) =>
        item.product_id ===
        product.id
    );

  if (existingItem) {

    existingItem.quantity +=
      quantity;

  } else {

  cart.items.push({

    id:
      product.id,

    product_id:
      product.id,

    title:
      product.title,


    image:
      product.image_url,

    price:
      Number(product.price),

    quantity,

  });
  }

  cart.subtotal =
    cart.items.reduce(
      (
        total: number,
        item: any
      ) => {

        return (
          total +
          item.price *
            item.quantity
        );
      },
      0
    );

  cart.total =
    cart.subtotal;

  await prisma.conversation
    .update({
      where: {
        id: conversationId,
      },

      data: {
        cart_json: cart,
        last_product_id:
          product.id,
      },
    });

  return cart;
}