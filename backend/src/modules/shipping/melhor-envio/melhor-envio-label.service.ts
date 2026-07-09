import axios from "axios";

import {
  prisma,
} from "../../../config/prisma.js";
import {
  io,
} from "../../../websocket/socket.js";

function digits(value?: string | null) {
  return String(value || "")
    .replace(/\D/g, "");
}

function requiredEnv(name: string) {
  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `Configuração ausente: ${name}`
    );
  }

  return value;
}

function optionalEnv(name: string) {
  return process.env[name] || "";
}

function melhorEnvioBaseUrl() {
  return (
    process.env.MELHOR_ENVIO_API_BASE_URL ||
    "https://www.melhorenvio.com.br/api/v2/me"
  ).replace(/\/$/, "");
}

function melhorEnvioHeaders() {
  return {
    Authorization:
      `Bearer ${requiredEnv("MELHOR_ENVIO_TOKEN")}`,
    Accept:
      "application/json",
    "Content-Type":
      "application/json",
    "User-Agent":
      process.env.MELHOR_ENVIO_USER_AGENT ||
      "HeloCosmeticos ([email protected])",
  };
}

function getNestedId(value: any): string | null {
  const candidates = [
    value?.id,
    value?.data?.id,
    value?.order?.id,
    value?.data?.order?.id,
    value?.orders?.[0]?.id,
    value?.data?.orders?.[0]?.id,
  ];

  return candidates
    .map((candidate) =>
      candidate ? String(candidate) : ""
    )
    .find(Boolean) || null;
}

function getNestedProtocol(value: any): string | null {
  const candidates = [
    value?.protocol,
    value?.data?.protocol,
    value?.order?.protocol,
    value?.data?.order?.protocol,
    value?.orders?.[0]?.protocol,
    value?.data?.orders?.[0]?.protocol,
  ];

  return candidates
    .map((candidate) =>
      candidate ? String(candidate) : ""
    )
    .find(Boolean) || null;
}

function getNestedTrackingCode(value: any): string | null {
  const candidates = [
    value?.tracking,
    value?.self_tracking,
    value?.data?.tracking,
    value?.data?.self_tracking,
    value?.order?.tracking,
    value?.order?.self_tracking,
    value?.orders?.[0]?.tracking,
    value?.orders?.[0]?.self_tracking,
    value?.data?.orders?.[0]?.tracking,
    value?.data?.orders?.[0]?.self_tracking,
  ];

  return candidates
    .map((candidate) =>
      candidate ? String(candidate) : ""
    )
    .find(Boolean) || null;
}

function getNestedTrackingUrl(value: any): string | null {
  const candidates = [
    value?.tracking_url,
    value?.data?.tracking_url,
    value?.order?.tracking_url,
    value?.orders?.[0]?.tracking_url,
    value?.data?.orders?.[0]?.tracking_url,
  ];

  return candidates
    .map((candidate) =>
      candidate ? String(candidate) : ""
    )
    .find(Boolean) || null;
}

function findUrl(value: any): string | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === "string" &&
    /^https?:\/\//i.test(value)
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found =
        findUrl(item);

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (typeof value === "object") {
    for (const key of [
      "url",
      "print_url",
      "link",
      "href",
    ]) {
      const found =
        findUrl(value[key]);

      if (found) {
        return found;
      }
    }

    for (const item of Object.values(value)) {
      const found =
        findUrl(item);

      if (found) {
        return found;
      }
    }
  }

  return null;
}

function ensureCanGenerateLabel(order: any) {
  if (order.melhor_envio_order_id) {
    throw new Error(
      "Este pedido já possui etiqueta do Melhor Envio."
    );
  }

  if (
    ![
      "paid",
      "approved",
    ].includes(
      String(order.payment_status || "")
    ) &&
    process.env.MELHOR_ENVIO_ALLOW_UNPAID_LABELS !== "true"
  ) {
    throw new Error(
      "Gere a etiqueta apenas após confirmação do pagamento."
    );
  }

  if (
    String(order.shipping_method || "")
      .startsWith("Moto Uber") ||
    String(order.shipping_method || "")
      .startsWith("Retirar")
  ) {
    throw new Error(
      "Este método de entrega não usa etiqueta do Melhor Envio."
    );
  }

}

function buildSender() {
  const companyDocument =
    digits(
      optionalEnv(
        "MELHOR_ENVIO_SENDER_COMPANY_DOCUMENT"
      )
    );
  const document =
    digits(
      optionalEnv(
        "MELHOR_ENVIO_SENDER_DOCUMENT"
      )
    );

  if (
    !companyDocument &&
    !document
  ) {
    throw new Error(
      "Configure MELHOR_ENVIO_SENDER_DOCUMENT ou MELHOR_ENVIO_SENDER_COMPANY_DOCUMENT."
    );
  }

  return {
    name:
      requiredEnv("MELHOR_ENVIO_SENDER_NAME"),
    email:
      requiredEnv("MELHOR_ENVIO_SENDER_EMAIL"),
    phone:
      digits(
        requiredEnv("MELHOR_ENVIO_SENDER_PHONE")
      ),
    ...(companyDocument
      ? {
          company_document:
            companyDocument,
          state_register:
            optionalEnv(
              "MELHOR_ENVIO_SENDER_STATE_REGISTER"
            ) || "ISENTO",
        }
      : {
          document,
          state_register:
            "ISENTO",
        }),
    address:
      requiredEnv("MELHOR_ENVIO_SENDER_ADDRESS"),
    complement:
      optionalEnv(
        "MELHOR_ENVIO_SENDER_COMPLEMENT"
      ),
    number:
      requiredEnv("MELHOR_ENVIO_SENDER_NUMBER"),
    district:
      requiredEnv("MELHOR_ENVIO_SENDER_DISTRICT"),
    city:
      requiredEnv("MELHOR_ENVIO_SENDER_CITY"),
    postal_code:
      digits(
        requiredEnv("MELHOR_ENVIO_SENDER_POSTAL_CODE")
      ),
    state_abbr:
      requiredEnv("MELHOR_ENVIO_SENDER_STATE")
        .toUpperCase(),
  };
}

function buildRecipient(order: any) {
  const address =
    order.contact?.addresses?.[0];

  if (!address) {
    throw new Error(
      "Pedido sem endereço de entrega."
    );
  }

  const document =
    digits(order.contact?.cpf);

  if (!document) {
    throw new Error(
      "Cliente sem CPF cadastrado. Informe o CPF antes de gerar a etiqueta."
    );
  }

  return {
    name:
      order.contact?.name ||
      "Cliente",
    email:
      order.contact?.email ||
      optionalEnv("MELHOR_ENVIO_FALLBACK_EMAIL") ||
      requiredEnv("MELHOR_ENVIO_SENDER_EMAIL"),
    phone:
      digits(order.contact?.phone),
    document,
    state_register:
      "ISENTO",
    address:
      address.street || "",
    complement:
      address.complement || "",
    number:
      address.number || "S/N",
    district:
      address.district || "",
    city:
      address.city || "",
    postal_code:
      digits(address.cep),
    country_id:
      "BR",
    state_abbr:
      String(address.state || "")
        .toUpperCase(),
  };
}

function buildProducts(order: any) {
  return order.items.map((item: any) => ({
    name:
      item.product?.title ||
      `Produto ${item.product_id}`,
    quantity:
      String(item.quantity || 1),
    unitary_value:
      Number(item.unit_price || 0)
        .toFixed(2),
  }));
}

function getPackageMetrics(order: any) {
  const totalWeight =
    order.items.reduce(
      (total: number, item: any) =>
        total +
        Number(item.product?.weight || 0) *
          Number(item.quantity || 1),
      0
    );
  const maxHeight =
    Math.max(
      ...order.items.map((item: any) =>
        Number(item.product?.height || 1)
      ),
      1
    );
  const maxWidth =
    Math.max(
      ...order.items.map((item: any) =>
        Number(item.product?.width || 1)
      ),
      1
    );
  const totalLength =
    order.items.reduce(
      (total: number, item: any) =>
        total +
        Number(item.product?.length || 1) *
          Number(item.quantity || 1),
      0
    );

  return {
    totalWeight,
    maxHeight,
    maxWidth,
    totalLength,
  };
}

function buildVolumes(order: any) {
  const {
    totalWeight,
    maxHeight,
    maxWidth,
    totalLength,
  } = getPackageMetrics(order);

  return [
    {
      height:
        Math.max(maxHeight, 2),
      width:
        Math.max(maxWidth, 11),
      length:
        Math.max(totalLength, 16),
      weight:
        Math.max(totalWeight, 0.3),
    },
  ];
}

async function resolveMelhorEnvioServiceId(order: any) {
  if (order.melhor_envio_service_id) {
    return Number(order.melhor_envio_service_id);
  }

  throw new Error(
    "Escolha uma transportadora do Melhor Envio, salve o pedido e gere a etiqueta novamente."
  );
}

function buildCartPayload(order: any, serviceId: number) {
  return {
    service:
      serviceId,
    from:
      buildSender(),
    to:
      buildRecipient(order),
    products:
      buildProducts(order),
    volumes:
      buildVolumes(order),
    options: {
      platform:
        "Helo Cosméticos",
      reminder:
        `Pedido #${order.order_number || order.id}`,
      insurance_value:
        Math.max(Number(order.subtotal || 0), 0),
      receipt:
        false,
      own_hand:
        false,
      reverse:
        false,
      tags: [
        {
          tag:
            `pedido-${order.order_number || order.id}`,
          url:
            `${process.env.FRONTEND_URL || ""}/pedido/${order.order_number || order.id}`,
        },
      ],
    },
  };
}

function formatAxiosError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const response =
      error.response?.data;

    return JSON.stringify(
      response || error.message
    );
  }

  return error instanceof Error
    ? error.message
    : "Erro desconhecido";
}

export async function generateMelhorEnvioLabel(
  orderId: number
) {
  const order =
    await prisma.order.findUnique({
      where: {
        id:
          orderId,
      },
      include: {
        contact: {
          include: {
            addresses: {
              orderBy: {
                updated_at:
                  "desc",
              },
              take:
                1,
            },
          },
        },
        coupon: true,
        items: {
          include: {
            product: true,
          },
        },
        shipping_events_list: {
          orderBy: {
            occurred_at:
              "desc",
          },
        },
      },
    });

  if (!order) {
    throw new Error(
      "Pedido não encontrado."
    );
  }

  ensureCanGenerateLabel(order);

  const serviceId =
    await resolveMelhorEnvioServiceId(order);
  const baseUrl =
    melhorEnvioBaseUrl();
  const headers =
    melhorEnvioHeaders();
  const cartPayload =
    buildCartPayload(
      order,
      serviceId
    );

  let cartResponse;
  let checkoutResponse;
  let generateResponse;
  let printResponse;

  try {
    cartResponse =
      await axios.post(
        `${baseUrl}/cart`,
        cartPayload,
        { headers }
      );

    const labelId =
      getNestedId(cartResponse.data);

    if (!labelId) {
      throw new Error(
        "Melhor Envio não retornou o ID da etiqueta."
      );
    }

    checkoutResponse =
      await axios.post(
        `${baseUrl}/shipment/checkout`,
        {
          orders: [
            labelId,
          ],
        },
        { headers }
      );

    generateResponse =
      await axios.post(
        `${baseUrl}/shipment/generate`,
        {
          orders: [
            labelId,
          ],
        },
        { headers }
      );

    printResponse =
      await axios.post(
        `${baseUrl}/shipment/print`,
        {
          mode:
            "public",
          orders: [
            labelId,
          ],
        },
        { headers }
      );

    const mergedResponse = {
      cart:
        cartResponse.data,
      checkout:
        checkoutResponse.data,
      generate:
        generateResponse.data,
      print:
        printResponse.data,
    };
    const protocol =
      getNestedProtocol(mergedResponse) ||
      getNestedProtocol(cartResponse.data);
    const trackingCode =
      getNestedTrackingCode(mergedResponse);
    const trackingUrl =
      getNestedTrackingUrl(mergedResponse);
    const printUrl =
      findUrl(printResponse.data);
    const occurredAt =
      new Date();

    await prisma.orderShippingEvent.upsert({
      where: {
        order_id_event_occurred_at: {
          order_id:
          order.id,
          event:
            "order.generated",
          occurred_at:
            occurredAt,
        },
      },
      update: {
        status:
          "generated",
        title:
          "Etiqueta gerada",
        description:
          "A etiqueta foi gerada pelo sistema.",
        tracking_code:
          trackingCode,
        tracking_url:
          trackingUrl,
        payload:
          mergedResponse,
      },
      create: {
        order_id:
          order.id,
        event:
          "order.generated",
        status:
          "generated",
        title:
          "Etiqueta gerada",
        description:
          "A etiqueta foi gerada pelo sistema.",
        tracking_code:
          trackingCode,
        tracking_url:
          trackingUrl,
        occurred_at:
          occurredAt,
        payload:
          mergedResponse,
      },
    });

    const updatedOrder =
      await prisma.order.update({
        where: {
          id:
            order.id,
        },
        data: {
          status:
            order.status === "paid"
              ? "preparing"
              : order.status,
          melhor_envio_order_id:
            labelId,
          melhor_envio_service_id:
            serviceId,
          melhor_envio_protocol:
            protocol,
          melhor_envio_print_url:
            printUrl,
          tracking_code:
            trackingCode ||
            order.tracking_code,
          tracking_url:
            trackingUrl ||
            order.tracking_url,
          shipping_status:
            "generated",
          shipping_status_updated_at:
            new Date(),
          shipping_events:
            mergedResponse,
        },
        include: {
          contact: true,
          coupon: true,
          items: {
            include: {
              product: true,
            },
          },
          shipping_events_list: {
            orderBy: {
              occurred_at:
                "desc",
            },
          },
        },
      });

    io.emit(
      "order_updated",
      updatedOrder
    );

    return {
      order:
        updatedOrder,
      label_id:
        labelId,
      protocol,
      tracking_code:
        trackingCode,
      tracking_url:
        trackingUrl,
      print_url:
        printUrl,
    };
  } catch (error) {
    throw new Error(
      `Erro ao gerar etiqueta no Melhor Envio: ${formatAxiosError(error)}`
    );
  }
}
