import "dotenv/config";

import { prisma } from "../config/prisma.js";

const EXECUTE_FLAG = "--execute";
const CONFIRMATION = "--confirm=APAGAR_PEDIDOS_NAO_PAGOS";

const PAID_STATUSES = new Set(["paid", "approved"]);
const DELIVERED_STATUSES = new Set(["finished", "delivered"]);

function isPreservedOrder(order: {
  status: string;
  payment_status: string | null;
  shipping_status: string | null;
  paid_at: Date | null;
}) {
  return (
    PAID_STATUSES.has(String(order.payment_status || "").toLowerCase()) ||
    PAID_STATUSES.has(String(order.status || "").toLowerCase()) ||
    DELIVERED_STATUSES.has(String(order.status || "").toLowerCase()) ||
    DELIVERED_STATUSES.has(String(order.shipping_status || "").toLowerCase()) ||
    order.paid_at !== null
  );
}

async function main() {
  const shouldExecute = process.argv.includes(EXECUTE_FLAG);
  const hasConfirmation = process.argv.includes(CONFIRMATION);

  const allOrders = await prisma.order.findMany({
    select: {
      id: true,
      order_number: true,
      status: true,
      payment_status: true,
      shipping_status: true,
      paid_at: true,
      total: true,
      created_at: true,
      contact: {
        select: {
          name: true,
          phone: true,
        },
      },
      items: {
        select: {
          product_id: true,
          quantity: true,
          product: {
            select: {
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "asc",
    },
  });
  const ordersToDelete = allOrders.filter(
    (order) => !isPreservedOrder(order)
  );

  console.table(
    ordersToDelete.map((order) => ({
      id: order.id,
      pedido: order.order_number || "sem número",
      cliente: order.contact.name || order.contact.phone,
      status: order.status,
      pagamento: order.payment_status || "não informado",
      entrega: order.shipping_status || "não informado",
      total: order.total.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      itens: order.items
        .map((item) => `${item.quantity}x ${item.product.title}`)
        .join(", "),
      criado_em: order.created_at.toISOString(),
    }))
  );

  console.log(`\nPedidos que seriam apagados: ${ordersToDelete.length}`);

  if (!shouldExecute) {
    console.log("Modo de prévia: nada foi apagado.");
    console.log(
      `Para executar: npm run orders:delete-unpaid -- ${EXECUTE_FLAG} ${CONFIRMATION}`
    );
    return;
  }

  if (!hasConfirmation) {
    throw new Error(
      `Confirmação ausente. Use ${CONFIRMATION} junto com ${EXECUTE_FLAG}.`
    );
  }

  if (!ordersToDelete.length) {
    console.log("Nenhum pedido elegível para exclusão.");
    return;
  }

  const previewOrderIds = ordersToDelete.map((order) => order.id);

  const result = await prisma.$transaction(
    async (transaction) => {
      const currentOrders = await transaction.order.findMany({
        where: {
          id: { in: previewOrderIds },
        },
        select: {
          id: true,
          status: true,
          payment_status: true,
          shipping_status: true,
          paid_at: true,
        },
      });
      const orderIds = currentOrders
        .filter((order) => !isPreservedOrder(order))
        .map((order) => order.id);

      if (!orderIds.length) {
        return {
          conversations: 0,
          reviews: 0,
          items: 0,
          orders: 0,
        };
      }

      const conversations = await transaction.conversation.updateMany({
        where: {
          last_order_id: { in: orderIds },
        },
        data: {
          last_order_id: null,
          checkout_url: null,
          checkout_token: null,
        },
      });

      const reviews = await transaction.productReview.updateMany({
        where: {
          order_id: { in: orderIds },
        },
        data: {
          order_id: null,
          verified_purchase: false,
        },
      });

      const items = await transaction.orderItem.deleteMany({
        where: {
          order_id: { in: orderIds },
        },
      });

      const orders = await transaction.order.deleteMany({
        where: {
          id: { in: orderIds },
        },
      });

      return {
        conversations: conversations.count,
        reviews: reviews.count,
        items: items.count,
        orders: orders.count,
      };
    },
    {
      maxWait: 10_000,
      timeout: 120_000,
    }
  );

  console.log("\nExclusão concluída:");
  console.log(`- Pedidos apagados: ${result.orders}`);
  console.log(`- Itens apagados: ${result.items}`);
  console.log(`- Avaliações preservadas e desvinculadas: ${result.reviews}`);
  console.log(`- Conversas desvinculadas: ${result.conversations}`);
}

main()
  .catch((error) => {
    console.error("Erro ao apagar pedidos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
