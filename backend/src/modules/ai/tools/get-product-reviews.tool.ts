import {
  prisma,
} from "../../../config/prisma.js";
import {
  listApprovedReviewsForProductService,
} from "../../reviews/reviews.service.js";

interface Props {
  conversationId?: number;
  productId?: number;
}

// Usada quando o cliente pergunta algo como "tem alguém que já usou?",
// "avaliações", "depoimentos", "o pessoal gostou?". Retorna somente
// avaliações reais e aprovadas cadastradas no site — a IA nunca deve
// inventar comentários de clientes.
export async function getProductReviewsTool({
  conversationId,
  productId,
}: Props) {
  let targetProductId = productId;

  if (!targetProductId && conversationId) {
    const conversation =
      await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { last_product_id: true },
      });

    targetProductId = conversation?.last_product_id ?? undefined;
  }

  if (!targetProductId) {
    return {
      status: "no_product",
      message:
        "Não sei de qual produto o cliente está falando. Pergunte qual produto ele quer saber avaliações antes de usar esta função de novo.",
    };
  }

  const { summary, reviews } =
    await listApprovedReviewsForProductService(targetProductId, {
      limit: 5,
    });

  if (!reviews.length) {
    return {
      status: "no_reviews",
      message:
        "Ainda não há avaliações aprovadas para este produto. Diga isso ao cliente com naturalidade — nunca invente comentários ou depoimentos.",
    };
  }

  return {
    status: "found",
    average_rating: summary.average,
    total_reviews: summary.count,
    reviews: reviews.map((review) => ({
      nome: review.name,
      cidade: review.city,
      nota: review.rating,
      comentario: review.comment,
      compra_verificada: review.verified_purchase,
    })),
    instructions:
      "Use apenas essas avaliações reais na resposta. Nunca invente avaliações, notas ou comentários que não estejam nesta lista.",
  };
}
