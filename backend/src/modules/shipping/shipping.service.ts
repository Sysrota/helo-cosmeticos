import axios from "axios";

import { prisma }
  from "../../config/prisma.js";

interface Props {
  cep: string;

  order_id: number;
}

interface ProductShippingProps {
  cep: string;

  product_id: number;

  quantity: number;
}

interface ShippingOption {
  name: string;

  price: number;

  deadline: string;

  original_price?: number;

  discount?: number;
}

interface ShippingPackage {
  cleanCep: string;

  totalWeight: number;

  maxHeight: number;

  maxWidth: number;

  totalLength: number;

  insuranceValue: number;
}

const FREE_SHIPPING_CITIES = new Set([
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

const SHIPPING_SUBSIDY = 25;

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

function isFreeShippingArea(
  address: {
    city: string;
    state: string;
  }
) {
  return (
    normalizeLocation(
      address.state
    ) === "go" &&
    FREE_SHIPPING_CITIES.has(
      normalizeLocation(
        address.city
      )
    )
  );
}

function localFreeShippingOption():
  ShippingOption[] {
  return [
    {
      name:
        "Frete grátis local",
      price:
        0,
      deadline:
        "Entrega em até 2 dias",
    },
  ];
}

function applyShippingSubsidy(
  option: ShippingOption
): ShippingOption {
  const originalPrice =
    Number(
      option.price
    );
  const price =
    Number(
      Math.max(
        0,
        originalPrice -
        SHIPPING_SUBSIDY
      ).toFixed(2)
    );

  return {
    ...option,
    price,
    original_price:
      originalPrice,
    discount:
      Number(
        (
          originalPrice -
          price
        ).toFixed(2)
      ),
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

async function requestShippingOptions({
  cleanCep,
  totalWeight,
  maxHeight,
  maxWidth,
  totalLength,
  insuranceValue,
}: ShippingPackage): Promise<
  ShippingOption[]
> {

  const melhorEnvioResponse =
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

  const shippingOptions =
    melhorEnvioResponse.data

      .filter(
        (service: any) =>
          !service.error
      )

      .map(
        (service: any) =>
          applyShippingSubsidy({
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

  if (
    isFreeShippingArea(
      address
    )
  ) {
    return localFreeShippingOption();
  }

  return requestShippingOptions({
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
      Number(
        product.price || 0
      ) * safeQuantity,
  });
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

  if (
    isFreeShippingArea(
      address
    )
  ) {
    return localFreeShippingOption();
  }


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


  return requestShippingOptions({
    cleanCep,
    totalWeight,
    maxHeight,
    maxWidth,
    totalLength,
    insuranceValue:
      Number(
        order.total || 0
      ),
  });
}
