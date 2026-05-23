import axios
  from "axios";

import {
  prisma,
} from "../../../config/prisma.js";

interface Props {
  conversationId: number;
  cep: string;
}

export async function calculateShippingTool({
  conversationId,
  cep,
}: Props) {

  // =========================
  // VALIDATE CEP
  // =========================

  const cleanCep =
    cep.replace(/\D/g, "");

  if (
    cleanCep.length !== 8
  ) {

    throw new Error(
      "CEP inválido"
    );
  }

  // =========================
  // CONVERSATION
  // =========================

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

  // =========================
  // CART
  // =========================

  const cart: any =
    conversation.cart_json;

  if (
    !cart ||
    !cart.items?.length
  ) {

    return {
      error:
        "Carrinho vazio",
    };
  }

  // =========================
  // PRODUCTS
  // =========================

  const products =
    await prisma.product
      .findMany({

        where: {

          id: {

            in:
              cart.items.map(
                (item: any) =>
                  item.product_id
              ),
          },
        },
      });

  // =========================
  // DIMENSIONS
  // =========================

  const totalWeight =
    cart.items.reduce(
      (
        total: number,
        item: any
      ) => {

        const product =
          products.find(
            (p) =>
              p.id ===
              item.product_id
          );

        return (
          total +
          (
            Number(
              product?.weight || 0
            ) *
            item.quantity
          )
        );
      },
      0
    );

  const maxHeight =
    Math.max(
      ...products.map(
        (product) =>
          Number(
            product.height || 1
          )
      )
    );

  const maxWidth =
    Math.max(
      ...products.map(
        (product) =>
          Number(
            product.width || 1
          )
      )
    );

  const totalLength =
    products.reduce(
      (total, product) => {

        return (
          total +
          Number(
            product.length || 1
          )
        );
      },
      0
    );

  // =========================
  // TOTAL
  // =========================

  const total =
    cart.items.reduce(
      (
        total: number,
        item: any
      ) => {

        return (
          total +
          (
            Number(item.price) *
            Number(item.quantity)
          )
        );
      },
      0
    );

  // =========================
  // MELHOR ENVIO
  // =========================

  const response =
    await axios.post(

      "https://www.melhorenvio.com.br/api/v2/me/shipment/calculate",

      {

        from: {
          postal_code:
            "74976040",
        },

        to: {
          postal_code:
            cleanCep,
        },

        products: [
          {
            id: "1",

            width:
              Math.max(
                maxWidth,
                11
              ),

            height:
              Math.max(
                maxHeight,
                2
              ),

            length:
              Math.max(
                totalLength,
                16
              ),

            weight:
              Math.max(
                totalWeight,
                0.3
              ),

            insurance_value:
              total,

            quantity: 1,
          },
        ],

        options: {

          receipt: false,

          own_hand: false,
        },
      },

      {
        headers: {

          Authorization:
            `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,

          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          "User-Agent":
            "HeloCosmeticos",
        },
      }
    );

  // =========================
  // FORMAT
  // =========================

  const shipping =
    response.data

      .filter(
        (service: any) =>
          !service.error
      )

      .map(
        (service: any) => ({

          name:
            service.name,

          price:
            Number(
              service.price
            ),

          deadline:
            `${service.delivery_time} dias úteis`,
        })
      );

  if (
    !shipping.length
  ) {

    throw new Error(
      "Nenhuma transportadora disponível"
    );
  }

  return shipping;
}