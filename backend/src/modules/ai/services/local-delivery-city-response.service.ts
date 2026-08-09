import { prisma } from "../../../config/prisma.js";
import { findLocalDeliveryCity } from "../../shipping/shipping.service.js";
import { getCommercialPolicy } from "../../store-config/store-config.service.js";

export async function buildLocalDeliveryCityResponse({
  message,
  conversationId,
}: {
  message: string;
  conversationId: number;
}) {
  const city = findLocalDeliveryCity(message);

  if (!city) return null;

  const policy = await getCommercialPolicy();
  if (!policy.moto_uber_enabled) return null;

  const previousAgentMessage = await prisma.message.findFirst({
    where: {
      conversation_id: conversationId,
      sender_type: "agent",
    },
    orderBy: { created_at: "desc" },
    select: { content: true },
  });
  const previousContent = String(previousAgentMessage?.content || "").toLowerCase();
  const awaitingDeliveryLocation =
    previousContent.includes("cep") ||
    previousContent.includes("entrega") ||
    previousContent.includes("prazo") ||
    previousContent.includes("chega");

  if (!awaitingDeliveryLocation) return null;

  return `Sim 😊 Em ${city} temos entrega no mesmo dia por Moto Uber. Me passa seu CEP para eu confirmar o atendimento no seu endereço e montar o pedido certinho?`;
}
