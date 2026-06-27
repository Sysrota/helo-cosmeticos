import {
  prisma,
} from "../../../config/prisma.js";
import {
  classifyCustomerIntent,
} from "./customer-intent.service.js";
import {
  getProductsUrl,
} from "./public-url.service.js";

const categoryLabels: Record<string, string> = {
  shampoo: "Shampoo",
  condicionador: "Condicionador",
  mascara: "Máscara capilar",
  redutor: "Redutor de volume",
  skincare: "Skincare e cuidados faciais",
  finalizador: "Finalizador",
  kit: "Kits",
};

export async function buildCatalogResponse({
  message,
  conversationId,
}: {
  message: string;
  conversationId: number;
}) {
  if (classifyCustomerIntent(message) !== "catalog") {
    return null;
  }

  await prisma.conversation.updateMany({
    where: {
      id:
        conversationId,
    },

    data: {
      last_product_id:
        null,
    },
  });

  const products =
    await prisma.product.findMany({
      where: {
        is_active:
          true,
      },

      select: {
        category:
          true,
      },

      orderBy: {
        sort_order:
          "asc",
      },
    });

  const categories =
    Array.from(
      new Set(
        products
          .map((product) =>
            product.category
          )
          .filter(Boolean)
      )
    );

  if (!categories.length) {
    return "Temos alguns produtos Helô no catálogo, mas vou verificar as categorias disponíveis para você.";
  }

  const categoryLines =
    categories
      .map((category) =>
        `• ${categoryLabels[category] || category}`
      )
      .join("\n");

  return [
    "Temos outras opções sim 😊",
    "Hoje você pode escolher por:",
    categoryLines,
    "O que você quer ver primeiro?",
    "• Cuidados com a pele",
    "• Cuidados com o cabelo",
    "• Ver catálogo completo",
    `Catálogo: ${getProductsUrl()}`,
  ].join("\n");
}
