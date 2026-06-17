import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Package,
  Search,
  Truck,
} from "lucide-react";
import {
  useLocation,
} from "react-router-dom";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  api,
} from "../services/api";
import {
  OrderCreditCardCard,
} from "../components/orders/OrderCreditCardCard";
import {
  OrderPixCard,
} from "../components/orders/OrderPixCard";
import {
  socket,
} from "../websocket/socket";
import {
  useCommercialPolicy,
} from "../context/useCommercialPolicy";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "/api";

const PAYMENT_STATUS_SYNC_INTERVAL_MS =
  5000;

function formatMoney(value) {
  return Number(value || 0)
    .toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      }
    );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value)
    .toLocaleString(
      "pt-BR",
      {
        dateStyle: "long",
        timeStyle: "short",
      }
    );
}

function getProductImage(item) {
  const image =
    item.product?.images?.[0]
      ?.image_url ||
    "";
  const apiBase =
    API_URL.replace(/\/$/, "");

  if (
    !image ||
    image.startsWith("http") ||
    image.startsWith("data:") ||
    image.startsWith(
      `${apiBase}/`
    )
  ) {
    return image;
  }

  return `${apiBase}${image.startsWith("/") ? "" : "/"}${image}`;
}

function getPaymentInfo(
  order
) {
  if (
    [
      "approved",
      "paid",
    ].includes(
      order.payment_status
    )
  ) {
    return {
      label:
        "Pagamento confirmado",
      description:
        "Seu pedido foi recebido e seguirá para preparação.",
      icon:
        CheckCircle2,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (
    order.payment_status ===
    "rejected"
  ) {
    return {
      label:
        "Pagamento não aprovado",
      description:
        "Escolha outra forma de pagamento no checkout.",
      icon:
        CreditCard,
      className:
        "border-red-200 bg-red-50 text-red-700",
    };
  }

  return {
    label:
      "Aguardando pagamento",
    description:
      "Assim que o pagamento for confirmado, o pedido seguirá para envio.",
    icon:
      Clock3,
    className:
      "border-amber-200 bg-amber-50 text-amber-800",
  };
}

export default function OrderTrackingPage() {
  const {
    pix_discount_percent: pixDiscountPercent,
    card_interest_free_installments: interestFreeInstallments,
    card_max_installments: maxInstallments,
  } = useCommercialPolicy();
  const location =
    useLocation();
  const initialData =
    location.state || {};
  const [orderId, setOrderId] =
    useState(
      initialData.orderId || ""
    );
  const [email, setEmail] =
    useState(
      initialData.email || ""
    );
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [order, setOrder] =
    useState(null);
  const [paymentMethod,
    setPaymentMethod] =
    useState("pix");
  const [pixData, setPixData] =
    useState(null);
  const [loadingPix,
    setLoadingPix] =
    useState(false);
  const [paymentError,
    setPaymentError] =
    useState("");

  const fetchTrackedOrder =
    useCallback(async () => {
    const { data } =
      await api.post(
        "/checkout/tracking",
        {
          order_id:
            Number(orderId),
          email:
            email.trim(),
        }
      );

    return data;
    }, [
      email,
      orderId,
    ]);

  useEffect(() => {

    function handleOrderUpdated(
      updatedOrder
    ) {
      setOrder((previous) => {
        if (
          !previous ||
          updatedOrder.id !==
            previous.id
        ) {
          return previous;
        }

        return {
          ...previous,
          ...updatedOrder,
          items:
            previous.items,
          customer_name:
            previous.customer_name,
        };
      });
    }

    socket.on(
      "order_updated",
      handleOrderUpdated
    );

    return () => {
      socket.off(
        "order_updated",
        handleOrderUpdated
      );
    };
  }, []);

  useEffect(() => {
    if (
      !order?.id ||
      [
        "approved",
        "paid",
      ].includes(
        order.payment_status
      )
    ) {
      return undefined;
    }

    let active = true;

    async function syncPaymentStatus() {
      try {
        const data =
          await fetchTrackedOrder();

        if (active) {
          setOrder(data);
        }
      } catch {
        // Mantem o estado atual durante falhas temporarias de conexao.
      }
    }

    const syncInterval =
      window.setInterval(
        syncPaymentStatus,
        PAYMENT_STATUS_SYNC_INTERVAL_MS
      );

    return () => {
      active = false;
      window.clearInterval(
        syncInterval
      );
    };
  }, [
    fetchTrackedOrder,
    order?.id,
    order?.payment_status,
  ]);

  async function handleSearch(
    event
  ) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const data =
        await fetchTrackedOrder();

      setOrder(data);
      setPaymentMethod(
        data.payment_method ===
          "credit_card"
          ? "credit_card"
          : "pix"
      );
      setPixData(
        data.pix_code
          ? {
            qr_code:
              data.pix_code,
            qr_code_base64:
              data.pix_qrcode,
            amount:
              data.total,
            discount:
              data.discount,
          }
          : null
      );
      setPaymentError("");
    } catch (requestError) {
      setOrder(null);
      setError(
        requestError.response?.data
          ?.error ||
          "Não foi possível consultar seu pedido."
      );
    } finally {
      setLoading(false);
    }
  }

  async function generatePix() {
    if (!order) {
      return;
    }

    try {
      setLoadingPix(true);
      setPaymentError("");

      const { data } =
        await api.post(
          "/payment/pix",
          {
            order_id:
              order.id,
          }
        );

      setPixData(data);
      setOrder((previous) => ({
        ...previous,
        payment_method:
          "pix",
        payment_status:
          "pending",
        discount:
          data.discount,
        total:
          data.amount,
        pix_code:
          data.qr_code,
        pix_qrcode:
          data.qr_code_base64,
      }));
    } catch (requestError) {
      setPaymentError(
        requestError.response?.data
          ?.error ||
          "Não foi possível gerar o PIX agora."
      );
    } finally {
      setLoadingPix(false);
    }
  }

  const paymentInfo =
    order
      ? getPaymentInfo(order)
      : null;
  const PaymentIcon =
    paymentInfo?.icon;
  const canPay =
    order &&
    ![
      "approved",
      "paid",
    ].includes(
      order.payment_status
    );
  const regularTotal =
    Number(
      (
        Number(order?.subtotal || 0) +
        Number(order?.shipping || 0)
      ).toFixed(2)
    );
  const pixDiscount =
    Number(
      (
        regularTotal *
        (pixDiscountPercent / 100)
      ).toFixed(2)
    );
  const pixTotal =
    Number(
      (
        regularTotal -
        pixDiscount
      ).toFixed(2)
    );
  const cardOrder =
    order
      ? {
        ...order,
        discount: 0,
        total:
          regularTotal,
      }
      : null;

  return (
    <div className="bg-[#fffafb] px-5 py-10 text-[#43232d] sm:py-16">
      <div className="mx-auto max-w-[980px]">
        <div className="mx-auto mb-9 max-w-[620px] text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#c74c68]">
            Seu pedido Helô
          </p>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            Acompanhe sua compra
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#76616a] sm:text-base">
            Consulte pagamento e entrega com o número do pedido e o e-mail informado na compra.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="mx-auto grid max-w-[700px] gap-4 rounded-[28px] border border-[#f0e0e6] bg-white p-5 shadow-[0_18px_48px_rgba(88,35,52,0.05)] sm:grid-cols-[160px_1fr_auto] sm:p-6"
        >
          <label>
            <span className="mb-2 block text-xs font-semibold text-[#705763]">
              Pedido
            </span>
            <input
              value={orderId}
              onChange={(event) =>
                setOrderId(
                  event.target.value
                    .replace(/\D/g, "")
                )
              }
              placeholder="Ex.: 128"
              required
              className="h-14 w-full rounded-xl border border-[#ecdce2] px-4 text-sm outline-none focus:border-[#d9536f] focus:ring-4 focus:ring-[#fff0f4]"
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold text-[#705763]">
              E-mail da compra
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="voce@email.com"
              required
              className="h-14 w-full rounded-xl border border-[#ecdce2] px-4 text-sm outline-none focus:border-[#d9536f] focus:ring-4 focus:ring-[#fff0f4]"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-auto flex h-14 items-center justify-center gap-2 rounded-xl bg-[#d9536f] px-6 text-sm font-semibold text-white transition hover:bg-[#c64c66] disabled:opacity-60"
          >
            <Search size={16} />
            {loading
              ? "Buscando..."
              : "Consultar"}
          </button>
        </form>

        {error && (
          <p className="mx-auto mt-5 max-w-[700px] rounded-xl border border-red-100 bg-red-50 p-4 text-center text-sm text-red-700">
            {error}
          </p>
        )}

        {order && paymentInfo && (
          <section className="mx-auto mt-8 max-w-[700px] rounded-[28px] border border-[#f0e0e6] bg-white p-6 shadow-[0_18px_48px_rgba(88,35,52,0.05)] sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-[#f2e7eb] pb-6 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b74b65]">
                  Pedido #{order.id}
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Olá, {order.customer_name || "cliente"}
                </h2>
                <p className="mt-1 text-sm text-[#78636b]">
                  Realizado em {formatDate(order.created_at)}
                </p>
              </div>
              <p className="text-2xl font-semibold text-[#43232d]">
                {formatMoney(order.total)}
              </p>
            </div>

            <div className={`mt-6 flex gap-3 rounded-2xl border p-4 ${paymentInfo.className}`}>
              <PaymentIcon size={21} className="shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  {paymentInfo.label}
                </p>
                <p className="mt-1 text-xs leading-5">
                  {paymentInfo.description}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#fff7f9] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Truck size={17} className="text-[#d9536f]" />
                  Entrega
                </div>
                <p className="text-sm text-[#78636b]">
                  {order.shipping_method || "A definir"}
                </p>
                {order.shipping_deadline && (
                  <p className="mt-1 text-xs text-[#78636b]">
                    {order.shipping_deadline}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-[#fff7f9] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <CreditCard size={17} className="text-[#d9536f]" />
                  Pagamento
                </div>
                <p className="text-sm text-[#78636b]">
                  {order.payment_method === "pix"
                    ? "PIX"
                    : order.payment_method === "credit_card"
                      ? "Cartão de crédito"
                      : "Aguardando escolha"}
                </p>
                {order.paid_at && (
                  <p className="mt-1 text-xs text-[#78636b]">
                    Confirmado em {formatDate(order.paid_at)}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-7">
              <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Package size={17} className="text-[#d9536f]" />
                Itens do pedido
              </p>
              <div className="space-y-3">
                {order.items.map(
                  (item) => {
                    const image =
                      getProductImage(
                        item
                      );

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl border border-[#f3e7eb] p-3"
                      >
                        {image && (
                          <img
                            src={image}
                            alt=""
                            className="h-14 w-14 rounded-xl object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.product.title}
                          </p>
                          <p className="mt-1 text-xs text-[#78636b]">
                            Quantidade: {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatMoney(
                            Number(item.unit_price) *
                            Number(item.quantity)
                          )}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {canPay && (
              <div className="mt-8 border-t border-[#f2e7eb] pt-7">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b74b65]">
                  Concluir compra
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  Escolha como pagar
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#78636b]">
                  Seu pedido está reservado. Pague por PIX com {pixDiscountPercent}% de desconto ou cartão.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentMethod(
                        "pix"
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      paymentMethod === "pix"
                        ? "border-[#d85c7a] bg-[#fff5f7]"
                        : "border-[#eee2e6]"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      PIX
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {pixDiscountPercent}% de desconto
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentMethod(
                        "credit_card"
                      )
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      paymentMethod === "credit_card"
                        ? "border-[#d85c7a] bg-[#fff5f7]"
                        : "border-[#eee2e6]"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      Cartão
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {interestFreeInstallments}x sem juros
                    </p>
                  </button>
                </div>

                {paymentError && (
                  <p className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                    {paymentError}
                  </p>
                )}

                <div className="mt-6">
                  {paymentMethod === "pix" && (
                    <OrderPixCard
                      generatePix={
                        generatePix
                      }
                      loadingPix={
                        loadingPix
                      }
                      pixData={
                        pixData
                      }
                      order={order}
                      pixDiscount={
                        pixDiscount
                      }
                      pixTotal={
                        pixTotal
                      }
                      pixDiscountPercent={
                        pixDiscountPercent
                      }
                    />
                  )}
                  {paymentMethod === "credit_card" && (
                    <OrderCreditCardCard
                      order={cardOrder}
                      maxInstallments={
                        maxInstallments
                      }
                      initialCustomer={{
                        email,
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
