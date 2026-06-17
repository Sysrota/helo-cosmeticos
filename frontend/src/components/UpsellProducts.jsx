import {
  Check,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import ProductImagePreview from "./ProductImagePreview";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "/api";

function formatBRL(value) {
  return Number(
    value || 0
  ).toLocaleString("pt-BR", {
    style:
      "currency",
    currency:
      "BRL",
  });
}

function productImage(product) {
  if (
    !product.image_url
  ) {
    return "";
  }

  return product.image_url
    .startsWith("http")
    ? product.image_url
    : `${API_URL}${product.image_url}`;
}

export default function UpsellProducts({
  description =
    "Inclua mais um cuidado no seu pedido e aproveite as mesmas condições de entrega e pagamento.",
  excludedIds = [],
  onAdd,
  title =
    "Complete seu ritual",
}) {
  const [products,
    setProducts] =
    useState([]);
  const [addedId,
    setAddedId] =
    useState(null);

  const excludedKey =
    useMemo(
      () =>
        excludedIds
          .map(Number)
          .sort(
            (first, second) =>
              first -
              second
          )
          .join(","),
      [excludedIds]
    );

  useEffect(() => {
    let active =
      true;

    async function loadProducts() {
      try {
        const response =
          await fetch(
            `${API_URL}/products?active=true&limit=8&sort=new`
          );
        const data =
          await response.json();
        const excluded =
          new Set(
            excludedKey
              .split(",")
              .filter(Boolean)
              .map(Number)
          );

        if (active) {
          setProducts(
            (data.items || [])
              .filter(
                (product) =>
                  !excluded.has(
                    Number(
                      product.id
                    )
                  ) ||
                  Number(
                    product.id
                  ) ===
                  addedId
              )
              .slice(0, 3)
          );
        }
      } catch {
        if (active) {
          setProducts([]);
        }
      }
    }

    loadProducts();

    return () => {
      active =
        false;
    };
  }, [
    addedId,
    excludedKey,
  ]);

  function addProduct(product) {
    onAdd({
      product_id:
        product.id,
      title:
        product.title,
      subtitle:
        product.subtitle || "",
      price:
        Number(
          product.price ||
          0
        ),
      image:
        productImage(
          product
        ),
      quantity:
        1,
    });

    setAddedId(
      product.id
    );
    window.setTimeout(
      () =>
        setAddedId(
          (current) =>
            current ===
            product.id
              ? null
              : current
        ),
      1800
    );
  }

  if (
    !products.length
  ) {
    return null;
  }

  return (
    <section className="upsell-products mt-10 rounded-[28px] border border-[#f0dfe5] bg-white p-5 sm:p-7">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#b74662]">
            <Sparkles size={14} />
            Aproveite sua compra
          </p>
          <h2 className="mt-2 font-display text-2xl text-[#43232d] sm:text-3xl">
            {title}
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-6 text-zinc-500">
          {description}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {products.map(
          (product) => {
            const image =
              productImage(
                product
              );
            const added =
              addedId ===
              product.id;

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl border border-[#f1e5e9] bg-[#fffafb]"
              >
                <div
                  className="aspect-square w-full overflow-hidden bg-white"
                >
                  <ProductImagePreview
                    src={image}
                    alt={product.title}
                    className="h-full w-full"
                    imageClassName="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="p-4">
                  <Link
                    to={`/produto/${product.id}`}
                    className="line-clamp-2 text-sm font-semibold leading-5 text-[#43232d]"
                  >
                    {product.title}
                  </Link>
                  {product.subtitle && (
                    <p className="mt-1 line-clamp-2 text-xs leading-4 text-zinc-500">
                      {product.subtitle}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-semibold text-[#b74662]">
                    {formatBRL(
                      product.price
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      addProduct(
                        product
                      )
                    }
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#b74662] transition hover:text-[#d9536f]"
                  >
                    {added ? (
                      <Check size={14} />
                    ) : (
                      <Plus size={14} />
                    )}
                    {added
                      ? "Adicionado"
                      : "Adicionar"}
                  </button>
                </div>
              </article>
            );
          }
        )}
      </div>
    </section>
  );
}
