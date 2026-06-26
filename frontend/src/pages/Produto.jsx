import {
  ChevronRight,
  CreditCard,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useCart } from "../context/CartContext";
import Formatter from "../utils/Formatter";
import UpsellProducts from "../components/UpsellProducts";
import ProductImagePreview from "../components/ProductImagePreview";
import MarkdownText, {
  MarkdownInline,
} from "../components/MarkdownText";
import { useCommercialPolicy } from "../context/useCommercialPolicy";
import {
  resetSeoMeta,
  setSeoMeta,
} from "../utils/seo";
import {
  buildMetaContentIds,
  buildMetaContents,
  trackMetaCustomEvent,
  trackMetaEvent,
} from "../services/metaPixel";
import { trackClarityEvent } from "../services/clarity";

const API_URL = import.meta.env.VITE_API_URL || "/api";

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatShippingPrice(value) {
  return Number(value) === 0 ? "Grátis" : formatBRL(value);
}

function formatShippingOptionPrice(option) {
  if (
    String(option?.name || "").startsWith("Moto Uber") &&
    Number(option?.price || 0) === 0
  ) {
    return "Grátis";
  }
  return formatShippingPrice(option.price);
}

function isSedexOption(option) {
  return String(option?.name || "").toLowerCase().includes("sedex");
}

function isPriorityShippingOption(option) {
  const name = String(option?.name || "");
  return (
    name.startsWith("Moto Uber") ||
    name.startsWith("Retirar em mãos") ||
    isSedexOption(option)
  );
}

export default function Produto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const {
    pix_discount_percent: pixDiscountPercent,
    cardLabel,
    freeShippingLabel,
  } = useCommercialPolicy();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [selected, setSelected] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [shippingCep, setShippingCep] = useState("");
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [shippingError, setShippingError] = useState("");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [feelingsExpanded, setFeelingsExpanded] = useState(false);
  const dragStartRef = useRef(null);
  const suppressImageClickRef = useRef(false);

  const cover = useMemo(() => {
    if (!product?.image_url) return "";
    return `${API_URL}${product.image_url}`;
  }, [product]);

  const gallery = useMemo(() => {
    if (!product?.images?.length) return [];
    return product.images
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((image) => ({ ...image, full: `${API_URL}${image.image_url}` }));
  }, [product]);

  const images = useMemo(
    () =>
      Array.from(
        new Map(
          [{ id: "cover", full: cover }, ...gallery]
            .filter((image) => Boolean(image.full))
            .map((image) => [image.full, image])
        ).values()
      ).slice(0, 10),
    [cover, gallery]
  );

  const feelingList = useMemo(
    () =>
      String(product?.o_que_vai_sentir || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    [product]
  );

  const destaquesList = useMemo(
    () =>
      String(product?.destaques || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
    [product]
  );

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/products/${id}`);
        if (!response.ok) throw new Error("Produto não encontrado");
        const data = await response.json();
        if (!active) return;
        setProduct(data);
        setSelected(
          data.image_url
            ? `${API_URL}${data.image_url}`
            : data.images?.[0]?.image_url
              ? `${API_URL}${data.images[0].image_url}`
              : ""
        );
        setQuantity(1);
        setShippingOptions([]);
        setShippingCep("");
      } catch {
        if (active) setProduct(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProduct();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!product) return undefined;
    const seoDescription =
      product.meta_description ||
      product.subtitle ||
      product.description ||
      "Compre cosméticos Helô para pele e cabelos com pagamento seguro e condições especiais.";
    setSeoMeta({
      title: `${product.title} | Helô Cosméticos`,
      description: seoDescription,
      image: cover || undefined,
      url: window.location.href,
    });
    return () => { resetSeoMeta(); };
  }, [cover, product]);

  useEffect(() => {
    if (!product) return;
    trackMetaEvent(
      "ViewContent",
      {
        currency: "BRL",
        value: Number(product.price || 0),
        content_ids: [String(product.id)],
        content_name: product.title,
        content_type: "product",
      },
      { eventId: `view_content_${product.id}` }
    );
  }, [product]);

  const mainImage = selected || cover;
  const selectedImageIndex = images.findIndex((image) => image.full === mainImage);
  const currentImageIndex = selectedImageIndex >= 0 ? selectedImageIndex : 0;
  const unavailable = product?.is_active === false;
  const category = String(product?.category || "beleza").replace(/[-_]/g, " ");
  const productTotal = Number(product?.price || 0) * quantity;
  const pixTotal = Number(
    (productTotal * (1 - pixDiscountPercent / 100)).toFixed(2)
  );
  const pixSavings = Number((productTotal - pixTotal).toFixed(2));

  const goToImage = useCallback((direction) => {
    if (images.length <= 1) return;
    const nextIndex = (currentImageIndex + direction + images.length) % images.length;
    setSelected(images[nextIndex].full);
  }, [currentImageIndex, images]);

  useEffect(() => {
    if (images.length <= 1) return undefined;

    function handleKeyDown(event) {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") return;
      if (event.key === "ArrowRight") goToImage(1);
      if (event.key === "ArrowLeft") goToImage(-1);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); };
  }, [goToImage, images.length]);

  function selectedItem() {
    return {
      product_id: product.id,
      title: product.title,
      subtitle: product.subtitle || "",
      price: Number(product.price || 0),
      image: mainImage || cover || "",
      quantity,
    };
  }

  function handleAddToCart() {
    addToCart(selectedItem());
    setAddedToCart(true);
    trackClarityEvent("add_to_cart_click");
    window.setTimeout(() => setAddedToCart(false), 2400);
  }

  function handleBuyNow() {
    const item = selectedItem();
    const itemValue = Number(item.price || 0) * Number(item.quantity || 1);
    trackClarityEvent("buy_now_click");
    trackMetaCustomEvent("DirectPurchaseClick", {
      currency: "BRL",
      value: itemValue,
      content_ids: [String(item.product_id)],
      content_type: "product",
      source: "product_page",
    });
    trackMetaEvent("InitiateCheckout", {
      currency: "BRL",
      value: itemValue,
      contents: buildMetaContents([item]),
      content_ids: buildMetaContentIds([item]),
      content_type: "product",
    });
    navigate("/checkout", { state: { directPurchaseItem: item } });
  }

  function handleGalleryPointerDown(event) {
    if (
      images.length <= 1 ||
      event.button > 0 ||
      event.target.closest("[data-gallery-control]")
    ) {
      return;
    }

    suppressImageClickRef.current = false;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleGalleryPointerMove(event) {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;

    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
      suppressImageClickRef.current = true;
      event.preventDefault();
    }
  }

  function handleGalleryPointerUp(event) {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== event.pointerId) {
      dragStartRef.current = null;
      return;
    }

    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    dragStartRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    suppressImageClickRef.current = true;
    goToImage(deltaX < 0 ? 1 : -1);
  }

  function handleGalleryPointerCancel(event) {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  }

  function handleGalleryClickCapture(event) {
    if (!suppressImageClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressImageClickRef.current = false;
  }

  function updateQuantity(value) {
    setQuantity(Math.max(1, value));
    setShippingOptions([]);
    setShippingError("");
  }

  function handleShippingCep(value) {
    setShippingCep(Formatter.cep(Formatter.onlyNumbers(value).slice(0, 8)));
    setShippingOptions([]);
    setShippingError("");
  }

  async function calculateProductShipping(event) {
    event.preventDefault();
    if (Formatter.onlyNumbers(shippingCep).length !== 8) {
      setShippingError("Informe um CEP válido.");
      return;
    }
    trackClarityEvent("calculate_shipping_click");
    try {
      setShippingLoading(true);
      setShippingError("");
      setShippingOptions([]);
      const response = await fetch(`${API_URL}/shipping/product-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: shippingCep, product_id: product.id, quantity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível calcular o frete.");
      setShippingOptions(data.slice().sort((a, b) => a.price - b.price));
    } catch (error) {
      setShippingError(
        error instanceof Error ? error.message : "Não foi possível calcular o frete."
      );
    } finally {
      setShippingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-helo-background py-16">
        <div className="mx-auto max-w-6xl px-6 text-center text-helo-text/70">
          Carregando produto...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-helo-background py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className="font-display text-3xl text-helo-dark">Produto não encontrado</h1>
          <p className="mt-2 text-helo-text/80">Verifique o link ou tente novamente.</p>
          <Link
            to="/produtos"
            className="mt-8 inline-flex rounded-2xl bg-helo-dark px-8 py-4 font-semibold text-white"
          >
            Voltar aos produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-sale-page min-h-screen pb-20">
      {/* Breadcrumb */}
      <div className="border-b border-[#f1e3e8] bg-white">
        <div className="product-sale-container flex items-center gap-2 py-3 text-sm text-zinc-500">
          <Link to="/produtos" className="transition hover:text-helo-dark">
            Produtos
          </Link>
          <ChevronRight size={14} />
          <span className="line-clamp-1 text-zinc-700">{product.title}</span>
        </div>
      </div>

      <main className="product-sale-container pb-12 pt-4 sm:pt-6 lg:pt-8">
        <div className="product-sale-hero grid items-start gap-5 sm:gap-8">

          {/* ── Galeria de imagens ── */}
          <section className="product-sale-gallery space-y-3 sm:space-y-4">
            <div className="product-sale-media bg-white p-2.5 sm:p-4">
              {/* "Clique para ampliar" — só desktop, inútil no touch */}
              <div className="mb-2 hidden items-center justify-end px-1 sm:flex">
                <span className="text-xs font-medium text-zinc-400">Clique para ampliar</span>
              </div>

              <div
                className="product-sale-image aspect-square relative w-full touch-pan-y touch-pinch-zoom select-none"
                onClickCapture={handleGalleryClickCapture}
                onPointerDown={handleGalleryPointerDown}
                onPointerMove={handleGalleryPointerMove}
                onPointerUp={handleGalleryPointerUp}
                onPointerCancel={handleGalleryPointerCancel}
                style={{ aspectRatio: "1 / 1" }}
              >
                <ProductImagePreview
                  src={mainImage}
                  alt={product.title}
                  className="h-full w-full cursor-grab rounded-[1.5rem] bg-[#fff7f9] active:cursor-grabbing"
                  imageClassName="h-full w-full rounded-[1.5rem] object-contain object-center"
                  onNavigate={images.length > 1 ? goToImage : undefined}
                  onZoomOpen={() => trackClarityEvent("product_image_zoom_open")}
                  showZoomHint
                  zoomLabel="Ampliar imagem do produto"
                />
                {images.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-[#873c50] shadow-sm">
                    {currentImageIndex + 1}/{images.length}
                  </div>
                )}
              </div>

              {/* Miniaturas */}
              {images.length > 1 && (
                <div className="mt-3 grid grid-cols-5 gap-2 sm:mt-4 sm:gap-3">
                  {images.map((image, index) => {
                    const active = image.full === mainImage;
                    return (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setSelected(image.full)}
                        className={`aspect-square overflow-hidden rounded-[1rem] border bg-white p-1.5 transition sm:rounded-[1.25rem] ${
                          active
                            ? "border-[#d85c7a] ring-2 ring-[#f8dfe5]"
                            : "border-[#f0e4e8] hover:border-[#e7bdc8]"
                        }`}
                        aria-label={`Ver imagem ${index + 1} do produto`}
                        aria-current={active ? "true" : undefined}
                      >
                        <img src={image.full} alt="" className="h-full w-full object-contain" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ── Painel de compra ── */}
          <section className="product-sale-panel-column">
            <div className="product-sale-card bg-white">

              {/* Categoria + marca */}
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0f4] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-[#b74662]">
                  <Sparkles size={12} />
                  {category}
                </p>
                <span className="text-xs font-medium text-[#b74662] sm:text-sm">Helô</span>
              </div>

              {/* Título do produto */}
              <h1 className="product-sale-title mt-2 font-display sm:mt-4">
                {product.title}
              </h1>

              {/* Subtítulo vindo do banco */}
              {product.subtitle && (
                <p className="product-sale-intro mt-1.5 text-zinc-600 sm:mt-3">
                  {product.subtitle}
                </p>
              )}

              {/* ── Badges comerciais — vindos do banco (destaques) ── */}
              {destaquesList.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4">
                  {destaquesList.map((badge) => (
                    <span
                      key={badge}
                      className="inline-flex items-center gap-1 rounded-full border border-[#f0dce4] bg-[#fff5f8] px-3 py-1 text-xs font-semibold text-[#b74662]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3 shrink-0"
                      >
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                      {badge}
                    </span>
                  ))}
                </div>
              )}

              {/* ── Destaques visuais — vindos do banco (o_que_vai_sentir) ── */}
              {feelingList.length > 0 && (
                <div className="mt-3 space-y-1.5 sm:mt-4 sm:space-y-2">
                  {(feelingsExpanded ? feelingList : feelingList.slice(0, 3)).map((feeling) => (
                    <div key={feeling} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#d85c7a] text-white">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-2.5 w-2.5"
                        >
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </span>
                      <span className="leading-snug">
                        <MarkdownInline>{feeling}</MarkdownInline>
                      </span>
                    </div>
                  ))}
                  {feelingList.length > 3 && !feelingsExpanded && (
                    <button
                      type="button"
                      onClick={() => setFeelingsExpanded(true)}
                      className="pl-6 text-xs font-semibold text-[#b74662] hover:text-[#d85c7a]"
                    >
                      ver mais benefícios
                    </button>
                  )}
                </div>
              )}

              {/* ── Bloco de preço + CTA — tudo num único bloco visual ── */}
              <div className="product-sale-price-box mt-3 px-4 py-4 sm:mt-5 sm:px-5 sm:py-5">

                {/* Linha 1: Preço principal + quantidade (discreta) */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {quantity > 1 && (
                      <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#a85a6d]">
                        Total · {quantity} unidades
                      </p>
                    )}
                    <p className="product-sale-price font-bold leading-none tracking-tight text-helo-text">
                      {formatBRL(productTotal)}
                    </p>
                  </div>

                  {!unavailable && (
                    <div className="flex shrink-0 items-center rounded-xl border border-[#eadfe3] bg-white">
                      <button
                        type="button"
                        onClick={() => updateQuantity(quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center text-zinc-400 transition hover:text-[#d85c7a]"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-zinc-700">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center text-zinc-400 transition hover:text-[#d85c7a]"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Linha 2: PIX em destaque + economia */}
                {pixDiscountPercent > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-[#b74662]">
                      PIX {formatBRL(pixTotal)}
                    </span>
                    {pixSavings > 0 && (
                      <span className="rounded-full bg-[#d85c7a] px-2.5 py-0.5 text-xs font-semibold text-white">
                        Economize {formatBRL(pixSavings)}
                      </span>
                    )}
                  </div>
                )}

                {/* Linha 3: Cartão (secundário) */}
                <p className="mt-1 text-xs text-zinc-500">
                  Cartão: {cardLabel}
                </p>

                {unavailable ? (
                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                    Este produto está indisponível no momento.
                  </div>
                ) : (
                  <>
                    {/* Frete */}
                    <p className="mt-2.5 flex items-center gap-1.5 text-xs text-[#a85a6d]">
                      <Truck size={12} className="shrink-0 text-[#d85c7a]" />
                      {freeShippingLabel} nas opções elegíveis.
                    </p>

                    {/* CTAs — imediatamente após o preço */}
                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className="product-sale-buy-button flex w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white transition sm:text-lg"
                      >
                        <ShoppingBag size={19} />
                        Comprar agora
                      </button>
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        className="h-[50px] w-full rounded-2xl border border-[#e5bac5] bg-white text-sm font-semibold text-[#b74662] transition hover:bg-[#fff5f7] sm:h-[58px] sm:text-base"
                      >
                        {addedToCart ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}
                      </button>
                    </div>

                    {/* Selos compactos */}
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[#f4e1e7] pt-3">
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <ShieldCheck size={13} className="text-[#d85c7a]" />
                        Compra protegida
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Truck size={13} className="text-[#d85c7a]" />
                        Entrega por CEP
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <CreditCard size={13} className="text-[#d85c7a]" />
                        PIX ou cartão
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Calculadora de frete — fora do bloco de compra */}
              {!unavailable && (
                <form
                  className="product-sale-shipping mt-4 sm:mt-5"
                  onSubmit={calculateProductShipping}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#43232d]">
                    <Truck size={16} className="text-[#d85c7a]" />
                    Calcule o frete
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={shippingCep}
                      onChange={(event) => handleShippingCep(event.target.value)}
                      placeholder="00000-000"
                      aria-label="CEP para cálculo de frete"
                      className="h-11 min-w-0 flex-1 rounded-xl border border-[#eadfe3] bg-white px-4 text-sm outline-none transition focus:border-[#d85c7a]"
                    />
                    <button
                      type="submit"
                      disabled={shippingLoading}
                      className="h-11 rounded-xl border border-[#e5bac5] px-4 text-sm font-semibold text-[#b74662] transition hover:bg-[#fff5f7] disabled:opacity-60"
                    >
                      {shippingLoading ? "..." : "Calcular"}
                    </button>
                  </div>

                  {shippingError && (
                    <p className="mt-2 text-sm text-red-600">{shippingError}</p>
                  )}

                  {shippingOptions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {shippingOptions
                        .filter(
                          (option, index) =>
                            index < 3 || isPriorityShippingOption(option)
                        )
                        .map((option) => (
                          <div
                            key={`${option.name}-${option.price}`}
                            className="flex items-center justify-between gap-4 rounded-xl bg-white px-3.5 py-3 text-sm"
                          >
                            <span>
                              <span className="block font-medium text-zinc-800">{option.name}</span>
                              <span className="block text-xs text-zinc-500">{option.deadline}</span>
                              {Number(option.discount || 0) > 0 && (
                                <span className="mt-1 block text-xs font-medium text-emerald-700">
                                  Desconto de {formatBRL(option.discount)} aplicado
                                </span>
                              )}
                            </span>
                            <span className="text-right">
                              {Number(option.original_price) > Number(option.price) && (
                                <span className="block text-xs text-zinc-400 line-through">
                                  {formatBRL(option.original_price)}
                                </span>
                              )}
                              <span className="block font-semibold text-[#b74662]">
                                {formatShippingOptionPrice(option)}
                              </span>
                            </span>
                          </div>
                        ))}
                      <p className="pt-1 text-xs text-zinc-500">
                        Frete confirmado no checkout.
                      </p>
                    </div>
                  )}
                </form>
              )}
            </div>
          </section>
        </div>

        {/* 8. O que você vai sentir — logo após os CTAs, vende resultado emocional */}
        {feelingList.length > 0 && (
          <article className="product-sale-feelings mt-10 bg-white p-7 sm:p-9">
            <h2 className="font-display text-3xl text-[#43232d]">O que você vai sentir</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {feelingList.map((feeling) => (
                <div
                  key={feeling}
                  className="flex gap-3 rounded-2xl bg-[#fff7f9] px-4 py-3.5 text-sm leading-6 text-zinc-700"
                >
                  <Sparkles size={16} className="mt-1 shrink-0 text-[#d85c7a]" />
                  <span>
                    <MarkdownInline>{feeling}</MarkdownInline>
                  </span>
                </div>
              ))}
            </div>
          </article>
        )}

        {/* 9. Sobre o produto */}
        <article className="product-sale-description mt-6 bg-white p-7 sm:p-9">
          <h2 className="font-display text-3xl text-[#43232d]">Sobre o produto</h2>
          <div className={!descriptionExpanded ? "line-clamp-5 overflow-hidden" : undefined}>
            <MarkdownText className="mt-5 text-base leading-8 text-zinc-600">
              {product.description || "Sem descrição cadastrada."}
            </MarkdownText>
          </div>
          {(product.description?.length ?? 0) > 300 && (
            <button
              type="button"
              onClick={() => setDescriptionExpanded((v) => !v)}
              className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[#b74662] transition hover:text-[#d85c7a]"
            >
              {descriptionExpanded ? "Ler menos" : "Ler mais"}
              <ChevronRight
                size={15}
                className={`transition-transform duration-200 ${descriptionExpanded ? "-rotate-90" : "rotate-90"}`}
              />
            </button>
          )}
        </article>

        {/* 10. Compra segura / Entrega / PIX / Parcelamento */}
        <section className="product-sale-trust mt-6 grid gap-4 bg-white p-5 sm:p-7">
          <div className="product-sale-trust-item flex items-start gap-4 rounded-2xl p-5">
            <ShieldCheck size={25} className="shrink-0 text-[#d85c7a]" />
            <div>
              <p className="text-base font-semibold text-[#43232d]">Compra protegida</p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">Pagamento seguro pelo Mercado Pago.</p>
            </div>
          </div>
          <div className="product-sale-trust-item flex items-start gap-4 rounded-2xl p-5">
            <Truck size={25} className="shrink-0 text-[#d85c7a]" />
            <div>
              <p className="text-base font-semibold text-[#43232d]">Entrega por CEP</p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">Opções exibidas antes do pagamento.</p>
            </div>
          </div>
          <div className="product-sale-trust-item flex items-start gap-4 rounded-2xl p-5">
            <CreditCard size={25} className="shrink-0 text-[#d85c7a]" />
            <div>
              <p className="text-base font-semibold text-[#43232d]">PIX ou cartão</p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">{cardLabel}.</p>
            </div>
          </div>
        </section>

        {/* 11. Como usar — dúvida de quem já está interessado */}
        {product.dicas_uso && (
          <article className="product-sale-usage mt-6 p-7 sm:p-9">
            <h2 className="font-display text-3xl text-[#43232d]">Como usar</h2>
            <MarkdownText className="mt-5 max-w-4xl text-base leading-8 text-zinc-600">
              {product.dicas_uso}
            </MarkdownText>
          </article>
        )}

        {/* 12. Produtos relacionados — por último para não desviar do produto principal */}
        <UpsellProducts
          excludedIds={[product.id]}
          onAdd={addToCart}
          title="Combine com este cuidado"
        />
      </main>
    </div>
  );
}
