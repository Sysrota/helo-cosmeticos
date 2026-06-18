import {
  ChevronLeft,
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

const API_URL = import.meta.env.VITE_API_URL || "/api";

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatShippingPrice(value) {
  return Number(value) === 0
    ? "Grátis"
    : formatBRL(value);
}

function formatShippingOptionPrice(option) {
  return formatShippingPrice(
    option.price
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
  const dragStartRef = useRef(null);

  const cover = useMemo(() => {
    if (!product?.image_url) {
      return "";
    }

    return `${API_URL}${product.image_url}`;
  }, [product]);

  const gallery = useMemo(() => {
    if (!product?.images?.length) {
      return [];
    }

    return product.images
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((image) => ({
        ...image,
        full: `${API_URL}${image.image_url}`,
      }));
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

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);

      try {
        const response = await fetch(`${API_URL}/products/${id}`);

        if (!response.ok) {
          throw new Error("Produto não encontrado");
        }

        const data = await response.json();

        if (!active) {
          return;
        }

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
        if (active) {
          setProduct(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!product) {
      return undefined;
    }

    const seoDescription =
      product.meta_description ||
      product.subtitle ||
      product.description ||
      "Compre cosméticos Helô para pele e cabelos com pagamento seguro e condições especiais.";

    setSeoMeta({
      title:
        `${product.title} | Helô Cosméticos`,
      description:
        seoDescription,
      image:
        cover || undefined,
      url:
        window.location.href,
    });

    return () => {
      resetSeoMeta();
    };
  }, [
    cover,
    product,
  ]);

  const mainImage = selected || cover;
  const selectedImageIndex =
    images.findIndex(
      (image) =>
        image.full === mainImage
    );
  const currentImageIndex =
    selectedImageIndex >= 0
      ? selectedImageIndex
      : 0;
  const unavailable = product?.is_active === false;
  const category =
    String(product?.category || "beleza")
      .replace(/[-_]/g, " ");
  const productTotal =
    Number(product?.price || 0) *
    quantity;
  const pixTotal =
    Number(
      (
        productTotal *
        (1 - pixDiscountPercent / 100)
      ).toFixed(2)
    );

  useEffect(() => {
    if (images.length <= 1) {
      return undefined;
    }

    function handleKeyDown(event) {
      const activeTag =
        document.activeElement?.tagName
          ?.toLowerCase();

      if (
        activeTag === "input" ||
        activeTag === "textarea" ||
        activeTag === "select"
      ) {
        return;
      }

      if (event.key === "ArrowRight") {
        goToImage(1);
      }

      if (event.key === "ArrowLeft") {
        goToImage(-1);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    currentImageIndex,
    images,
  ]);

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
    window.setTimeout(() => setAddedToCart(false), 2400);
  }

  function handleBuyNow() {
    navigate("/checkout", {
      state: {
        directPurchaseItem: selectedItem(),
      },
    });
  }

  function goToImage(direction) {
    if (images.length <= 1) {
      return;
    }

    const nextIndex =
      (
        currentImageIndex +
        direction +
        images.length
      ) % images.length;

    setSelected(
      images[nextIndex].full
    );
  }

  function handleGalleryPointerDown(event) {
    dragStartRef.current = {
      x:
        event.clientX,
      y:
        event.clientY,
    };
  }

  function handleGalleryPointerUp(event) {
    if (
      !dragStartRef.current ||
      images.length <= 1
    ) {
      dragStartRef.current = null;
      return;
    }

    const deltaX =
      event.clientX -
      dragStartRef.current.x;
    const deltaY =
      event.clientY -
      dragStartRef.current.y;

    dragStartRef.current = null;

    if (
      Math.abs(deltaX) < 45 ||
      Math.abs(deltaX) < Math.abs(deltaY)
    ) {
      return;
    }

    goToImage(
      deltaX < 0 ? 1 : -1
    );
  }

  function updateQuantity(value) {
    setQuantity(
      Math.max(
        1,
        value
      )
    );
    setShippingOptions([]);
    setShippingError("");
  }

  function handleShippingCep(value) {
    setShippingCep(
      Formatter.cep(
        Formatter.onlyNumbers(value)
          .slice(0, 8)
      )
    );
    setShippingOptions([]);
    setShippingError("");
  }

  async function calculateProductShipping(event) {
    event.preventDefault();

    if (
      Formatter.onlyNumbers(shippingCep).length !== 8
    ) {
      setShippingError("Informe um CEP válido.");
      return;
    }

    try {
      setShippingLoading(true);
      setShippingError("");
      setShippingOptions([]);

      const response =
        await fetch(
          `${API_URL}/shipping/product-quote`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                cep:
                  shippingCep,
                product_id:
                  product.id,
                quantity,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Não foi possível calcular o frete."
        );
      }

      setShippingOptions(
        data
          .slice()
          .sort(
            (first, second) =>
              first.price -
              second.price
          )
      );
    } catch (error) {
      setShippingError(
        error instanceof Error
          ? error.message
          : "Não foi possível calcular o frete."
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
      <div className="border-b border-[#f1e3e8] bg-white">
        <div className="product-sale-container flex items-center gap-2 py-3 text-sm text-zinc-500">
          <Link to="/produtos" className="transition hover:text-helo-dark">
            Produtos
          </Link>
          <ChevronRight size={14} />
          <span className="line-clamp-1 text-zinc-700">{product.title}</span>
        </div>
      </div>

      <main className="product-sale-container pb-12 pt-6 lg:pt-8">
        <div className="product-sale-hero grid items-start gap-8">
          <section className="product-sale-gallery space-y-4">
            <div className="product-sale-media bg-white p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
                <span className="rounded-full border border-[#f4e1e7] bg-[#fff7f9] px-4 py-2 text-xs font-semibold text-[#ae415d]">
                  Favorito para seu ritual de cuidado
                </span>
                <span className="text-xs font-medium text-zinc-400">
                  Clique para ampliar
                </span>
              </div>
              <div
                className="product-sale-image relative w-full touch-pan-y select-none"
                onPointerDown={handleGalleryPointerDown}
                onPointerUp={handleGalleryPointerUp}
                onPointerCancel={() => {
                  dragStartRef.current = null;
                }}
              >
                <ProductImagePreview
                  src={mainImage}
                  alt={product.title}
                  className="h-full w-full rounded-[1.5rem] bg-[#fff7f9]"
                  imageClassName="h-full w-full rounded-[1.5rem] object-cover object-center"
                  zoomLabel="Ampliar imagem do produto"
                />
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        goToImage(-1);
                      }}
                      className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#873c50] shadow-sm transition hover:bg-white"
                      aria-label="Imagem anterior"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        goToImage(1);
                      }}
                      className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#873c50] shadow-sm transition hover:bg-white"
                      aria-label="Próxima imagem"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#873c50] shadow-sm">
                      {currentImageIndex + 1}/{images.length}
                    </div>
                  </>
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 sm:gap-3">
                {images.map((image) => {
                  const active = image.full === mainImage;

                  return (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setSelected(image.full)}
                      className={`aspect-square overflow-hidden rounded-[1.25rem] border bg-white p-1.5 transition ${
                        active
                          ? "border-[#d85c7a] ring-2 ring-[#f8dfe5]"
                          : "border-[#f0e4e8] hover:border-[#e7bdc8]"
                      }`}
                      aria-label="Ver imagem do produto"
                    >
                      <img
                        src={image.full}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="product-sale-panel-column">
            <div className="product-sale-card bg-white">
              <div className="flex items-center justify-between gap-4">
                <p className="inline-flex items-center gap-2 rounded-full bg-[#fff0f4] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#b74662]">
                  <Sparkles size={13} />
                  {category}
                </p>
                <span className="text-sm font-medium text-[#b74662]">
                  Helô
                </span>
              </div>

              <h1 className="product-sale-title mt-4 font-display">
                {product.title}
              </h1>

              {product.subtitle && (
                <p className="product-sale-intro mt-3 text-zinc-600">
                  {product.subtitle}
                </p>
              )}

              <div className="product-sale-price-box mt-5 px-5 py-4">
                <div className="product-sale-price-row">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.17em] text-[#a85a6d]">
                      {quantity > 1 ? "Total" : "Preço"}
                    </p>
                    <p className="product-sale-price mt-2 font-semibold leading-none tracking-tight text-helo-text">
                      {formatBRL(productTotal)}
                    </p>
                    {quantity > 1 && (
                      <p className="mt-2 text-xs text-zinc-500">
                        {quantity} x {formatBRL(product.price)}
                      </p>
                    )}
                  </div>

                  {!unavailable && (
                    <div>
                      <p className="mb-2 text-right text-sm font-semibold text-[#43232d]">Quantidade</p>
                      <div className="flex h-12 items-center rounded-2xl border border-[#eadfe3] bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(quantity - 1)}
                          className="flex h-full w-12 items-center justify-center text-zinc-600 transition hover:text-[#d85c7a]"
                          aria-label="Diminuir quantidade"
                        >
                          <Minus size={17} />
                        </button>
                        <span className="w-8 text-center text-base font-semibold">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(quantity + 1)}
                          className="flex h-full w-12 items-center justify-center text-zinc-600 transition hover:text-[#d85c7a]"
                          aria-label="Aumentar quantidade"
                        >
                          <Plus size={17} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  Consulte abaixo o frete para sua região.
                </p>
                <div className="product-sale-payment-info mt-3">
                  <p>
                    <strong>PIX:</strong> {formatBRL(pixTotal)} com {pixDiscountPercent}% de desconto
                  </p>
                  <p>
                    <strong>Cartão:</strong> {cardLabel}
                  </p>
                </div>
              </div>

              {unavailable ? (
                <div className="mt-7 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-base text-zinc-600">
                  Este produto está indisponível no momento.
                </div>
              ) : (
                <>
                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      className="product-sale-buy-button flex w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white transition"
                    >
                      <ShoppingBag size={20} />
                      Comprar agora
                    </button>
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="h-[58px] w-full rounded-2xl border border-[#e5bac5] bg-white text-base font-semibold text-[#b74662] transition hover:bg-[#fff5f7]"
                    >
                      {addedToCart ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}
                    </button>
                  </div>

                  <form
                    className="product-sale-shipping mt-5"
                    onSubmit={calculateProductShipping}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#43232d]">
                      <Truck size={17} className="text-[#d85c7a]" />
                      Calcule o frete
                    </div>
                    <p className="mt-1 text-xs text-[#a85a6d]">
                      {freeShippingLabel} nas opções elegíveis.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={shippingCep}
                        onChange={(event) => handleShippingCep(event.target.value)}
                        placeholder="00000-000"
                        aria-label="CEP para cálculo de frete"
                        className="h-12 min-w-0 flex-1 rounded-xl border border-[#eadfe3] bg-white px-4 text-sm outline-none transition focus:border-[#d85c7a]"
                      />
                      <button
                        type="submit"
                        disabled={shippingLoading}
                        className="h-12 rounded-xl border border-[#e5bac5] px-5 text-sm font-semibold text-[#b74662] transition hover:bg-[#fff5f7] disabled:opacity-60"
                      >
                        {shippingLoading ? "Calculando..." : "Calcular"}
                      </button>
                    </div>

                    {shippingError && (
                      <p className="mt-2 text-sm text-red-600">
                        {shippingError}
                      </p>
                    )}

                    {shippingOptions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {shippingOptions
                          .filter(
                            (option, index) =>
                              index < 3 ||
                              String(option.name)
                                .startsWith("Moto Uber")
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
                </>
              )}
            </div>
          </section>
        </div>

        <section className="product-sale-trust mt-10 grid gap-4 bg-white p-5 sm:p-7">
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

        <UpsellProducts
          excludedIds={[product.id]}
          onAdd={addToCart}
          title="Combine com este cuidado"
        />

        <section className="product-sale-details mt-10 grid gap-6">
          <article className="product-sale-description bg-white p-7 sm:p-9">
            <h2 className="font-display text-3xl text-[#43232d]">Sobre o produto</h2>
            <MarkdownText className="mt-5 text-base leading-8 text-zinc-600">
              {product.description || "Sem descrição cadastrada."}
            </MarkdownText>
          </article>
          {feelingList.length > 0 && (
            <article className="product-sale-feelings bg-white p-7 sm:p-9">
              <h2 className="font-display text-3xl text-[#43232d]">O que você vai sentir</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {feelingList.map((feeling) => (
                  <div
                    key={feeling}
                    className="flex gap-3 rounded-2xl bg-[#fff7f9] px-4 py-3.5 text-sm leading-6 text-zinc-700"
                  >
                    <Sparkles size={16} className="mt-1 shrink-0 text-[#d85c7a]" />
                    <span>
                      <MarkdownInline>
                        {feeling}
                      </MarkdownInline>
                    </span>
                  </div>
                ))}
              </div>
            </article>
          )}

          {product.dicas_uso && (
            <article className="product-sale-usage p-7 sm:p-9">
              <h2 className="font-display text-3xl text-[#43232d]">Como usar</h2>
              <MarkdownText className="mt-5 max-w-4xl text-base leading-8 text-zinc-600">
                {product.dicas_uso}
              </MarkdownText>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}
