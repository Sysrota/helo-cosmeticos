import axios from "axios";

import { prisma }
  from "../../config/prisma.js";

interface Props {
  cep: string;

  order_id: number;
}

interface ShippingOption {
  name: string;

  price: number;

  deadline: string;
}

export async function calculateShipping({
  cep,
  order_id,
}: Props): Promise<
  ShippingOption[]
> {

  const cleanCep =
    cep.replace(/\D/g, "");

  if (
    cleanCep.length !== 8
  ) {

    throw new Error(
      "CEP inválido"
    );
  }
  // VALIDA CEP
  const { data } =
    await axios.get(
      `https://viacep.com.br/ws/${cleanCep}/json/`
    );

    // console.log("Dados do CEP:", data);

  if (data.erro) {

    throw new Error(
      "CEP não encontrado"
    );
  }

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
              Number(
                order.total || 0
              ),

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

  // console.log(
  //   "Melhor Envio:",
  //   melhorEnvioResponse.data
  // );

  const shippingOptions =
    melhorEnvioResponse.data

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
    !shippingOptions.length
  ) {

    throw new Error(
      "Nenhuma transportadora disponível"
    );
  }

  return shippingOptions;
}