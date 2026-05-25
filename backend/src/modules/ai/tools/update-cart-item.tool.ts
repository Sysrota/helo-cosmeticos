import {
  prisma,
} from "../../../config/prisma.js";

interface Props {
  conversationId: number;
  productId: number;
  quantity: number;
}

export async function updateCartItemTool({
  conversationId,
  productId,
  quantity,
}: Props) {
  const normalizedQuantity =
    Math.max(0, Math.floor(Number(quantity)));

  if (!Number.isFinite(normalizedQuantity)) {
    throw new Error("Quantidade inválida");
  }

  const conversation =
    await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
    });

  if (!conversation) {
    throw new Error("Conversa não encontrada");
  }

  const cart: any =
    conversation.cart_json
      ? JSON.parse(JSON.stringify(conversation.cart_json))
      : {
        items: [],
        subtotal: 0,
        total: 0,
      };

  const existingItem =
    cart.items.find(
      (item: any) =>
        item.product_id === productId
    );

  if (!existingItem) {
    throw new Error("Produto não está no carrinho");
  }

  if (normalizedQuantity === 0) {
    cart.items =
      cart.items.filter(
        (item: any) =>
          item.product_id !== productId
      );
  } else {
    existingItem.quantity =
      normalizedQuantity;
  }

  cart.subtotal =
    cart.items.reduce(
      (total: number, item: any) =>
        total +
        Number(item.price) *
        Number(item.quantity),
      0
    );
  cart.total =
    cart.subtotal;

  await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      cart_json: cart,
      last_product_id:
        normalizedQuantity > 0
          ? productId
          : conversation.last_product_id,
    },
  });

  return cart;
}
