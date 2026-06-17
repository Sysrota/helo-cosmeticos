import { prisma }
  from "../../../config/prisma.js";

import {
  getPrimaryProductImage,
} from "../services/product-image.service.js";

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
  const normalizedProductId =
    Number(productId);

  if (
    !Number.isInteger(
      normalizedProductId
    ) ||
    normalizedProductId <= 0
  ) {
    return {
      error:
        "product_not_found",
      message:
        "O produto solicitado não foi identificado. Pesquise novamente no catálogo e utilize somente o ID retornado por search_products.",
      requested_product_id:
        productId,
    };
  }

  if (
    !Number.isFinite(
      Number(quantity)
    )
  ) {
    throw new Error(
      "Quantidade inválida"
    );
  }

  const quantityToAdd =
    Math.max(
      1,
      Math.floor(
        Number(quantity)
      )
    );

  const product =
    await prisma.product
      .findFirst({
        where: {
          id:
            normalizedProductId,
          is_active:
            true,
        },

        include: {
          images: {
            orderBy: {
              sort_order: "asc",
            },
          },
        },
      });

  if (!product) {
    return {
      error:
        "product_not_found",
      message:
        "O produto solicitado não foi encontrado ou não está ativo. Pesquise novamente no catálogo e utilize somente o ID retornado por search_products.",
      requested_product_id:
        productId,
    };
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

    existingItem.quantity =
      Number(
        existingItem.quantity ||
        0
      ) +
      quantityToAdd;

  } else {

  cart.items.push({

    id:
      product.id,

    product_id:
      product.id,

    title:
      product.title,


    image:
      getPrimaryProductImage(
        product
      ),

    price:
      Number(product.price),

    quantity:
      quantityToAdd,

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
