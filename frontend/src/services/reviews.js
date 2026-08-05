import { api } from "./api";

// =====================
// PÚBLICO — página do produto
// =====================

export async function fetchProductReviews(productId) {
  const { data } = await api.get(
    `/reviews/product/${productId}`
  );

  return data;
}

// Reaproveita a verificação de posse do pedido do Acompanhar Pedido
// (número do pedido + e-mail cadastrado) — não é um endpoint novo de
// autenticação, só devolve quais produtos deste pedido pago ainda podem
// virar avaliação verificada.
export async function fetchOrderReviewEligibility({ orderId, email }) {
  const { data } = await api.post(
    "/reviews/order-eligibility",
    {
      order_id: orderId,
      email,
    }
  );

  return data;
}

export async function submitReview({
  productId,
  name,
  city,
  state,
  rating,
  title,
  comment,
  photo,
  recommends,
  orderId,
  email,
}) {
  const form = new FormData();

  form.append("product_id", productId);
  form.append("name", name);
  form.append("rating", rating);
  form.append("comment", comment);

  if (city) form.append("city", city);
  if (state) form.append("state", state);
  if (title) form.append("title", title);
  if (photo) form.append("foto", photo);
  if (recommends !== undefined) {
    form.append("recommends", String(recommends));
  }
  if (orderId) form.append("order_id", orderId);
  if (email) form.append("email", email);

  const { data } = await api.post(
    "/reviews",
    form
  );

  return data;
}

// =====================
// ADMIN
// =====================

export async function fetchAdminReviews({ approved, productId } = {}) {
  const { data } = await api.get(
    "/reviews",
    {
      params: {
        approved,
        product_id: productId,
      },
    }
  );

  return data;
}

export async function approveReview(id) {
  const { data } = await api.patch(
    `/reviews/${id}/approve`
  );

  return data;
}

export async function hideReview(id) {
  const { data } = await api.patch(
    `/reviews/${id}/hide`
  );

  return data;
}

export async function updateReviewText(id, { title, comment }) {
  const { data } = await api.patch(
    `/reviews/${id}`,
    { title, comment }
  );

  return data;
}

export async function replyReview(id, response) {
  const { data } = await api.post(
    `/reviews/${id}/reply`,
    { response }
  );

  return data;
}

export async function deleteReview(id) {
  await api.delete(`/reviews/${id}`);
}
