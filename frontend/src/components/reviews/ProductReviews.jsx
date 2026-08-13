import { useState } from "react";
import { BadgeCheck } from "lucide-react";

import StarRating from "./StarRating";
import WriteReviewModal from "./WriteReviewModal";

const API_URL =
  import.meta.env.VITE_API_URL || "/api";

function resolvePhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  if (/^https?:\/\//.test(photoUrl)) return photoUrl;
  return `${API_URL.replace(/\/$/, "")}${photoUrl}`;
}

function DistributionBar({ stars, percent }) {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      <span className="w-16 shrink-0">
        {"★".repeat(stars)}
        <span className="text-[#e3d3d8]">{"★".repeat(5 - stars)}</span>
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f1e3e8]">
        <div
          className="h-full rounded-full bg-[#e8a33d]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right">{percent}%</span>
    </div>
  );
}

// `data` vem do pai ({ summary, reviews }, de fetchProductReviews) — buscado
// uma vez lá em cima porque o resumo (estrelas + nota) também é exibido em
// cima da imagem do produto, e não faz sentido buscar duas vezes.
export default function ProductReviews({ productId, productTitle, data }) {
  const [modalOpen, setModalOpen] = useState(false);

  const summary = data?.summary || { average: 0, count: 0, distribution: {} };
  const reviews = data?.reviews || [];

  return (
    <section id="avaliacoes" className="product-sale-reviews mt-6 scroll-mt-24 bg-white p-7 sm:p-9">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-[#43232d]">
            O que dizem nossas clientes
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Avaliações reais de clientes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-xl border border-[#d9536f] px-5 py-2.5 text-sm font-semibold text-[#d9536f] transition hover:bg-[#fff1f5]"
        >
          Escrever avaliação
        </button>
      </div>

      {summary.count > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StarRating value={summary.average} size={22} />
            <span className="text-2xl font-bold text-[#43232d]">
              {summary.average.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </span>
          </div>

          <div className="mt-5 max-w-sm space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => (
              <DistributionBar
                key={stars}
                stars={stars}
                percent={summary.distribution?.[stars] || 0}
              />
            ))}
          </div>

          <div className="mt-8 space-y-6 divide-y divide-[#f1e3e8]">
            {reviews.map((review) => (
              <article key={review.id} className="pt-6 first:pt-0">
                <div className="flex items-start gap-3">
                  {review.photo_url && (
                    <img
                      src={resolvePhotoUrl(review.photo_url)}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <StarRating value={review.rating} size={15} />
                    <p className="mt-1 text-sm font-semibold text-[#43232d]">
                      {review.name}
                      {review.city && (
                        <span className="font-normal text-zinc-500">
                          {" "}
                          • {review.city}
                        </span>
                      )}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      {/* <span>{formatReviewDate(review.created_at)}</span> */}
                      {review.verified_purchase && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                          <BadgeCheck size={13} />
                          Compra verificada
                        </span>
                      )}
                    </div>
                    {review.title && (
                      <p className="mt-2 text-sm font-semibold text-[#43232d]">
                        {review.title}
                      </p>
                    )}
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      {review.comment}
                    </p>
                    {review.admin_response && (
                      <div className="mt-3 rounded-xl bg-[#fff7f9] px-4 py-3 text-sm text-zinc-600">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#c14b66]">
                          Resposta da Helô Cosméticos
                        </p>
                        <p className="mt-1">{review.admin_response}</p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-zinc-500">
          Ainda não há avaliações públicas para este produto. Seja a primeira
          pessoa a avaliar!
        </p>
      )}

      <WriteReviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productId={productId}
        productTitle={productTitle}
      />
    </section>
  );
}
