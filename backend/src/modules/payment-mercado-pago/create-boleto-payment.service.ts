import axios from "axios";
import { prisma } from "../../config/prisma.js";
import { buildPaymentDescription } from "./payment-description.js";
import { getPaymentNotificationUrl } from "./payment-webhook-url.js";
import { notifyManagersAboutOrder } from "../manager/manager-notification.service.js";
import { getMercadoPagoAccessToken } from "./mercado-pago.provider.js";
import { calculateOrderTotals } from "../coupons/coupon-totals.service.js";
import { syncCouponRedemption } from "../coupons/coupons.service.js";

interface Props {
  order_id: number;
  cpf_override?: string;
}

function splitName(fullName: string) {
  const parts = (fullName || "").trim().split(/\s+/);
  const firstName = parts[0] || "Cliente";
  const lastName = parts.slice(1).join(" ") || "Helô";
  return { firstName, lastName };
}

function boletoExpiration() {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString();
}

function normalizeEmail(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createBoletoPaymentService({ order_id, cpf_override }: Props) {
  const order = await prisma.order.findUnique({
    where: { id: order_id },
    include: {
      contact: {
        include: { addresses: true },
      },
      coupon: true,
      items: {
        include: { product: true },
      },
    },
  });

  if (!order) {
    throw new Error("Pedido não encontrado");
  }

  const address = order.contact?.addresses?.[0];

  if (!address) {
    throw new Error(
      "Endereço não encontrado. Preencha o endereço de entrega antes de gerar o boleto."
    );
  }

  const rawCpf = cpf_override
    ? cpf_override.replace(/\D/g, "")
    : (order.contact?.cpf || "").replace(/\D/g, "");

  if (!rawCpf || rawCpf.length !== 11) {
    throw new Error("CPF inválido. Informe os 11 dígitos do CPF para gerar o boleto.");
  }

  const cpf = rawCpf;

  if (order.contact?.id && cpf_override) {
    await prisma.contact.update({
      where: { id: order.contact.id },
      data: { cpf },
    });
  }

  const totals =
    await calculateOrderTotals(
      order,
      "boleto"
    );
  const total =
    totals.total;

  if (!total || isNaN(total) || total <= 0) {
    throw new Error("Pedido sem valor válido");
  }

  const { firstName, lastName } = splitName(order.contact?.name || "");
  const payerEmail = normalizeEmail(order.contact?.email);

  if (!isValidEmail(payerEmail)) {
    throw new Error(
      "E-mail do cliente não encontrado ou inválido. Preencha o e-mail do cliente antes de gerar o boleto."
    );
  }

  const requestBody = {
    transaction_amount: total,
    description: buildPaymentDescription(order.order_number || order.id, order.items),
    external_reference: String(order.order_number || order.id),
    payment_method_id: "bolbradesco",
    date_of_expiration: boletoExpiration(),
    payer: {
      email: payerEmail,
      first_name: firstName,
      last_name: lastName,
      identification: {
        type: "CPF",
        number: cpf,
      },
      address: {
        zip_code: (address.cep || "").replace(/\D/g, ""),
        street_name: address.street || "",
        street_number: address.number || "s/n",
        neighborhood: address.district || "",
        city: address.city || "",
        federal_unit: address.state || "",
      },
    },
    notification_url: getPaymentNotificationUrl(),
  };

  console.log("[Boleto] Enviando para MP:", JSON.stringify(requestBody, null, 2));

  let mpResponse;
  try {
    mpResponse = await axios.post(
      "https://api.mercadopago.com/v1/payments",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `boleto-${order.id}-${Date.now()}`,
        },
      }
    );
  } catch (error: any) {
    console.error("[Boleto] Erro na chamada MP:", error?.response?.data || error?.message);
    throw new Error(
      error?.response?.data?.message ||
        "Não foi possível conectar ao Mercado Pago. Tente novamente."
    );
  }

  const payment = mpResponse.data;
  console.log("[Boleto] Resposta MP:", JSON.stringify(payment, null, 2));

  if (payment.status === "rejected") {
    const detail = payment.status_detail || "sem detalhe";
    console.error(`[Boleto] Pagamento rejeitado pelo Mercado Pago: ${detail}`);
    throw new Error(
      `Não foi possível gerar o boleto. Verifique se o CPF está correto e tente novamente. (${detail})`
    );
  }

  const boletoUrl =
    payment.transaction_details?.external_resource_url ||
    payment.transaction_details?.ticket_url ||
    payment.ticket_url ||
    payment.point_of_interaction?.transaction_data?.ticket_url ||
    null;

  const boletoBarcode =
    payment.barcode?.content ||
    payment.transaction_details?.barcode?.content ||
    payment.transaction_details?.digitable_line ||
    null;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      payment_method: "boleto",
      payment_status: "pending",
      coupon_discount: totals.couponDiscount,
      payment_discount: totals.paymentDiscount,
      discount: totals.discount,
      total,
      boleto_url: boletoUrl,
      boleto_barcode: boletoBarcode,
      mercado_pago_payment_id: String(payment.id),
    },
  });

  await syncCouponRedemption(
    order.id,
    "pending"
  );

  void notifyManagersAboutOrder(
    order.id,
    "pix_generated",
    `Boleto gerado. Valor: ${total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })}`
  ).catch(console.error);

  return {
    payment_id: payment.id,
    boleto_url: boletoUrl,
    boleto_barcode: boletoBarcode,
    amount: total,
  };
}
