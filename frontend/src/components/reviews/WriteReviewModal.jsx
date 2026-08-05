import { useState } from "react";
import { X } from "lucide-react";

import StarRating from "./StarRating";
import { submitReview } from "../../services/reviews";

// `verified` (opcional): { orderId, email, name, city, state, productTitle }
// — vem do fluxo de Acompanhar Pedido, já com pedido+e-mail confirmados.
// Quando presente, a avaliação é enviada com order_id+email e o backend
// revalida a compra antes de marcar como "Compra verificada".
export default function WriteReviewModal({
  open,
  onClose,
  productId,
  productTitle,
  verified,
  onSubmitted,
}) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [name, setName] = useState(verified?.name || "");
  const [city, setCity] = useState(verified?.city || "");
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!open) return null;

  function resetAndClose() {
    setRating(0);
    setTitle("");
    setComment("");
    setName(verified?.name || "");
    setCity(verified?.city || "");
    setPhoto(null);
    setError("");
    setDone(false);
    onClose?.();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!rating) {
      setError("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }

    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }

    if (!comment.trim()) {
      setError("Escreva um comentário.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const review = await submitReview({
        productId,
        name,
        city,
        state: verified?.state,
        rating,
        title,
        comment,
        photo,
        orderId: verified?.orderId,
        email: verified?.email,
      });

      setDone(true);
      onSubmitted?.(review);
    } catch (submitError) {
      setError(
        submitError?.response?.data?.error ||
          "Não foi possível enviar sua avaliação agora. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-[#43232d]">
              Escrever avaliação
            </h2>
            {productTitle && (
              <p className="mt-1 text-sm text-zinc-500">{productTitle}</p>
            )}
            {verified && (
              <p className="mt-1 text-xs font-semibold text-emerald-600">
                ✔ Vinculada à sua compra verificada
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="mt-6 rounded-xl bg-[#fff7f9] p-5 text-center">
            <p className="font-semibold text-[#43232d]">
              Obrigada pela sua avaliação! 💗
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Ela será publicada assim que for revisada pela nossa equipe.
            </p>
            <button
              type="button"
              onClick={resetAndClose}
              className="mt-4 rounded-xl bg-[#d9536f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c14b66]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#43232d]">
                Sua nota
              </label>
              <StarRating value={rating} onChange={setRating} size={26} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#43232d]">
                Título (opcional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={80}
                className="w-full rounded-xl border border-[#eedde3] px-3.5 py-2.5 text-sm text-[#43232d] outline-none focus:border-[#d9536f]"
                placeholder="Resuma sua experiência"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#43232d]">
                Comentário
              </label>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                maxLength={1000}
                className="w-full rounded-xl border border-[#eedde3] px-3.5 py-2.5 text-sm text-[#43232d] outline-none focus:border-[#d9536f]"
                placeholder="Conte como foi usar o produto"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#43232d]">
                  Nome
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  readOnly={Boolean(verified?.name)}
                  className="w-full rounded-xl border border-[#eedde3] px-3.5 py-2.5 text-sm text-[#43232d] outline-none focus:border-[#d9536f] read-only:bg-zinc-50"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#43232d]">
                  Cidade (opcional)
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="w-full rounded-xl border border-[#eedde3] px-3.5 py-2.5 text-sm text-[#43232d] outline-none focus:border-[#d9536f]"
                  placeholder="Sua cidade"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#43232d]">
                Foto (opcional)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setPhoto(event.target.files?.[0] || null)}
                className="w-full text-sm text-zinc-600"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[#d9536f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c14b66] disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Enviar avaliação"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
