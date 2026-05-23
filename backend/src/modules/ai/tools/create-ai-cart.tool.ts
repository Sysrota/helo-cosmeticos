import { prisma }
  from "../../../config/prisma.js";

interface Props {
  conversationId: number;
}

export async function createAiCartTool({
  conversationId,
}: Props) {

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

  if (
    conversation.cart_json
  ) {

    return JSON.parse(
      JSON.stringify(
        conversation.cart_json
      )
    );
  }

  const emptyCart = {
    items: [],
    subtotal: 0,
    total: 0,
  };

  await prisma.conversation
    .update({
      where: {
        id: conversationId,
      },

      data: {
        cart_json:
          emptyCart,
      },
    });

  return emptyCart;
}