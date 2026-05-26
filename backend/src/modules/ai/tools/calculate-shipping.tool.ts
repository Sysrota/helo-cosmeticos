import {
  prisma,
} from "../../../config/prisma.js";

import {
  findAddressByCep,
  getMotoUberShippingOption,
  requestShippingOptions,
} from "../../shipping/shipping.service.js";
import {
  getCommercialPolicy,
} from "../../store-config/store-config.service.js";

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

  const existingAddress =
    await prisma.contactAddress.findFirst({
      where: {
        contact_id:
          conversation.contact_id,
      },
    });

  const keepsExistingNumber =
    existingAddress?.cep
      ?.replace(/\D/g, "") ===
    cleanCep;

  const addressData = {
    cep:
      address.zipcode,
    street:
      address.street,
    district:
      address.district,
    city:
      address.city,
    state:
      address.state,
    number:
      keepsExistingNumber
        ? existingAddress?.number
        : "",
  };

  await prisma.$transaction([
    prisma.contact.update({
      where: {
        id:
          conversation.contact_id,
      },
      data: {
        city:
          address.city,
        state:
          address.state,
      },
    }),
    existingAddress
      ? prisma.contactAddress.update({
        where: {
          id:
            existingAddress.id,
        },
        data:
          addressData,
      })
      : prisma.contactAddress.create({
        data: {
          contact_id:
            conversation.contact_id,
          ...addressData,
        },
      }),
  ]);

  const commercialPolicy =
    await getCommercialPolicy();
  const hasFreeShipping =
    total >
    commercialPolicy.free_shipping_minimum;
  const motoUberOption =
    getMotoUberShippingOption(
      address,
      commercialPolicy.moto_uber_enabled
    );

  try {
    const carrierOptions =
      await requestShippingOptions({
        cleanCep,
        totalWeight,
        maxHeight,
        maxWidth,
        totalLength,
        insuranceValue:
          total,
        freeShipping:
          hasFreeShipping,
      });

    return {
      policy:
        hasFreeShipping
          ? "free_shipping_threshold"
          : "calculated_shipping",
      destination:
        `${address.city}/${address.state}`,
      free_shipping_minimum:
        commercialPolicy.free_shipping_minimum,
      options:
        motoUberOption
          ? [
            ...carrierOptions,
            motoUberOption,
          ]
          : carrierOptions,
    };
  } catch (error) {
    if (motoUberOption) {
      return {
        policy:
          "moto_uber_available",
        destination:
          `${address.city}/${address.state}`,
        options: [
          motoUberOption,
        ],
      };
    }

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
