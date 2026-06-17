import { ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCommercialPolicy } from "../context/useCommercialPolicy";

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function ProductCard({
  id,
  image,
  title,
  subtitle,
  price,
  category,
  isFeatured = false,
}) {
  const navigate = useNavigate();
  const {
    pix_discount_percent: pixDiscountPercent,
    pixLabel,
    cardLabel,
  } = useCommercialPolicy();
  const numericPrice =
    typeof price === "number"
      ? price
      : Number(String(price || "").replace(/[^\d,.-]/g, "").replace(",", "."));
  const pixPrice = numericPrice * (1 - pixDiscountPercent / 100);

  function handleBuyNow() {
    navigate("/checkout", {
      state: {
        directPurchaseItem: {
          product_id: id,
          title,
          subtitle,
          price: numericPrice,
          image: image || "",
          quantity: 1,
        },
      },
    });
  }

  return (
    <article className="home-product-card flex h-full flex-col overflow-hidden bg-white">
      <Link
        to={`/produto/${id}`}
        className="group relative block aspect-square overflow-hidden bg-[#fffafb]"
      >
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          {isFeatured && (
            <span className="rounded-full bg-[#d9536f] px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
              Escolha Helô
            </span>
          )}
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#b74662] shadow-sm">
            {pixLabel}
          </span>
        </div>
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.015]"
            loading="lazy"
            decoding="async"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            Sem imagem
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {category && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#b74662]">
            {category}
          </p>
        )}
        <Link to={`/produto/${id}`} className="font-display text-xl text-[#43232d]">
          {title}
        </Link>
        {subtitle && (
          <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-zinc-500">
            {subtitle}
          </p>
        )}
        <div className="mt-4">
          <p className="text-xl font-semibold tracking-tight text-[#43232d]">
            {formatBRL(numericPrice)}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            ou <strong className="text-[#b74662]">{formatBRL(pixPrice)}</strong> no PIX
          </p>
          <p className="mt-1 text-xs text-zinc-500">{cardLabel}</p>
        </div>

        <div className="mt-6 grid gap-2">
          <button
            type="button"
            onClick={handleBuyNow}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d9536f] font-semibold text-white transition hover:bg-[#c84b67]"
          >
            <ShoppingBag size={17} />
            Comprar agora
          </button>
          <Link
            to={`/produto/${id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#eadfe3] text-sm font-semibold text-[#873c50] transition hover:bg-[#fff5f7]"
          >
            Ver detalhes
          </Link>
        </div>
      </div>
    </article>
  );
}
