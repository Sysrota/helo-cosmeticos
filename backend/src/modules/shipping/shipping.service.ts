import axios from "axios";

import { prisma }
  from "../../config/prisma.js";
import {
  getCommercialPolicy,
} from "../store-config/store-config.service.js";

interface Props {
  cep: string;

  order_id: number;
}

interface ProductShippingProps {
  cep: string;

  product_id: number;

  quantity: number;
}

export interface ShippingOption {
  name: string;

  price: number;

  deadline: string;

  original_price?: number;

  discount?: number;

  payment_on_delivery?: boolean;

  external_payment?: boolean;
}

interface ShippingPackage {
  cleanCep: string;

  totalWeight: number;

  maxHeight: number;

  maxWidth: number;

  totalLength: number;

  insuranceValue: number;

  freeShipping?: boolean;
}

const MOTO_UBER_CITIES = new Set([
  "abadia de goias",
  "aparecida de goiania",
  "aragoiania",
  "bela vista de goias",
  "bonfinopolis",
  "brazabrantes",
  "caldazinha",
  "caturai",
  "goianapolis",
  "goiania",
  "goianira",
  "guapo",
  "hidrolandia",
  "inhumas",
  "neropolis",
  "nova veneza",
  "santa barbara de goias",
  "santo antonio de goias",
  "senador canedo",
  "terezopolis de goias",
  "trindade",
]);

function normalizeLocation(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

export function getMotoUberShippingOption(
  address: {
    city: string;
    state: string;
  },
  enabled: boolean
): ShippingOption | null {
  const isCovered =
    normalizeLocation(address.state) === "go" &&
    MOTO_UBER_CITIES.has(
      normalizeLocation(address.city)
    );

  if (
    !enabled ||
    !isCovered
  ) {
    return null;
  }

  return {
    name:
      "Moto Uber - pagamento pelo cliente",
    price:
      0,
    deadline:
      "Entrega rápida local",
    payment_on_delivery:
      true,
    external_payment:
      true,
  };
}

function applyFreeShipping(
  freeShipping: boolean,
  option: ShippingOption
): ShippingOption {
  const originalPrice =
    Number(
      option.price
    );
  const price =
    freeShipping
      ? 0
      : originalPrice;

  return {
    ...option,
    price,
    original_price:
      originalPrice,
    discount:
      freeShipping
        ? originalPrice
        : 0,
  };
}

export async function findAddressByCep(
  cep: string
) {

  const cleanCep =
    cep.replace(/\D/g, "");

  if (
    cleanCep.length !== 8
  ) {

    throw new Error(
      "CEP inválido"
    );
  }

  const { data } =
    await axios.get(
      `https://viacep.com.br/ws/${cleanCep}/json/`
    );

  if (data.erro) {

    throw new Error(
      "CEP não encontrado"
    );
  }

  return {
    zipcode:
      data.cep || cep,
    street:
      data.logradouro || "",
    district:
      data.bairro || "",
    city:
      data.localidade || "",
    state:
      data.uf || "",
  };
}

export async function requestShippingOptions({
  cleanCep,
  totalWeight,
  maxHeight,
  maxWidth,
  totalLength,
  insuranceValue,
  freeShipping = false,
}: ShippingPackage): Promise<
  ShippingOption[]
> {

  let melhorEnvioResponse;

  try {
    melhorEnvioResponse =
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
              insuranceValue,

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
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Melhor Envio recusou o cálculo de frete:",
        {
          status:
            error.response?.status,
          destination:
            cleanCep,
          response:
            error.response?.data,
        }
      );

      throw new Error(
        "Não foi possível consultar o frete no Melhor Envio."
      );
    }

    throw error;
  }

  const shippingOptions =
    melhorEnvioResponse.data

      .filter(
        (service: any) =>
          !service.error
      )

      .map(
        (service: any) =>
          applyFreeShipping(freeShipping, {
            name:
              service.name,

            price:
              Number(
                service.price
              ),

            deadline:
              `${service.delivery_time} dias úteis`,
          })
      )

      .sort(
        (
          first: ShippingOption,
          second: ShippingOption
        ) =>
          first.price -
            second.price
      );

  if (
    !shippingOptions.length
  ) {

    throw new Error(
      "Nenhuma transportadora disponível"
    );
  }

  return shippingOptions;
}

export async function calculateProductShipping({
  cep,
  product_id,
  quantity,
}: ProductShippingProps): Promise<
  ShippingOption[]
> {

  const cleanCep =
    cep.replace(/\D/g, "");

  const address =
    await findAddressByCep(
    cleanCep
  );

  const product =
    await prisma.product.findUnique({
      where: {
        id: product_id,
      },
    });

  if (
    !product ||
    product.is_active === false
  ) {

    throw new Error(
      "Produto indisponível"
    );
  }

  const safeQuantity =
    Math.min(
      99,
      Math.max(
        1,
        Math.floor(
          Number(quantity) || 1
        )
      )
    );

  const policy =
    await getCommercialPolicy();
  const subtotal =
    Number(product.price || 0) *
    safeQuantity;

  const motoUberOption =
    getMotoUberShippingOption(
      address,
      policy.moto_uber_enabled
    );

  try {
    const carrierOptions =
      await requestShippingOptions({
        cleanCep,
        totalWeight:
          Number(
            product.weight || 0
          ) * safeQuantity,
        maxHeight:
          Number(
            product.height || 1
          ),
        maxWidth:
          Number(
            product.width || 1
          ),
        totalLength:
          Number(
            product.length || 1
          ) * safeQuantity,
        insuranceValue:
          subtotal,
        freeShipping:
          subtotal >
          policy.free_shipping_minimum,
      });

    return motoUberOption
      ? [
        ...carrierOptions,
        motoUberOption,
      ]
      : carrierOptions;
  } catch (error) {
    if (motoUberOption) {
      return [
        motoUberOption,
      ];
    }

    throw error;
  }
}

export async function calculateShipping({
  cep,
  order_id,
}: Props): Promise<
  ShippingOption[]
> {

  const cleanCep =
    cep.replace(/\D/g, "");

  const address =
    await findAddressByCep(
    cleanCep
  );

  // BUSCA PEDIDO
  const order =
    await prisma.order.findUnique({
      where: {
        id: order_id,
      },

      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });


  if (!order) {

    throw new Error(
      "Pedido não encontrado"
    );
  }

  // SEM PRODUTOS
  if (
    !order.items.length
  ) {

    throw new Error(
      "Por favor, informe pelo menos um produto para calcular o frete"
    );
  }

  const policy =
    await getCommercialPolicy();
  const motoUberOption =
    getMotoUberShippingOption(
      address,
      policy.moto_uber_enabled
    );


  // PESO TOTAL
  const totalWeight =
    order.items.reduce(
      (total, item) => {

        return (
          total +
          (
            Number(
              item.product
                ?.weight || 0
            ) *
            item.quantity
          )
        );

      },
      0
    );

    // console.log("Peso total:", totalWeight);
  // ALTURA
  const maxHeight =
    Math.max(
      ...order.items.map(
        (item) =>
          Number(
            item.product
              ?.height || 1
          )
      )
    );

    // console.log("Altura máxima:", maxHeight);

  // LARGURA
  const maxWidth =
    Math.max(
      ...order.items.map(
        (item) =>
          Number(
            item.product
              ?.width || 1
          )
      )
    );

    // console.log("Largura máxima:", maxWidth);
  // COMPRIMENTO
  const totalLength =
    order.items.reduce(
      (total, item) => {

        return (
          total +
          Number(
            item.product
              ?.length || 1
          )
        );

      },
      0
    );

  // console.log({
  //   totalWeight,
  //   maxHeight,
  //   maxWidth,
  //   totalLength,
  // });


  try {
    const carrierOptions =
      await requestShippingOptions({
        cleanCep,
        totalWeight,
        maxHeight,
        maxWidth,
        totalLength,
        insuranceValue:
          Number(
            order.subtotal || 0
          ),
        freeShipping:
          Number(order.subtotal || 0) >
          policy.free_shipping_minimum,
      });

    return motoUberOption
      ? [
        ...carrierOptions,
        motoUberOption,
      ]
      : carrierOptions;
  } catch (error) {
    if (motoUberOption) {
      return [
        motoUberOption,
      ];
    }

    throw error;
  }
}
