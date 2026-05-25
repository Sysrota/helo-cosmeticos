import {
  prisma,
} from "../../../config/prisma.js";

import {
  findAddressByCep,
  isFreeShippingArea,
  localFreeShippingOption,
  requestShippingOptions,
} from "../../shipping/shipping.service.js";

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

    return {
      policy:
        "invalid_zipcode",
      message:
        "O CEP informado é inválido. Solicite ao cliente um CEP válido com 8 números.",
    };
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
  // OFFICIAL SHIPPING POLICY
  // =========================

  let address;

  try {
    address =
      await findAddressByCep(
        cleanCep
      );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message ===
        "CEP inválido" ||
      message ===
        "CEP não encontrado"
    ) {
      return {
        policy:
          "invalid_zipcode",
        message:
          "O CEP informado não foi encontrado. Solicite ao cliente que confira e envie um CEP válido com 8 números.",
      };
    }

    console.error(
      "Erro ao consultar CEP solicitado pela IA:",
      message || error
    );

    return {
      policy:
        "address_unavailable",
      message:
        "A consulta do CEP não está disponível no momento. Solicite ao cliente que tente novamente em instantes ou calcule o frete no checkout.",
    };
  }

  if (
    isFreeShippingArea(
      address
    )
  ) {
    return {
      policy:
        "local_free_shipping",
      destination:
        `${address.city}/${address.state}`,
      options:
        localFreeShippingOption(),
    };
  }

  try {
    return {
      policy:
        "shipping_subsidy",
      destination:
        `${address.city}/${address.state}`,
      subsidy:
        25,
      options:
        await requestShippingOptions({
          cleanCep,
          totalWeight,
          maxHeight,
          maxWidth,
          totalLength,
          insuranceValue:
            total,
        }),
    };
  } catch (error) {
    console.error(
      "Erro ao calcular frete solicitado pela IA:",
      error instanceof Error
        ? error.message
        : error
    );

    return {
      policy:
        "shipping_unavailable",
      destination:
        `${address.city}/${address.state}`,
      message:
        "Não foi possível consultar o frete agora. O cliente pode continuar para o checkout e tentar o cálculo novamente na etapa de entrega.",
    };
  }
}
