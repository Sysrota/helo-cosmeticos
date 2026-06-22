import OpenAI from "openai";
import { prisma } from "../../config/prisma.js";
import {
  sendOrderStatusMovementEmail,
} from "../notification/order-email.service.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function executeAdminAgent({
  conversationId,
  messages,
}: {
  conversationId: number;
  messages: any[];
}) {
  const pendingStatusUpdate =
    getPendingStatusUpdateFromMessages(
      messages
    );

  if (
    pendingStatusUpdate &&
    isConfirmationMessage(
      getLastUserMessage(
        messages
      )
    )
  ) {
    const result =
      await updateOrderStatus({
        orderId:
          pendingStatusUpdate.orderId,
        status:
          pendingStatusUpdate.status,
      });

    return formatOrderStatusUpdateResponse(
      result
    );
  }

  const systemPrompt = `
Você é a assistente administrativa da Helo Cosméticos, auxiliando os gestores internos da loja.

OBJETIVO:
- Informar pedidos pendentes de envio
- Mostrar pedidos do dia, semana ou mês
- Fornecer estatísticas de vendas e faturamento
- Identificar produtos mais vendidos
- Buscar pedidos específicos por ID ou nome do cliente
- Atualizar status de pedidos quando o gestor informar preparação, envio, entrega ou cancelamento

REGRAS:
- Seja direta e objetiva
- Formate os dados de forma clara e legível para WhatsApp (sem markdown, use emojis e quebras de linha)
- Sempre use as tools para buscar dados reais, nunca invente informações
- Valores em formato R$ XX,XX
- Datas em formato brasileiro DD/MM/YYYY HH:mm
- Ao listar pedidos, mostre: nº do pedido, cliente, valor total, itens, status de pagamento
- Quando o gestor disser algo como "pedido 10 está sendo preparado", "pedido 10 enviado", "pedido 10 entregue" ou "pedido 10 cancelado", confirme antes de alterar.
- Para confirmar uma alteração de status, primeiro chame update_order_status. Se a tool retornar "needs_confirmation", mostre os dados do pedido, o status atual, o novo status pretendido e pergunte se pode atualizar.
- Só chame update_order_status para concluir depois que o gestor responder claramente confirmando, como "sim", "confirmo", "pode atualizar" ou "pode".
- Use status "preparing" para pedido em preparo, "shipping" para enviado/em rota, "finished" para entregue e "cancelled" para cancelado.
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
    {
      type: "function",
      function: {
        name: "update_order_status",
        description: "Atualiza o status operacional de um pedido. Use quando o gestor informar que o pedido está em preparo, enviado, entregue ou cancelado.",
        parameters: {
          type: "object",
          properties: {
            order_id: {
              type: "number",
              description: "Número do pedido",
            },
            status: {
              type: "string",
              enum: ["pending", "paid", "preparing", "shipping", "finished", "cancelled"],
              description: "Novo status do pedido",
            },
            note: {
              type: "string",
              description: "Observação curta sobre a atualização",
            },
          },
          required: ["order_id", "status"],
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
      } else if (fn === "update_order_status") {
        const orderId =
          Number(args.order_id);
        const status =
          args.status;

        if (
          !hasExplicitUpdateConfirmation(
            messages,
            orderId,
            status
          )
        ) {
          result =
            await previewOrderStatusUpdate({
              orderId,
              status,
              note: args.note,
            });
        } else {
          result = await updateOrderStatus({
            orderId,
            status,
            note: args.note,
          });
        }
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

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    preparing: "Em preparo",
    shipping: "Enviado",
    finished: "Entregue",
    cancelled: "Cancelado",
  };

  return labels[String(status || "")] || String(status || "Não informado");
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
    where: {
      payment_status: {
        in: ["paid", "approved"],
      },
      status: {
        notIn: ["shipping", "finished", "cancelled"],
      },
    },
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
      status: statusLabel(o.status),
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
      status: statusLabel(o.status),
      status_pagamento: o.payment_status,
      itens: o.items.map((i) => `${i.product.title} x${i.quantity}`),
      data: formatDate(o.created_at),
    })),
  };
}

async function getSalesStats(period: "today" | "week" | "month") {
  const start = periodStart(period);

  const orders = await prisma.order.findMany({
    where: {
      created_at: { gte: start },
      payment_status: {
        in: ["paid", "approved"],
      },
    },
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
      status: statusLabel(order.status),
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
      status: statusLabel(o.status),
      status_pagamento: o.payment_status,
      itens: o.items.map((i) => `${i.product.title} x${i.quantity}`),
      data: formatDate(o.created_at),
    }))
  );
}

function getLastUserMessage(messages: any[]) {
  const userMessages =
    messages.filter(
      (message) =>
        message.role === "user" &&
        typeof message.content ===
          "string"
    );

  return String(
    userMessages.at(-1)?.content ||
      ""
  )
    .trim()
    .toLowerCase();
}

function normalizeText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

function statusFromLabel(
  value: string
) {
  const normalized =
    normalizeText(value);

  if (
    normalized.includes("preparo") ||
    normalized.includes("preparacao")
  ) {
    return "preparing";
  }

  if (
    normalized.includes("rota") ||
    normalized.includes("enviado") ||
    normalized.includes("envio")
  ) {
    return "shipping";
  }

  if (
    normalized.includes("entregue") ||
    normalized.includes("finalizado")
  ) {
    return "finished";
  }

  if (normalized.includes("cancelado")) {
    return "cancelled";
  }

  if (normalized.includes("pago")) {
    return "paid";
  }

  if (normalized.includes("pendente")) {
    return "pending";
  }

  return null;
}

function getPendingStatusUpdateFromMessages(
  messages: any[]
) {
  const assistantMessages =
    messages.filter(
      (message) =>
        message.role === "assistant" &&
        typeof message.content ===
          "string"
    );
  const previousAssistantMessage =
    String(
      assistantMessages.at(-1)?.content ||
        ""
    );

  if (!previousAssistantMessage) {
    return null;
  }

  const orderMatch =
    previousAssistantMessage.match(
      /pedido\s*(?:n[ºo°]?\s*)?[#º°]?\s*(\d+)/i
    );
  const statusMatch =
    previousAssistantMessage.match(
      /novo status pretendido:\s*([^\n\r]+)/i
    ) ||
    previousAssistantMessage.match(
      /atualizar[^#\n\r]*#?\s*\d+[^"“”\n\r]*(?:para|como)\s*["“”']?([^"“”'\n\r?.]+)/i
    );

  if (
    !orderMatch ||
    !statusMatch
  ) {
    return null;
  }

  const status =
    statusFromLabel(
      statusMatch[1]
    );

  if (!status) {
    return null;
  }

  return {
    orderId:
      Number(orderMatch[1]),
    status,
  };
}

function isConfirmationMessage(
  message: string
) {
  const confirmationPattern =
    /\b(sim|confirmo|confirmado|pode|autoriza|autorizo|atualize|atualizar|ok|correto|isso mesmo)\b/i;
  const denialPattern =
    /\b(n[aã]o|nao|cancelar|cancela|errado|pera|espera)\b/i;

  return (
    confirmationPattern.test(
      message
    ) &&
    !denialPattern.test(
      message
    )
  );
}

function hasExplicitUpdateConfirmation(
  messages: any[],
  orderId: number,
  status: string
) {
  const lastMessage =
    getLastUserMessage(
      messages
    );

  if (!lastMessage) {
    return false;
  }

  if (
    !isConfirmationMessage(
      lastMessage
    )
  ) {
    return false;
  }

  const assistantMessages =
    messages.filter(
      (message) =>
        message.role === "assistant" &&
        typeof message.content ===
          "string"
    );
  const previousAssistantMessage =
    String(
      assistantMessages.at(-1)?.content ||
        ""
    ).toLowerCase();

  return (
    previousAssistantMessage.includes(
      `#${orderId}`
    ) &&
    previousAssistantMessage.includes(
      statusLabel(status).toLowerCase()
    )
  );
}

async function previewOrderStatusUpdate({
  orderId,
  status,
  note,
}: {
  orderId: number;
  status: string;
  note?: string;
}) {
  const allowedStatus = new Set([
    "pending",
    "paid",
    "preparing",
    "shipping",
    "finished",
    "cancelled",
  ]);

  if (
    !Number.isInteger(orderId) ||
    orderId <= 0
  ) {
    return {
      sucesso: false,
      mensagem: "Número do pedido inválido.",
    };
  }

  if (!allowedStatus.has(status)) {
    return {
      sucesso: false,
      mensagem: "Status inválido para atualização do pedido.",
    };
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      contact: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    return {
      sucesso: false,
      mensagem: `Pedido #${orderId} não encontrado.`,
    };
  }

  return {
    sucesso: true,
    needs_confirmation: true,
    mensagem:
      "Confirme os dados antes de atualizar o pedido.",
    acao_pendente: {
      pedido_id: order.id,
      status_atual: statusLabel(
        order.status
      ),
      novo_status: statusLabel(
        status
      ),
      observacao: note || null,
    },
    pedido: {
      id: order.id,
      cliente:
        order.contact.name ||
        order.contact.phone,
      telefone:
        order.contact.phone,
      total: formatCurrency(
        order.total
      ),
      status_pagamento:
        order.payment_status,
      frete:
        order.shipping_method ||
        "não definido",
      itens: order.items.map(
        (item) =>
          `${item.product.title} x${item.quantity}`
      ),
      data: formatDate(
        order.created_at
      ),
    },
    instrucao:
      `Pergunte ao gestor se pode atualizar o pedido #${order.id} para ${statusLabel(status)}. Não atualize antes da confirmação.`,
  };
}

function formatOrderStatusUpdateResponse(
  result: any
) {
  if (!result?.sucesso) {
    return result?.mensagem ||
      "Não foi possível atualizar o pedido.";
  }

  const pedido =
    result.pedido;

  return [
    `✅ ${result.mensagem}`,
    "",
    `Pedido nº ${pedido.id}`,
    `Cliente: ${pedido.cliente}`,
    `Valor: ${pedido.total}`,
    `Status: ${pedido.status}`,
    `Pagamento: ${pedido.status_pagamento}`,
    `Frete: ${pedido.frete}`,
    `Itens: ${pedido.itens.join(", ")}`,
  ].join("\n");
}

async function updateOrderStatus({
  orderId,
  status,
  note,
}: {
  orderId: number;
  status: string;
  note?: string;
}) {
  const allowedStatus = new Set([
    "pending",
    "paid",
    "preparing",
    "shipping",
    "finished",
    "cancelled",
  ]);

  if (
    !Number.isInteger(orderId) ||
    orderId <= 0
  ) {
    return {
      sucesso: false,
      mensagem: "Número do pedido inválido.",
    };
  }

  if (!allowedStatus.has(status)) {
    return {
      sucesso: false,
      mensagem: "Status inválido para atualização do pedido.",
    };
  }

  const order = await prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      contact: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    return {
      sucesso: false,
      mensagem: `Pedido #${orderId} não encontrado.`,
    };
  }

  const currentNotes =
    String(order.notes || "").trim();
  const statusNote =
    `[${formatDate(new Date())}] Status alterado para ${statusLabel(status)} pela IA gestora${note ? `: ${note}` : ""}`;

  const updatedOrder = await prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      status,
      notes: currentNotes
        ? `${currentNotes}\n${statusNote}`
        : statusNote,
    },
    include: {
      contact: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (order.status !== status) {
    void sendOrderStatusMovementEmail(
      updatedOrder.id,
      status
    ).catch((error) => {
      console.error(
        "Erro ao disparar e-mail de movimentação do pedido pelo gestor IA:",
        error
      );
    });
  }

  return {
    sucesso: true,
    mensagem: `Pedido #${updatedOrder.id} atualizado para ${statusLabel(updatedOrder.status)}.`,
    pedido: {
      id: updatedOrder.id,
      cliente: updatedOrder.contact.name || updatedOrder.contact.phone,
      total: formatCurrency(updatedOrder.total),
      status: statusLabel(updatedOrder.status),
      status_pagamento: updatedOrder.payment_status,
      frete: updatedOrder.shipping_method || "não definido",
      itens: updatedOrder.items.map((item) => `${item.product.title} x${item.quantity}`),
    },
  };
}
