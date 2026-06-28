import { mercadoPagoClient } from "./mercado-pago.provider.js";
import { prisma } from "../../config/prisma.js";
import { Payment } from "mercadopago";
import { buildPaymentDescription } from "./payment-description.js";
import { getPaymentNotificationUrl } from "./payment-webhook-url.js";
import { notifyManagersAboutOrder } from "../manager/manager-notification.service.js";

interface Props {
  order_id: number;
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

export async function createBoletoPaymentService({ order_id }: Props) {
  const order = await prisma.order.findUnique({
    where: { id: order_id },
    include: {
      contact: {
        include: { addresses: true },
      },
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

  const cpf = (order.contact?.cpf || "").replace(/\D/g, "");
  if (!cpf || cpf.length !== 11) {
    throw new Error("CPF inválido. Preencha o CPF corretamente para gerar o boleto.");
  }

  const total = Number(
    (Number(order.subtotal || 0) + Number(order.shipping || 0)).toFixed(2)
  );

  if (!total || isNaN(total) || total <= 0) {
    throw new Error("Pedido sem valor válido");
  }

  const { firstName, lastName } = splitName(order.contact?.name || "");

  const paymentClient = new Payment(mercadoPagoClient);

  const payment = await paymentClient.create({
    body: {
      transaction_amount: total,
      description: buildPaymentDescription(
        order.order_number || order.id,
        order.items
      ),
      external_reference: String(order.order_number || order.id),
      payment_method_id: "bolbradesco",
      date_of_expiration: boletoExpiration(),
      payer: {
        email: order.contact?.email || `cliente${order.id}@helo.com`,
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
    },
  });

  console.log("[Boleto] Resposta MP:", JSON.stringify(payment, null, 2));

  const paymentStatus = (payment as any).status;
  if (paymentStatus === "rejected") {
    const detail = (payment as any).status_detail || "sem detalhe";
    console.error(`[Boleto] Pagamento rejeitado pelo Mercado Pago: ${detail}`);
    throw new Error(
      `Não foi possível gerar o boleto. Verifique se o CPF está correto e tente novamente. (${detail})`
    );
  }

  const boletoUrl =
    (payment as any).transaction_details?.external_resource_url ||
    (payment as any).transaction_details?.ticket_url ||
    (payment as any).ticket_url ||
    (payment as any).point_of_interaction?.transaction_data?.ticket_url ||
    null;

  const boletoBarcode =
    (payment as any).barcode?.content ||
    (payment as any).transaction_details?.barcode?.content ||
    null;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      payment_method: "boleto",
      payment_status: "pending",
      total,
      boleto_url: boletoUrl,
      boleto_barcode: boletoBarcode,
      mercado_pago_payment_id: String(payment.id),
    },
  });

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
