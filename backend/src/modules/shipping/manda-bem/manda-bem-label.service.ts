import axios from "axios";

import { prisma } from "../../../config/prisma.js";
import { io } from "../../../websocket/socket.js";

const MANDA_BEM_ENVIO_URL = "https://mandabem.com.br/ws/gerar_envio";
const MANDA_BEM_CONSULTA_URL = "https://mandabem.com.br/ws/envio";
const STORE_ORIGIN_CEP = "74976040";

function digits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function credentials() {
  const plataformaId = process.env.MANDA_BEM_PLATAFORMA_ID;
  const plataformaChave = process.env.MANDA_BEM_PLATAFORMA_CHAVE;

  if (!plataformaId || !plataformaChave) {
    throw new Error(
      "Configure MANDA_BEM_PLATAFORMA_ID e MANDA_BEM_PLATAFORMA_CHAVE."
    );
  }

  return { plataformaId, plataformaChave };
}

function ensureCanGenerateLabel(order: any) {
  if (order.manda_bem_envio_id) {
    throw new Error("Este pedido já possui etiqueta da Manda Bem.");
  }

  if (order.shipping_carrier !== "manda_bem" || !order.manda_bem_service) {
    throw new Error(
      "Selecione uma opção de frete da Manda Bem, salve o pedido e gere a etiqueta novamente."
    );
  }

  if (
    !["paid", "approved"].includes(String(order.payment_status || "")) &&
    process.env.MANDA_BEM_ALLOW_UNPAID_LABELS !== "true"
  ) {
    throw new Error("Gere a etiqueta apenas após confirmação do pagamento.");
  }
}

function getPackageMetrics(order: any) {
  const totalWeight = order.items.reduce(
    (total: number, item: any) =>
      total + Number(item.product?.weight || 0) * Number(item.quantity || 1),
    0
  );
  const maxHeight = Math.max(
    ...order.items.map((item: any) => Number(item.product?.height || 1)),
    1
  );
  const maxWidth = Math.max(
    ...order.items.map((item: any) => Number(item.product?.width || 1)),
    1
  );
  const totalLength = order.items.reduce(
    (total: number, item: any) =>
      total + Number(item.product?.length || 1) * Number(item.quantity || 1),
    0
  );

  return {
    peso: Math.max(totalWeight, 0.3),
    altura: Math.max(maxHeight, 2),
    largura: Math.max(maxWidth, 11),
    comprimento: Math.max(totalLength, 6),
  };
}

function buildRecipientFields(order: any) {
  const address = order.contact?.addresses?.[0];

  if (!address) {
    throw new Error("Pedido sem endereço de entrega.");
  }

  return {
    destinatario: String(order.contact?.name || "Cliente").slice(0, 40),
    cep: digits(address.cep),
    logradouro: String(address.street || "").slice(0, 60),
    numero: String(address.number || "S/N").slice(0, 6),
    complemento: String(address.complement || "").slice(0, 30),
    cidade: String(address.city || "").slice(0, 40),
    bairro: String(address.district || "").slice(0, 60),
    estado: String(address.state || "").toUpperCase().slice(0, 2),
    cpf_destinatario: digits(order.contact?.cpf),
    email: order.contact?.email || "",
  };
}

function formatAxiosError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return JSON.stringify(error.response?.data || error.message);
  }

  return error instanceof Error ? error.message : "Erro desconhecido";
}

async function fetchMandaBemTracking(envioId: string) {
  const { plataformaId, plataformaChave } = credentials();

  const body = new URLSearchParams({
    plataforma_id: plataformaId,
    plataforma_chave: plataformaChave,
    id: envioId,
  });

  const { data } = await axios.post(MANDA_BEM_CONSULTA_URL, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const dados = data?.resultado?.dados;

  return {
    trackingCode: dados?.etiqueta ? String(dados.etiqueta) : null,
    status: dados?.status ? String(dados.status) : null,
  };
}

export async function generateMandaBemLabel(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      contact: {
        include: {
          addresses: {
            orderBy: { updated_at: "desc" },
            take: 1,
          },
        },
      },
      coupon: true,
      items: { include: { product: true } },
      shipping_events_list: {
        orderBy: { occurred_at: "desc" },
      },
    },
  });

  if (!order) {
    throw new Error("Pedido não encontrado.");
  }

  ensureCanGenerateLabel(order);

  const { plataformaId, plataformaChave } = credentials();
  const recipient = buildRecipientFields(order);
  const metrics = getPackageMetrics(order);

  const body = new URLSearchParams({
    plataforma_id: plataformaId,
    plataforma_chave: plataformaChave,
    forma_envio: String(order.manda_bem_service),
    cep_origem: STORE_ORIGIN_CEP,
    ref_id: String(order.order_number || order.id),
    integration: "HeloCosmeticos",
    valor_seguro: Math.max(Number(order.subtotal || 0), 0).toFixed(2),
    peso: metrics.peso.toFixed(2),
    altura: metrics.altura.toFixed(2),
    largura: metrics.largura.toFixed(2),
    comprimento: metrics.comprimento.toFixed(2),
    ...recipient,
  });

  let generateResponse;

  try {
    generateResponse = await axios.post(MANDA_BEM_ENVIO_URL, body, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch (error) {
    throw new Error(`Erro ao gerar etiqueta na Manda Bem: ${formatAxiosError(error)}`);
  }

  const resultado = generateResponse.data?.resultado;

  if (!resultado || String(resultado.sucesso) !== "true" || !resultado.envio_id) {
    throw new Error(
      `Erro ao gerar etiqueta na Manda Bem: ${resultado?.error || resultado?.mensagem || "resposta inválida"}`
    );
  }

  const envioId = String(resultado.envio_id);

  let tracking = { trackingCode: null as string | null, status: null as string | null };

  try {
    tracking = await fetchMandaBemTracking(envioId);
  } catch (error) {
    console.error("[MandaBem] Erro ao consultar rastreio recém-gerado:", formatAxiosError(error));
  }

  const occurredAt = new Date();

  await prisma.orderShippingEvent.upsert({
    where: {
      order_id_event_occurred_at: {
        order_id: order.id,
        event: "manda_bem.generated",
        occurred_at: occurredAt,
      },
    },
    update: {
      status: "generated",
      title: "Etiqueta gerada (Manda Bem)",
      description: "A etiqueta foi gerada pelo sistema via Manda Bem.",
      tracking_code: tracking.trackingCode,
      payload: generateResponse.data,
    },
    create: {
      order_id: order.id,
      event: "manda_bem.generated",
      status: "generated",
      title: "Etiqueta gerada (Manda Bem)",
      description: "A etiqueta foi gerada pelo sistema via Manda Bem.",
      tracking_code: tracking.trackingCode,
      occurred_at: occurredAt,
      payload: generateResponse.data,
    },
  });

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: order.status === "paid" ? "preparing" : order.status,
      manda_bem_envio_id: envioId,
      tracking_code: tracking.trackingCode || order.tracking_code,
      shipping_status: tracking.status || "generated",
      shipping_status_updated_at: new Date(),
    },
    include: {
      contact: true,
      coupon: true,
      items: { include: { product: true } },
      shipping_events_list: { orderBy: { occurred_at: "desc" } },
    },
  });

  io.emit("order_updated", updatedOrder);

  return {
    order: updatedOrder,
    envio_id: envioId,
    tracking_code: tracking.trackingCode,
    status: tracking.status,
  };
}
