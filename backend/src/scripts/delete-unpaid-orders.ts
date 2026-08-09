import "dotenv/config";

import { prisma } from "../config/prisma.js";

const EXECUTE_FLAG = "--execute";
const CONFIRMATION = "--confirm=APAGAR_PEDIDOS_NAO_PAGOS";

const preservedOrderFilter = {
  OR: [
    { payment_status: { in: ["paid", "approved"] } },
    { status: { in: ["paid", "approved", "finished", "delivered"] } },
    { shipping_status: "delivered" },
    { paid_at: { not: null } },
  ],
};

async function main() {
  const shouldExecute = process.argv.includes(EXECUTE_FLAG);
  const hasConfirmation = process.argv.includes(CONFIRMATION);

  const ordersToDelete = await prisma.order.findMany({
    where: {
      NOT: preservedOrderFilter,
    },
    select: {
      id: true,
      order_number: true,
      status: true,
      payment_status: true,
      shipping_status: true,
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

  const orderIds = ordersToDelete.map((order) => order.id);

  const result = await prisma.$transaction(
    async (transaction) => {
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
          NOT: preservedOrderFilter,
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
