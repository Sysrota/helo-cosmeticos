import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  MapPin,
  Package,
  ReceiptText,
  Search,
  Truck,
} from "lucide-react";
import {
  useLocation,
} from "react-router-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  api,
} from "../services/api";
import {
  OrderBoletoCard,
} from "../components/orders/OrderBoletoCard";
import {
  OrderCreditCardCard,
} from "../components/orders/OrderCreditCardCard";
import {
  OrderPixCard,
} from "../components/orders/OrderPixCard";
import ProductImagePreview from "../components/ProductImagePreview";
import {
  socket,
} from "../websocket/socket";
import {
  useCommercialPolicy,
} from "../context/useCommercialPolicy";
import {
  buildMetaContentIds,
  buildMetaContents,
  trackMetaEvent,
} from "../services/metaPixel";

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

const orderStatusLabels = {
  pending: "Pendente",
  paid: "Pago",
  preparing: "Em preparação",
  shipping: "Em rota de entrega",
  finished: "Entregue",
  cancelled: "Cancelado",
};

const shippingStatusLabels = {
  created: "Etiqueta criada",
  pending: "Pendente",
  released: "Etiqueta paga",
  generated: "Etiqueta gerada",
  received: "Recebido na distribuição",
  posted: "Postado",
  delivered: "Entregue",
  undelivered: "Não entregue",
  paused: "Pausado",
  suspended: "Suspenso",
  cancelled: "Cancelado",
  canceled: "Cancelado",
};

function getShippingStatusLabel(status) {
  return (
    shippingStatusLabels[status] ||
    status ||
    "Aguardando postagem"
  );
}

const orderFlow = [
  {
    status: "paid",
    label: "Pagamento",
    description: "Pagamento confirmado",
  },
  {
    status: "preparing",
    label: "Preparação",
    description: "Pedido em separação",
  },
  {
    status: "shipping",
    label: "Em rota de entrega",
    description: "Saiu para entrega",
  },
  {
    status: "finished",
    label: "Entregue",
    description: "Pedido finalizado",
  },
];

function getOrderFlowIndex(order) {
  if (
    ![
      "approved",
      "paid",
    ].includes(
      order.payment_status
    )
  ) {
    return -1;
  }

  const statusIndex =
    orderFlow.findIndex(
      (step) =>
        step.status ===
        order.status
    );

  return Math.max(
    0,
    statusIndex
  );
}

function getAddressText(address) {
  if (!address) {
    return "";
  }

  return [
    [
      address.street,
      address.number,
    ]
      .filter(Boolean)
      .join(", "),
    address.district,
    [
      address.city,
      address.state,
    ]
      .filter(Boolean)
      .join(" - "),
    address.cep,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getOrderDisplayNumber(order) {
  return order?.order_number || order?.id;
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
  const [boletoData, setBoletoData] =
    useState(null);
  const [loadingBoleto,
    setLoadingBoleto] =
    useState(false);
  const [paymentError,
    setPaymentError] =
    useState("");
  const purchaseTrackedRef = useRef(null);
  // Ref espelho do state — permite ler order dentro de callbacks sem closure stale
  const latestOrderRef = useRef(null);

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

  // Mantém ref espelho do state para usar em callbacks
  useEffect(() => {
    latestOrderRef.current = order;
  }, [order]);

  // Na carga inicial: se pedido já está pago, registra no localStorage para
  // evitar que eventos de socket posteriores disparem Purchase novamente.
  useEffect(() => {
    if (
      order?.id &&
      ["approved", "paid"].includes(order.payment_status)
    ) {
      localStorage.setItem(`helo_purchase_${order.id}`, "1");
    }
  // Roda apenas quando order.id muda (primeira carga do pedido)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  useEffect(() => {
    function handleOrderUpdated(updatedOrder) {
      const current = latestOrderRef.current;
      if (!current || updatedOrder.id !== current.id) return;

      const nextOrder = {
        ...current,
        ...updatedOrder,
        items: current.items,
        customer_name: current.customer_name,
      };

      setOrder(nextOrder);

      if (["approved", "paid"].includes(updatedOrder.payment_status)) {
        trackPurchase(nextOrder);
      }
    }

    socket.on("order_updated", handleOrderUpdated);
    return () => { socket.off("order_updated", handleOrderUpdated); };
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
        data.payment_method === "credit_card"
          ? "credit_card"
          : data.payment_method === "boleto"
            ? "boleto"
            : "pix"
      );
      setPixData(
        data.pix_code
          ? {
            qr_code: data.pix_code,
            qr_code_base64: data.pix_qrcode,
            amount: data.total,
            discount: data.discount,
          }
          : null
      );
      setBoletoData(
        data.boleto_url || data.boleto_barcode
          ? {
            boleto_url: data.boleto_url,
            boleto_barcode: data.boleto_barcode,
            amount: data.total,
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

  async function generateBoleto(cpf) {
    if (!order) return;
    try {
      setLoadingBoleto(true);
      setPaymentError("");
      const { data } = await api.post("/payment/boleto", {
        order_id: order.id,
        cpf: cpf || undefined,
      });
      setBoletoData(data);
      setOrder((previous) => ({
        ...previous,
        payment_method: "boleto",
        payment_status: "pending",
        boleto_url: data.boleto_url,
        boleto_barcode: data.boleto_barcode,
        total: data.amount,
      }));
    } catch (requestError) {
      setPaymentError(
        requestError.response?.data?.error ||
          "Não foi possível gerar o boleto. Verifique seus dados e tente novamente."
      );
    } finally {
      setLoadingBoleto(false);
    }
  }

  const paymentInfo =
    order
      ? getPaymentInfo(order)
      : null;
  const PaymentIcon =
    paymentInfo?.icon;
  const flowIndex =
    order
      ? getOrderFlowIndex(order)
      : -1;
  const addressText =
    getAddressText(
      order?.address
    );
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

  function trackPurchase(paidOrder) {
    const trackedOrder = paidOrder || latestOrderRef.current;
    if (!trackedOrder?.id) return;

    // localStorage persiste entre recargas — evita disparo duplo se usuário
    // recarregar a página enquanto MP retenta o webhook.
    const storageKey = `helo_purchase_${trackedOrder.id}`;
    if (localStorage.getItem(storageKey)) return;
    if (purchaseTrackedRef.current === trackedOrder.id) return;

    localStorage.setItem(storageKey, "1");
    purchaseTrackedRef.current = trackedOrder.id;

    const items = trackedOrder.items || [];
    const numItems = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

    trackMetaEvent(
      "Purchase",
      {
        currency: "BRL",
        value: Number(trackedOrder.total || 0),
        contents: buildMetaContents(items),
        content_ids: buildMetaContentIds(items),
        content_type: "product",
        num_items: numItems || undefined,
        order_id: String(trackedOrder.id),
      },
      { eventId: `purchase_${trackedOrder.id}` }
    );
  }

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
          <section className="mx-auto mt-8 max-w-[860px] rounded-[28px] border border-[#f0e0e6] bg-white p-6 shadow-[0_18px_48px_rgba(88,35,52,0.05)] sm:p-8">
            <div className="flex flex-col justify-between gap-4 border-b border-[#f2e7eb] pb-6 sm:flex-row sm:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b74b65]">
                  Pedido #{getOrderDisplayNumber(order)}
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  Olá, {order.customer_name || "cliente"}
                </h2>
                <p className="mt-1 text-sm text-[#78636b]">
                  Realizado em {formatDate(order.created_at)}
                </p>
              </div>
              <div className="sm:text-right">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  order.status === "cancelled"
                    ? "bg-red-50 text-red-700"
                    : "bg-[#fff0f4] text-[#b74662]"
                }`}>
                  {order.status === "cancelled" && (
                    <AlertCircle size={14} />
                  )}
                  {orderStatusLabels[order.status] || order.status}
                </span>
                <p className="mt-3 text-2xl font-semibold text-[#43232d]">
                  {formatMoney(order.total)}
                </p>
              </div>
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

            <div className="mt-6 rounded-3xl border border-[#f2e1e7] bg-[#fffafb] p-5">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#b74b65]">
                Trâmite do pedido
              </p>

              {order.status === "cancelled" ? (
                <div className="flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
                  <AlertCircle size={20} className="shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      Pedido cancelado
                    </p>
                    <p className="mt-1 text-xs leading-5">
                      O fluxo deste pedido foi encerrado. Se precisar, fale com nossa equipe de atendimento.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-4">
                  {orderFlow.map(
                    (step, index) => {
                      const completed =
                        flowIndex >= index;
                      const current =
                        flowIndex === index;

                      return (
                        <div
                          key={step.status}
                          className={`rounded-2xl border p-4 ${
                            completed
                              ? "border-[#d9536f] bg-white"
                              : "border-[#efdee4] bg-white/70"
                          }`}
                        >
                          <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
                            completed
                              ? "border-[#d9536f] bg-[#d9536f] text-white"
                              : "border-[#ead8df] bg-white text-[#b69aa4]"
                          }`}>
                            {completed
                              ? <CheckCircle2 size={18} />
                              : index + 1}
                          </div>
                          <p className={`text-sm font-semibold ${
                            completed
                              ? "text-[#43232d]"
                              : "text-[#9a828b]"
                          }`}>
                            {step.label}
                            {current && (
                              <span className="ml-1 text-[#d9536f]">
                                agora
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#78636b]">
                            {step.description}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
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
                {(order.tracking_code || order.tracking_url || order.shipping_status) && (
                  <div className="mt-3 rounded-xl border border-[#efd9e1] bg-white p-3">
                    <p className="text-xs font-semibold text-[#43232d]">
                      {getShippingStatusLabel(order.shipping_status)}
                    </p>
                    {order.tracking_code && (
                      <p className="mt-1 break-all text-xs text-[#78636b]">
                        Código: {order.tracking_code}
                      </p>
                    )}
                    {order.tracking_url && (
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#d9536f] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#c64c66]"
                      >
                        <ExternalLink size={13} />
                        Abrir rastreio
                      </a>
                    )}
                  </div>
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
                      : order.payment_method === "boleto"
                        ? "Boleto bancário"
                        : "Aguardando escolha"}
                </p>
                {order.paid_at && (
                  <p className="mt-1 text-xs text-[#78636b]">
                    Confirmado em {formatDate(order.paid_at)}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-[#fff7f9] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <MapPin size={17} className="text-[#d9536f]" />
                  Endereço
                </div>
                <p className="text-sm leading-6 text-[#78636b]">
                  {addressText || "Endereço não informado"}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#f3e7eb] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ReceiptText size={17} className="text-[#d9536f]" />
                Resumo financeiro
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4 text-[#78636b]">
                  <span>Produtos</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-4 text-[#78636b]">
                  <span>Frete</span>
                  <span>{formatMoney(order.shipping)}</span>
                </div>
                {Number(order.discount || 0) > 0 && (
                  <div className="flex justify-between gap-4 text-[#b74662]">
                    <span>Desconto</span>
                    <span>- {formatMoney(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-4 border-t border-[#f1e2e7] pt-3 font-semibold text-[#43232d]">
                  <span>Total</span>
                  <span>{formatMoney(order.total)}</span>
                </div>
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
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#fff8fa]">
                          <ProductImagePreview
                            src={image}
                            alt={item.product.title}
                            className="h-full w-full"
                            imageClassName="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.product.title}
                          </p>
                          {item.product.subtitle && (
                            <p className="mt-1 line-clamp-2 text-xs leading-4 text-[#78636b]">
                              {item.product.subtitle}
                            </p>
                          )}
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
                  Seu pedido está reservado. Pague por PIX com desconto exclusivo, cartão ou boleto bancário.
                </p>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pix")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      paymentMethod === "pix"
                        ? "border-[#d85c7a] bg-[#fff5f7]"
                        : "border-[#eee2e6]"
                    }`}
                  >
                    <p className="text-sm font-semibold">PIX</p>
                    <p className="mt-1 text-xs text-zinc-500">Desconto exclusivo no PIX</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("credit_card")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      paymentMethod === "credit_card"
                        ? "border-[#d85c7a] bg-[#fff5f7]"
                        : "border-[#eee2e6]"
                    }`}
                  >
                    <p className="text-sm font-semibold">Cartão</p>
                    <p className="mt-1 text-xs text-zinc-500">{interestFreeInstallments}x sem juros</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("boleto")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      paymentMethod === "boleto"
                        ? "border-[#d85c7a] bg-[#fff5f7]"
                        : "border-[#eee2e6]"
                    }`}
                  >
                    <p className="text-sm font-semibold">Boleto</p>
                    <p className="mt-1 text-xs text-zinc-500">Vence em 3 dias úteis</p>
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
                      maxInstallments={maxInstallments}
                      initialCustomer={{ email }}
                      onPaymentApproved={trackPurchase}
                    />
                  )}
                  {paymentMethod === "boleto" && (
                    <OrderBoletoCard
                      generateBoleto={generateBoleto}
                      loadingBoleto={loadingBoleto}
                      boletoData={boletoData}
                      order={order}
                      total={regularTotal}
                      initialCpf={order.contact_cpf || ""}
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
