import { prisma } from "../../../config/prisma.js";
import { generateCheckoutLinkTool } from "../tools/generate-checkout-link.tool.js";

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const AFFIRMATIVE_RESPONSES = new Set([
  "sim",
  "quero",
  "pode",
  "pode sim",
  "manda",
  "manda ai",
  "ok",
  "vamos",
  "fecha",
]);

export async function buildConfirmedCheckoutResponse({
  message,
  conversationId,
}: {
  message: string;
  conversationId: number;
}) {
  if (!AFFIRMATIVE_RESPONSES.has(normalizeText(message))) return null;

  const [conversation, previousAgentMessage] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { cart_json: true },
    }),
    prisma.message.findFirst({
      where: {
        conversation_id: conversationId,
        sender_type: "agent",
      },
      orderBy: { created_at: "desc" },
      select: { content: true },
    }),
  ]);

  const previous = normalizeText(previousAgentMessage?.content || "");
  const confirmedCheckout =
    previous.includes("quer que eu prepare seu pedido") ||
    previous.includes("posso preparar seu pedido") ||
    previous.includes("quer que eu envie o link") ||
    previous.includes("posso enviar o link") ||
    previous.includes("link para finalizar");
  const cart = conversation?.cart_json as any;

  if (!confirmedCheckout || !cart?.items?.length) return null;

  const checkout = await generateCheckoutLinkTool({ conversationId });

  return `Perfeito 😊 Seu pedido está pronto. Você pode finalizar pelo link abaixo:\n\n${checkout.url}`;
}
