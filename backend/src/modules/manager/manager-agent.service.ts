import OpenAI from "openai";
import { prisma } from "../../config/prisma.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function executeAdminAgent({
  conversationId,
  messages,
}: {
  conversationId: number;
  messages: any[];
}) {
  const systemPrompt = `
Você é a assistente administrativa da Helo Cosméticos, auxiliando os gestores internos da loja.

OBJETIVO:
- Informar pedidos pendentes de envio
- Mostrar pedidos do dia, semana ou mês
- Fornecer estatísticas de vendas e faturamento
- Identificar produtos mais vendidos
- Buscar pedidos específicos por ID ou nome do cliente

REGRAS:
- Seja direta e objetiva
- Formate os dados de forma clara e legível para WhatsApp (sem markdown, use emojis e quebras de linha)
- Sempre use as tools para buscar dados reais, nunca invente informações
- Valores em formato R$ XX,XX
- Datas em formato brasileiro DD/MM/YYYY HH:mm
- Ao listar pedidos, mostre: nº do pedido, cliente, valor total, itens, status de pagamento
`.trim();

  let history: any[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const tools: any[] = [
    {
      type: "function",
      function: {
        name: "get_pending_orders",
        description: "Busca pedidos com pagamento aprovado que ainda não foram enviados/concluídos",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_orders_by_period",
        description: "Busca pedidos de um período específico",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["today", "week", "month"],
              description: "hoje, semana ou mês",
            },
          },
          required: ["period"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_sales_stats",
        description: "Retorna estatísticas de vendas: faturamento, número de pedidos, ticket médio e produtos mais vendidos",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["today", "week", "month"],
            },
          },
          required: ["period"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_order",
        description: "Busca um pedido específico pelo número do pedido ou pelo nome/telefone do cliente",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Número do pedido (ex: 42) ou nome/telefone do cliente",
            },
          },
          required: ["query"],
        },
      },
    },
  ];

  for (let step = 0; step < 5; step++) {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: history,
      tools,
    });

    const msg = response.choices[0].message;

    if (!msg.tool_calls) {
      return msg.content || "Posso ajudar com mais alguma coisa?";
    }

    history.push(msg);

    for (const toolCall of msg.tool_calls) {
      if (!("function" in toolCall)) continue;

      const fn = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      let result: any = null;

      if (fn === "get_pending_orders") {
        result = await getPendingOrders();
      } else if (fn === "get_orders_by_period") {
        result = await getOrdersByPeriod(args.period);
      } else if (fn === "get_sales_stats") {
        result = await getSalesStats(args.period);
      } else if (fn === "search_order") {
        result = await searchOrder(args.query);
      }

      history.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result, null, 2),
      });
    }
  }

  return "Posso ajudar com mais alguma coisa?";
}

function formatDate(date: Date) {
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function periodStart(period: "today" | "week" | "month"): Date {
  const d = new Date();
  if (period === "today") d.setHours(0, 0, 0, 0);
  else if (period === "week") { d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); }
  else { d.setDate(1); d.setHours(0, 0, 0, 0); }
  return d;
}

async function getPendingOrders() {
  const orders = await prisma.order.findMany({
    where: { payment_status: "approved", status: "pending" },
    include: { contact: true, items: { include: { product: true } } },
    orderBy: { created_at: "asc" },
    take: 30,
  });

  if (orders.length === 0) return { mensagem: "Nenhum pedido pendente de envio." };

  return {
    total: orders.length,
    pedidos: orders.map((o) => ({
      id: o.id,
      cliente: o.contact.name || o.contact.phone,
      telefone: o.contact.phone,
      total: formatCurrency(o.total),
      frete: o.shipping_method || "não definido",
      itens: o.items.map((i) => `${i.product.title} x${i.quantity}`),
      data: formatDate(o.created_at),
    })),
  };
}

async function getOrdersByPeriod(period: "today" | "week" | "month") {
  const start = periodStart(period);

  const orders = await prisma.order.findMany({
    where: { created_at: { gte: start } },
    include: { contact: true, items: { include: { product: true } } },
    orderBy: { created_at: "desc" },
  });

  if (orders.length === 0) return { mensagem: "Nenhum pedido encontrado no período." };

  return {
    periodo: period,
    total_pedidos: orders.length,
    pedidos: orders.map((o) => ({
      id: o.id,
      cliente: o.contact.name || o.contact.phone,
      total: formatCurrency(o.total),
      status_pagamento: o.payment_status,
      itens: o.items.map((i) => `${i.product.title} x${i.quantity}`),
      data: formatDate(o.created_at),
    })),
  };
}

async function getSalesStats(period: "today" | "week" | "month") {
  const start = periodStart(period);

  const orders = await prisma.order.findMany({
    where: { created_at: { gte: start }, payment_status: "approved" },
    include: { items: { include: { product: true } } },
  });

  const faturamento = orders.reduce((sum, o) => sum + o.total, 0);
  const ticket = orders.length > 0 ? faturamento / orders.length : 0;

  const productCount: Record<string, { title: string; qty: number; revenue: number }> = {};

  for (const order of orders) {
    for (const item of order.items) {
      const key = String(item.product_id);
      if (!productCount[key]) {
        productCount[key] = { title: item.product.title, qty: 0, revenue: 0 };
      }
      productCount[key].qty += item.quantity;
      productCount[key].revenue += item.total;
    }
  }

  const topProdutos = Object.values(productCount)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
    .map((p) => ({
      produto: p.title,
      quantidade: p.qty,
      faturamento: formatCurrency(p.revenue),
    }));

  return {
    periodo: period,
    pedidos_aprovados: orders.length,
    faturamento: formatCurrency(faturamento),
    ticket_medio: formatCurrency(ticket),
    produtos_mais_vendidos: topProdutos,
  };
}

async function searchOrder(query: string) {
  const orderId = parseInt(query);

  if (!isNaN(orderId)) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { contact: true, items: { include: { product: true } } },
    });

    if (!order) return { mensagem: `Pedido #${orderId} não encontrado.` };

    return {
      id: order.id,
      cliente: order.contact.name || order.contact.phone,
      telefone: order.contact.phone,
      total: formatCurrency(order.total),
      status: order.status,
      status_pagamento: order.payment_status,
      frete: order.shipping_method || "não definido",
      itens: order.items.map((i) => `${i.product.title} x${i.quantity} — ${formatCurrency(i.total)}`),
      data: formatDate(order.created_at),
    };
  }

  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    },
    include: {
      orders: {
        include: { items: { include: { product: true } } },
        orderBy: { created_at: "desc" },
        take: 5,
      },
    },
    take: 3,
  });

  if (contacts.length === 0) return { mensagem: "Nenhum cliente encontrado com esse nome ou telefone." };

  return contacts.flatMap((c) =>
    c.orders.map((o) => ({
      id: o.id,
      cliente: c.name || c.phone,
      telefone: c.phone,
      total: formatCurrency(o.total),
      status_pagamento: o.payment_status,
      itens: o.items.map((i) => `${i.product.title} x${i.quantity}`),
      data: formatDate(o.created_at),
    }))
  );
}
