import {
  prisma,
} from "../../../config/prisma.js";

import {
  findAddressByCep,
  getLocalShippingOptions,
  requestShippingOptions,
} from "../../shipping/shipping.service.js";
import {
  getCommercialPolicy,
} from "../../store-config/store-config.service.js";
import {
  rememberCartShippingAddress,
  rememberCartShippingQuote,
} from "./cart-shipping-state.js";
import {
  ensureCartItemTool,
} from "./add-cart-item.tool.js";

interface Props {
  conversationId: number;
  cep?: string;
}

export async function calculateShippingTool({
  conversationId,
  cep,
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
      });

  if (!conversation) {

    throw new Error(
      "Conversa não encontrada"
    );
  }

  // =========================
  // VALIDATE CEP
  // =========================

  const providedCep =
    typeof cep === "string" &&
    cep.trim().length > 0;
  let cleanCep =
    providedCep
      ? cep.replace(/\D/g, "")
      : "";

  if (
    providedCep &&
    cleanCep.length !== 8
  ) {

    return {
      policy:
        "invalid_zipcode",
      message:
        "O CEP informado é inválido. Solicite ao cliente um CEP válido com 8 números.",
    };
  }

  if (!providedCep) {
    const savedAddress =
      await prisma.contactAddress.findFirst({
        where: {
          contact_id:
            conversation.contact_id,
        },
        orderBy: {
          updated_at:
            "desc",
        },
      });

    cleanCep =
      savedAddress?.cep
        ?.replace(/\D/g, "") ||
      "";
  }

  if (
    cleanCep.length !== 8
  ) {
    return {
      policy:
        "zipcode_required",
      message:
        "Ainda não há CEP salvo para este cliente. Solicite um CEP válido com 8 números para calcular o frete.",
    };
  }

  // =========================
  // CART
  // =========================

  let cart: any =
    conversation.cart_json
      ? JSON.parse(
        JSON.stringify(
          conversation.cart_json
        )
      )
      : null;

  if (
    !cart ||
    !cart.items?.length
  ) {
    if (conversation.last_product_id) {
      const ensuredCart =
        await ensureCartItemTool({
          conversationId,
          productId:
            conversation.last_product_id,
          quantity:
            1,
        });

      if (
        !("error" in ensuredCart) &&
        ensuredCart.items?.length
      ) {
        cart =
          ensuredCart;
      }
    }
  }

  if (
    !cart ||
    !cart.items?.length
  ) {

    return {
      policy:
        "cart_required",
      message:
        "Antes de calcular o frete, confirme qual produto deve entrar no pedido.",
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
  const localOptions =
    getLocalShippingOptions(
      address,
      commercialPolicy.moto_uber_enabled,
      hasFreeShipping
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

    const options = [
      ...localOptions,
      ...carrierOptions,
    ];
    const policy =
      hasFreeShipping
        ? "free_shipping_threshold"
        : "calculated_shipping";
    const destination =
      `${address.city}/${address.state}`;

    rememberCartShippingQuote(
      cart,
      {
        cleanCep,
        address,
        destination,
        policy,
        options,
        subtotal:
          total,
        freeShippingMinimum:
          commercialPolicy.free_shipping_minimum,
      }
    );

    await prisma.conversation.update({
      where: {
        id:
          conversationId,
      },
      data: {
        cart_json:
          cart,
      },
    });

    return {
      policy:
        policy,
      destination,
      free_shipping_minimum:
        commercialPolicy.free_shipping_minimum,
      options:
        options,
    };
  } catch (error) {
    if (localOptions.length) {
      const policy =
        "local_shipping_available";
      const destination =
        `${address.city}/${address.state}`;
      const options =
        localOptions;

      rememberCartShippingQuote(
        cart,
        {
          cleanCep,
          address,
          destination,
          policy,
          options,
          subtotal:
            total,
        }
      );

      await prisma.conversation.update({
        where: {
          id:
            conversationId,
        },
        data: {
          cart_json:
            cart,
        },
      });

      return {
        policy:
          policy,
        destination,
        options,
      };
    }

    rememberCartShippingAddress(
      cart,
      cleanCep,
      address
    );
    cart.shipping_needs_recalculation =
      true;
    cart.shipping_recalculation_reason =
      "shipping_unavailable";

    await prisma.conversation.update({
      where: {
        id:
          conversationId,
      },
      data: {
        cart_json:
          cart,
      },
    });

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
