import {
  Barcode,
  ChevronRight,
  CreditCard,
  Heart,
  Lock,
  Minus,
  Package,
  Plus,
  ShieldCheck,
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
  trackMetaCustomEvent,
  trackMetaEvent,
} from "../services/metaPixel";
import { trackClarityEvent } from "../services/clarity";
import { saveWhatsAppProductContext } from "../utils/whatsappContext";
import ProductReviews from "../components/reviews/ProductReviews";
import ProductAudienceFit from "../components/product/ProductAudienceFit";
import ProductKitContents from "../components/product/ProductKitContents";
import StarRating from "../components/reviews/StarRating";
import pixIcon from "../assets/icon-pix.png";
import { fetchProductReviews } from "../services/reviews";

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

function formatReviewAverage(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function CompactReviewSummary({ data, onShowAll }) {
  const summary = data?.summary || { average: 0, count: 0 };
  const reviews = data?.reviews || [];

  if (!(summary.count > 0)) return null;

  return (
    <div className="product-sale-review-summary mt-4 rounded-2xl border border-[#f0dce4] bg-white px-3.5 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <StarRating value={summary.average} size={16} />
        <span className="text-sm font-bold text-[#43232d]">
          {formatReviewAverage(summary.average)}
        </span>
        <span className="text-sm text-zinc-500">
          {summary.count} {summary.count === 1 ? "avaliação" : "avaliações"}
        </span>
        <Heart size={13} className="fill-[#d9536f] text-[#d9536f]" />
      </div>

      {reviews.length > 0 && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {reviews.slice(0, 2).map((review) => (
            <article
              key={review.id}
              className="rounded-xl bg-[#fff7f9] px-3 py-2 text-xs leading-5 text-zinc-600"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-semibold text-[#43232d]">
                  {review.name}
                </span>
                <StarRating value={review.rating} size={12} />
              </div>
              {review.title && (
                <p className="mt-1 line-clamp-1 font-semibold text-[#43232d]">
                  {review.title}
                </p>
              )}
              <p className="line-clamp-2">{review.comment}</p>
            </article>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onShowAll}
        className="mt-2 text-xs font-semibold text-[#b74662] transition hover:text-[#d85c7a]"
      >
        Ver todas as avaliações
      </button>
    </div>
  );
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

function isLocalDeliveryOption(option) {
  const name = String(option?.name || "");
  return (
    name.startsWith("Moto Uber") ||
    name.startsWith("Retirar em mãos")
  );
}

function getPublicShippingLabel(option) {
  return isLocalDeliveryOption(option)
    ? option.name
    : "Transportadora";
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
    formattedPixDiscount,
    card_interest_free_installments: interestFreeInstallments,
    pixEnabled,
    creditCardEnabled,
    boletoEnabled,
    cardLabel,
    paymentMethodsLabel,
    show_secure_purchase: showSecurePurchase,
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
      ),
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

  const indicadoParaList = useMemo(
    () =>
      String(product?.indicado_para || "")
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
        content_category: product.category || undefined,
        content_type: "product",
      },
      { eventId: `view_content_${product.id}` }
    );
  }, [product]);

  useEffect(() => {
    if (!product) return;
    saveWhatsAppProductContext(product);
  }, [product]);

  const [reviewsData, setReviewsData] = useState(null);

  useEffect(() => {
    if (!product) return undefined;

    let active = true;

    fetchProductReviews(product.id)
      .then((result) => {
        if (active) setReviewsData(result);
      })
      .catch(() => {
        if (active) {
          setReviewsData({
            summary: { average: 0, count: 0, distribution: {} },
            reviews: [],
          });
        }
      });

    return () => {
      active = false;
    };
  }, [product]);

  const mainImage = selected || cover;
  const selectedImageIndex = images.findIndex((image) => image.full === mainImage);
  const currentImageIndex = selectedImageIndex >= 0 ? selectedImageIndex : 0;
  const unavailable = product?.is_active === false;
  const salesTitle = product?.sales_title?.trim() || product?.title || "";
  const productTotal = Number(product?.price || 0) * quantity;
  const compareAtTotal =
    Number(product?.compare_at_price || 0) * quantity;
  const hasCompareAtPrice =
    compareAtTotal > productTotal;
  const pixTotal = Number(
    (productTotal * (1 - pixDiscountPercent / 100)).toFixed(2)
  );
  const hasPixDiscount =
    pixEnabled && Number(pixDiscountPercent) > 0;
  const paymentDetails =
    creditCardEnabled
      ? `${paymentMethodsLabel}. ${cardLabel}.`
      : paymentMethodsLabel;
  const kitComponentProductIds = useMemo(
    () =>
      (product?.kit_items || [])
        .map((item) => item.item_product_id || item.item_product?.id)
        .filter(Boolean),
    [product]
  );
  const upsellExcludedIds = useMemo(
    () => [product?.id, ...kitComponentProductIds].filter(Boolean),
    [kitComponentProductIds, product?.id]
  );

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

  function scrollToReviews() {
    document.getElementById("avaliacoes")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function handleBuyNow() {
    const item = selectedItem();
    const itemValue = Number(item.price || 0) * Number(item.quantity || 1);
    trackClarityEvent("buy_now_click");
    // Sinal de intenção — o InitiateCheckout "oficial" (com event_id, deduplicável
    // com a CAPI) só é disparado quando o pedido é de fato criado, em
    // createOrderFromCart (PublicCheckoutPage). Disparar InitiateCheckout aqui
    // também gerava um segundo evento sem event_id, sem dedup com o primeiro.
    trackMetaCustomEvent("DirectPurchaseClick", {
      currency: "BRL",
      value: itemValue,
      content_ids: [String(item.product_id)],
      content_type: "product",
      source: "product_page",
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
      setShippingOptions(data);
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
      <div className="hidden border-b border-[#f1e3e8] bg-white sm:block">
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
            <div className="product-sale-media bg-white p-2 sm:p-4">
              <div
                className="product-sale-image relative w-full touch-pan-y touch-pinch-zoom select-none"
                onClickCapture={handleGalleryClickCapture}
                onPointerDown={handleGalleryPointerDown}
                onPointerMove={handleGalleryPointerMove}
                onPointerUp={handleGalleryPointerUp}
                onPointerCancel={handleGalleryPointerCancel}
              >
                <ProductImagePreview
                  src={mainImage}
                  alt={product.title}
                  className="h-full w-full cursor-grab rounded-[1.5rem] bg-[#fff7f9] active:cursor-grabbing"
                  imageClassName="h-full w-full rounded-[1.5rem] object-contain object-center"
                  fetchPriority="high"
                  loading="eager"
                  onNavigate={images.length > 1 ? goToImage : undefined}
                  onZoomOpen={() => trackClarityEvent("product_image_zoom_open")}
                  showZoomHint
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 640px, 760px"
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
                <div className="product-sale-thumbnails mt-2.5 flex gap-2 overflow-x-auto pb-1 sm:mt-4 sm:gap-3">
                  {images.map((image, index) => {
                    const active = image.full === mainImage;
                    return (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => setSelected(image.full)}
                        className={`aspect-square h-14 w-14 shrink-0 overflow-hidden rounded-[1rem] border bg-white p-1.5 transition sm:h-auto sm:w-auto sm:flex-1 sm:rounded-[1.25rem] ${
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

              {/* Título comercial */}
              <h1 className="product-sale-title font-display">
                {salesTitle}
              </h1>

              {/* Subtítulo vindo do banco */}
              {product.subtitle && (
                <p className="product-sale-intro mt-1.5 whitespace-pre-line text-zinc-600 sm:mt-3">
                  {product.subtitle}
                </p>
              )}

              {/* ── Bloco de preço + CTA — tudo num único bloco visual ── */}
              <div className="product-sale-price-box mt-4 px-4 py-4 sm:mt-4 sm:px-5 sm:py-5">

                {hasCompareAtPrice && (
                  <p className="text-sm font-normal text-zinc-400">
                    de{" "}
                    <span className="line-through">
                      {formatBRL(compareAtTotal)}
                    </span>
                  </p>
                )}

                <p className="product-sale-price font-bold leading-none tracking-tight text-helo-text">
                  {formatBRL(productTotal)}
                </p>

                {creditCardEnabled && interestFreeInstallments > 1 && (
                  <p className="mt-1 text-sm text-zinc-600">
                    ou {interestFreeInstallments}x de{" "}
                    {formatBRL(productTotal / interestFreeInstallments)} sem juros
                  </p>
                )}

                {hasPixDiscount && (
                  <p className="mt-2 text-base text-zinc-700">
                    ou{" "}
                    <span className="font-bold text-[#b74662]">
                      {formatBRL(pixTotal)} no PIX
                    </span>{" "}
                    <span className="font-semibold text-emerald-600">
                      ({formattedPixDiscount}% off)
                    </span>
                  </p>
                )}

                {product.free_shipping && (
                  <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                    <Truck size={13} className="shrink-0" />
                    Este produto possui frete grátis para todo o Brasil
                  </p>
                )}

                <CompactReviewSummary
                  data={reviewsData}
                  onShowAll={scrollToReviews}
                />

                {unavailable ? (
                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                    Este produto está indisponível no momento.
                  </div>
                ) : (
                  <>
                    {/* Quantidade alinhada no bloco de compra */}
                    <div className="mt-4 flex justify-start">
                      <div className="product-sale-quantity-selector">
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
                    </div>

                    {/* CTAs */}
                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        className="product-sale-buy-button flex w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold text-white transition sm:text-lg"
                      >
                        <Lock size={17} />
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

                    {/* Formas de pagamento + selos de confiança — grade 2x3 */}
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#f4e1e7] pt-4">
                      {pixEnabled && (
                        <div className="flex items-center gap-2 rounded-xl border border-[#eee0e4] px-3 py-2.5">
                          <img src={pixIcon} alt="" className="h-[18px] w-[18px] shrink-0" />
                          <span className="text-xs font-medium text-zinc-600">
                            PIX
                          </span>
                        </div>
                      )}
                      {creditCardEnabled && (
                        <div className="flex items-center gap-2 rounded-xl border border-[#eee0e4] px-3 py-2.5">
                          <CreditCard size={18} className="shrink-0 text-black" />
                          <span className="text-xs font-medium text-zinc-600">
                            Cartão
                          </span>
                        </div>
                      )}
                      {boletoEnabled && (
                        <div className="flex items-center gap-2 rounded-xl border border-[#eee0e4] px-3 py-2.5">
                          <Barcode size={18} className="shrink-0 text-black" />
                          <span className="text-xs font-medium text-zinc-600">
                            Boleto
                          </span>
                        </div>
                      )}
                      {product.free_shipping && (
                        <div className="flex items-center gap-2 rounded-xl border border-[#eee0e4] px-3 py-2.5">
                          <Truck size={18} className="shrink-0 text-emerald-600" />
                          <span className="text-xs font-medium text-zinc-600">
                            Frete grátis
                          </span>
                        </div>
                      )}
                      {showSecurePurchase && (
                        <div className="flex items-center gap-2 rounded-xl border border-[#eee0e4] px-3 py-2.5">
                          <Lock size={18} className="shrink-0 text-[#d85c7a]" />
                          <span className="text-xs font-medium text-zinc-600">
                            Compra segura
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 rounded-xl border border-[#eee0e4] px-3 py-2.5">
                        <Package size={18} className="shrink-0 text-[#d85c7a]" />
                        <span className="text-xs font-medium text-zinc-600">
                          Envio rápido
                        </span>
                      </div>
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
                              <span className="block font-medium text-zinc-800">{getPublicShippingLabel(option)}</span>
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

        {/* Avaliações — logo abaixo do primeiro bloco (galeria + compra) */}
        {/* Para quem é este produto? — identificação imediata, antes de "O que você vai sentir" */}
        {product.category === "kit" && (
          <ProductKitContents
            items={product.kit_items || []}
            kitTitle={salesTitle}
          />
        )}

        <ProductAudienceFit
          items={indicadoParaList}
          imageUrl={product.audience_fit_image_url}
        />

        {/* 8. O que você vai sentir — logo após os CTAs, vende resultado emocional */}
        {feelingList.length > 0 && (
          <article className="product-sale-feelings mt-6 scroll-mt-24 bg-white p-7 sm:p-9">
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

        {product.dicas_uso && (
          <article className="product-sale-usage mt-6 p-7 sm:p-9">
            <h2 className="font-display text-3xl text-[#43232d]">Como usar</h2>
            <MarkdownText className="mt-5 max-w-4xl text-base leading-8 text-zinc-600">
              {product.dicas_uso}
            </MarkdownText>
          </article>
        )}

        {/* 10. Compra segura / Entrega / Pagamento */}
        <section className="product-sale-trust mt-6 grid gap-4 bg-white p-5 sm:p-7">
          {showSecurePurchase && (
            <div className="product-sale-trust-item flex items-start gap-4 rounded-2xl p-5">
              <ShieldCheck size={25} className="shrink-0 text-[#d85c7a]" />
              <div>
                <p className="text-base font-semibold text-[#43232d]">Compra protegida</p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">Pagamento seguro pelo Mercado Pago.</p>
              </div>
            </div>
          )}
          <div className="product-sale-trust-item flex items-start gap-4 rounded-2xl p-5">
            <Truck size={25} className="shrink-0 text-[#d85c7a]" />
            <div>
              <p className="text-base font-semibold text-[#43232d]">Entrega por CEP</p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">Opções exibidas antes do pagamento.</p>
            </div>
          </div>
          {paymentMethodsLabel && (
            <div className="product-sale-trust-item flex items-start gap-4 rounded-2xl p-5">
              <CreditCard size={25} className="shrink-0 text-[#d85c7a]" />
              <div>
                <p className="text-base font-semibold text-[#43232d]">Pagamento</p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{paymentDetails}</p>
              </div>
            </div>
          )}
        </section>

        {product.description && (
          <article className="product-sale-description mt-6 bg-white p-7 sm:p-9">
            <h2 className="font-display text-3xl text-[#43232d]">Sobre o produto</h2>
            <div className={!descriptionExpanded ? "line-clamp-5 overflow-hidden sm:line-clamp-none" : undefined}>
              <MarkdownText className="mt-5 text-base leading-8 text-zinc-600">
                {product.description}
              </MarkdownText>
            </div>
            {(product.description?.length ?? 0) > 300 && (
              <button
                type="button"
                onClick={() => setDescriptionExpanded((v) => !v)}
                className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-[#b74662] transition hover:text-[#d85c7a] sm:hidden"
              >
                {descriptionExpanded ? "Ler menos" : "Ler mais"}
                <ChevronRight
                  size={15}
                  className={`transition-transform duration-200 ${descriptionExpanded ? "-rotate-90" : "rotate-90"}`}
                />
              </button>
            )}
          </article>
        )}

        <ProductReviews
          productId={product.id}
          productTitle={product.title}
          data={reviewsData}
        />

        {!unavailable && (
          <section className="product-sale-final-cta mt-6 rounded-[28px] border border-[#f0dfe5] bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-2xl text-[#43232d]">{salesTitle}</p>
                <p className="mt-1 text-lg font-bold text-[#b74662]">{formatBRL(productTotal)}</p>
              </div>
              <button
                type="button"
                onClick={handleBuyNow}
                className="product-sale-buy-button flex w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold text-white transition sm:w-auto sm:min-w-64 sm:text-lg"
              >
                <Lock size={17} />
                Comprar agora
              </button>
            </div>
          </section>
        )}

        {/* 12. Produtos relacionados — por último para não desviar do produto principal */}
        <UpsellProducts
          excludedIds={upsellExcludedIds}
          onAdd={addToCart}
          title="Combine com este cuidado"
        />
      </main>
    </div>
  );
}
