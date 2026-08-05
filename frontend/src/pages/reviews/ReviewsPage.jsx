import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Check,
  EyeOff,
  MessageSquareReply,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";

import {
  approveReview,
  deleteReview,
  fetchAdminReviews,
  hideReview,
  replyReview,
  updateReviewText,
} from "../../services/reviews";

const API_URL =
  import.meta.env.VITE_API_URL || "/api";

function resolvePhotoUrl(photoUrl) {
  if (!photoUrl) return null;
  if (/^https?:\/\//.test(photoUrl)) return photoUrl;
  return `${API_URL.replace(/\/$/, "")}${photoUrl}`;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const TABS = [
  { key: "pending", label: "Pendentes", approved: false },
  { key: "approved", label: "Publicadas", approved: true },
  { key: "all", label: "Todas", approved: undefined },
];

export default function ReviewsPage() {
  const [tab, setTab] = useState("pending");
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", comment: "" });
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState("");

  const activeTab = TABS.find((item) => item.key === tab) || TABS[0];

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAdminReviews({ approved: activeTab.approved });
      setReviews(data);
    } catch {
      setNotice("Não foi possível carregar as avaliações.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    await approveReview(id);
    load();
  }

  async function handleHide(id) {
    await hideReview(id);
    load();
  }

  async function handleDelete(id) {
    if (!window.confirm("Excluir esta avaliação definitivamente?")) return;
    await deleteReview(id);
    load();
  }

  function startEdit(review) {
    setEditingId(review.id);
    setEditForm({ title: review.title || "", comment: review.comment });
  }

  async function saveEdit(id) {
    await updateReviewText(id, editForm);
    setEditingId(null);
    load();
  }

  function startReply(review) {
    setReplyingId(review.id);
    setReplyText(review.admin_response || "");
  }

  async function saveReply(id) {
    await replyReview(id, replyText);
    setReplyingId(null);
    load();
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-3 md:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-5 md:p-6">
          <h1 className="text-2xl font-bold md:text-3xl">Avaliações</h1>
          <p className="mt-1 text-zinc-500">
            Modere as avaliações enviadas pelos clientes antes de publicá-las
            no site.
          </p>

          <div className="mt-5 flex gap-2">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  tab === item.key
                    ? "bg-black text-white"
                    : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {notice && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {notice}
          </p>
        )}

        {loading ? (
          <p className="text-center text-sm text-zinc-500">Carregando...</p>
        ) : reviews.length === 0 ? (
          <p className="rounded-2xl border bg-white p-6 text-center text-sm text-zinc-500">
            Nenhuma avaliação nesta lista.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {review.product?.title}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={15}
                          className={
                            star <= review.rating
                              ? "fill-[#e8a33d] text-[#e8a33d]"
                              : "text-zinc-200"
                          }
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-sm font-semibold">
                      {review.name}
                      {review.city && (
                        <span className="font-normal text-zinc-500">
                          {" "}
                          • {review.city}
                          {review.state ? `/${review.state}` : ""}
                        </span>
                      )}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span>{formatDateTime(review.created_at)}</span>
                      {review.verified_purchase && (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                          <BadgeCheck size={13} />
                          Compra verificada
                        </span>
                      )}
                      <span
                        className={
                          review.approved
                            ? "font-semibold text-emerald-600"
                            : "font-semibold text-amber-600"
                        }
                      >
                        {review.approved ? "Publicada" : "Pendente"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!review.approved && (
                      <button
                        type="button"
                        onClick={() => handleApprove(review.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <Check size={14} />
                        Aprovar
                      </button>
                    )}
                    {review.approved && (
                      <button
                        type="button"
                        onClick={() => handleHide(review.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                      >
                        <EyeOff size={14} />
                        Ocultar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(review)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => startReply(review)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                    >
                      <MessageSquareReply size={14} />
                      Responder
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                      Excluir
                    </button>
                  </div>
                </div>

                {review.photo_url && (
                  <img
                    src={resolvePhotoUrl(review.photo_url)}
                    alt=""
                    className="mt-3 h-20 w-20 rounded-xl object-cover"
                  />
                )}

                {editingId === review.id ? (
                  <div className="mt-3 space-y-2 rounded-xl bg-zinc-50 p-3">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Título"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editForm.comment}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, comment: event.target.value }))
                      }
                      rows={3}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-zinc-400">
                      Corrija apenas erros de digitação — nunca altere o sentido
                      do comentário do cliente.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEdit(review.id)}
                        className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {review.title && (
                      <p className="mt-3 text-sm font-semibold">{review.title}</p>
                    )}
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      {review.comment}
                    </p>
                  </>
                )}

                {review.admin_response && replyingId !== review.id && (
                  <div className="mt-3 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Sua resposta
                    </p>
                    <p className="mt-1">{review.admin_response}</p>
                  </div>
                )}

                {replyingId === review.id && (
                  <div className="mt-3 space-y-2 rounded-xl bg-zinc-50 p-3">
                    <textarea
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      rows={2}
                      placeholder="Responda esta avaliação publicamente"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveReply(review.id)}
                        className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Salvar resposta
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyingId(null)}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
