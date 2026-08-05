import { prisma } from "../../config/prisma.js";
import { AppError } from "../../shared/errors/AppError.js";

const PAID_STATUSES = ["paid", "approved"];

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

// =====================
// LEITURA PÚBLICA (página do produto)
// =====================

function buildSummary(reviews: { rating: number }[]) {
  const count = reviews.length;
  const average =
    count > 0
      ? Number(
          (
            reviews.reduce((sum, review) => sum + review.rating, 0) / count
          ).toFixed(1)
        )
      : 0;

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  for (const review of reviews) {
    const stars = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[stars] += 1;
  }

  const distributionPercent = Object.fromEntries(
    ([5, 4, 3, 2, 1] as const).map((stars) => [
      stars,
      count > 0 ? Math.round((distribution[stars] / count) * 100) : 0,
    ])
  ) as Record<1 | 2 | 3 | 4 | 5, number>;

  return {
    average,
    count,
    distribution: distributionPercent,
  };
}

export async function listApprovedReviewsForProductService(
  productId: number,
  { limit }: { limit?: number } = {}
) {
  const allApproved = await prisma.productReview.findMany({
    where: {
      product_id: productId,
      approved: true,
    },
    orderBy: {
      created_at: "desc",
    },
    select: {
      rating: true,
    },
  });

  const summary = buildSummary(allApproved);

  const reviews = await prisma.productReview.findMany({
    where: {
      product_id: productId,
      approved: true,
    },
    orderBy: {
      created_at: "desc",
    },
    take: limit,
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      rating: true,
      title: true,
      comment: true,
      photo_url: true,
      recommends: true,
      verified_purchase: true,
      admin_response: true,
      admin_response_at: true,
      created_at: true,
    },
  });

  return { summary, reviews };
}

// =====================
// ELEGIBILIDADE POR PEDIDO (Acompanhar Pedido)
// =====================

// Reaproveita a mesma prova de posse do pedido usada em
// checkout.controller.ts (trackOrderController): número do pedido + e-mail
// cadastrado no pedido têm que bater. Nenhum token novo é criado — é a
// mesma fronteira de confiança que já existe hoje.
export async function getOrderReviewEligibilityService({
  order_id,
  email,
}: {
  order_id: number;
  email: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: order_id },
    include: {
      contact: true,
      items: { include: { product: { select: { id: true, title: true, image_url: true } } } },
    },
  });

  if (
    !order ||
    normalizeEmail(order.contact.email) !== normalizeEmail(email)
  ) {
    throw new AppError("Pedido não encontrado para os dados informados.", 404);
  }

  if (!PAID_STATUSES.includes(String(order.payment_status || ""))) {
    return { order_id: order.id, eligible_items: [] };
  }

  const existingReviews = await prisma.productReview.findMany({
    where: { order_id: order.id },
    select: { product_id: true },
  });
  const alreadyReviewed = new Set(existingReviews.map((review) => review.product_id));

  const uniqueProducts = new Map(
    order.items.map((item) => [item.product_id, item.product])
  );

  const eligible_items = Array.from(uniqueProducts.values())
    .filter((product) => !alreadyReviewed.has(product.id))
    .map((product) => ({
      product_id: product.id,
      title: product.title,
      image_url: product.image_url,
    }));

  return {
    order_id: order.id,
    contact_name: order.contact.name,
    contact_city: order.contact.city,
    contact_state: order.contact.state,
    eligible_items,
  };
}

// =====================
// CRIAÇÃO (pública — moderada antes de publicar)
// =====================

interface CreateReviewInput {
  product_id: number;
  name: string;
  city?: string | null;
  state?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
  photo_url?: string | null;
  recommends?: boolean;
  // Presentes apenas quando a avaliação vem do fluxo verificado
  // (Acompanhar Pedido). Revalidados aqui, nunca confiados às cegas.
  order_id?: number | null;
  email?: string | null;
}

export async function createReviewService(input: CreateReviewInput) {
  const rating = Math.round(Number(input.rating));

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError("Nota deve ser um número inteiro de 1 a 5.", 400);
  }

  if (!String(input.name || "").trim()) {
    throw new AppError("Informe seu nome.", 400);
  }

  if (!String(input.comment || "").trim()) {
    throw new AppError("Informe um comentário.", 400);
  }

  const product = await prisma.product.findUnique({
    where: { id: Number(input.product_id) },
    select: { id: true },
  });

  if (!product) {
    throw new AppError("Produto não encontrado.", 404);
  }

  let verifiedPurchase = false;
  let orderId: number | null = null;
  let contactId: number | null = null;

  if (input.order_id) {
    const order = await prisma.order.findUnique({
      where: { id: Number(input.order_id) },
      include: {
        contact: true,
        items: { select: { product_id: true } },
      },
    });

    const emailMatches =
      order && normalizeEmail(order.contact.email) === normalizeEmail(input.email);
    const isPaid =
      order && PAID_STATUSES.includes(String(order.payment_status || ""));
    const hasProduct =
      order && order.items.some((item) => item.product_id === product.id);

    if (!order || !emailMatches) {
      throw new AppError("Não foi possível confirmar a compra para este pedido.", 403);
    }

    if (!isPaid || !hasProduct) {
      throw new AppError("Este pedido não contém uma compra paga deste produto.", 403);
    }

    verifiedPurchase = true;
    orderId = order.id;
    contactId = order.contact_id;
  }

  try {
    return await prisma.productReview.create({
      data: {
        product_id: product.id,
        order_id: orderId,
        contact_id: contactId,
        name: String(input.name).trim(),
        city: input.city?.trim() || null,
        state: input.state?.trim() || null,
        rating,
        title: input.title?.trim() || null,
        comment: String(input.comment).trim(),
        photo_url: input.photo_url || null,
        recommends: input.recommends ?? true,
        verified_purchase: verifiedPurchase,
        approved: false,
      },
    });
  } catch (error) {
    // Unique constraint (order_id, product_id) — já existe avaliação deste
    // produto para este pedido.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new AppError("Você já avaliou este produto para este pedido.", 409);
    }

    throw error;
  }
}

// =====================
// ADMINISTRAÇÃO
// =====================

export async function listReviewsAdminService({
  approved,
  product_id,
}: {
  approved?: boolean;
  product_id?: number;
} = {}) {
  return prisma.productReview.findMany({
    where: {
      approved,
      product_id,
    },
    orderBy: { created_at: "desc" },
    include: {
      product: { select: { id: true, title: true, image_url: true } },
    },
  });
}

export async function approveReviewService(id: number) {
  return prisma.productReview.update({
    where: { id },
    data: { approved: true },
  });
}

export async function hideReviewService(id: number) {
  return prisma.productReview.update({
    where: { id },
    data: { approved: false },
  });
}

// Correção de erros de digitação pelo admin — nunca deve mudar o sentido
// do comentário, só a redação (isso é orientação de processo, não algo
// que o backend consiga validar automaticamente).
export async function updateReviewTextService(
  id: number,
  { title, comment }: { title?: string | null; comment?: string }
) {
  if (comment !== undefined && !String(comment).trim()) {
    throw new AppError("Comentário não pode ficar vazio.", 400);
  }

  return prisma.productReview.update({
    where: { id },
    data: {
      title: title !== undefined ? title?.trim() || null : undefined,
      comment: comment !== undefined ? String(comment).trim() : undefined,
    },
  });
}

export async function replyReviewService(id: number, response: string) {
  if (!String(response || "").trim()) {
    throw new AppError("Informe uma resposta.", 400);
  }

  return prisma.productReview.update({
    where: { id },
    data: {
      admin_response: String(response).trim(),
      admin_response_at: new Date(),
    },
  });
}

export async function deleteReviewService(id: number) {
  await prisma.productReview.delete({ where: { id } });
}
