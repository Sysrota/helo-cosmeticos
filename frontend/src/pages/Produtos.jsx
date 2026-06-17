import { CreditCard, ShieldCheck, Sparkles, Tag, Truck } from "lucide-react";
import { createElement, useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard";
import ProductsFilter from "../components/ProductsFilter";
import { useCommercialPolicy } from "../context/useCommercialPolicy";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const CATEGORY_LABELS = {
  condicionador: "Condicionador",
  finalizador: "Finalizador",
  kit: "Kits",
  mascara: "Máscara",
  redutor: "Redutor de volume",
  shampoo: "Shampoo",
  skincare: "Skincare",
};

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function Produtos() {
  const { pixLabel, cardLabel, freeShippingLabel } = useCommercialPolicy();
  const benefits = [
    { icon: Tag, text: pixLabel },
    { icon: CreditCard, text: cardLabel },
    { icon: Truck, text: freeShippingLabel },
    { icon: ShieldCheck, text: "Compra segura" },
  ];
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    sort: "default",
  });

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/products?active=true&limit=100&sort=new`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar os produtos.");
        }

        return response.json();
      })
      .then((data) => {
        if (!active) {
          return;
        }

        const unique = Array.from(
          new Map((data.items || []).map((product) => [product.id, product])).values()
        );

        setProducts(unique);
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError.message || "Não foi possível carregar os produtos.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(products.map((product) => product.category).filter(Boolean))
      )
        .map((category) => ({
          value: category,
          label: CATEGORY_LABELS[category] || category,
        }))
        .sort((first, second) => first.label.localeCompare(second.label, "pt-BR")),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const search = normalizeSearch(filters.search);
    let result = products.filter((product) => {
      const matchesSearch =
        !search ||
        normalizeSearch(product.title).includes(search) ||
        normalizeSearch(product.subtitle).includes(search) ||
        normalizeSearch(product.category).includes(search);
      const matchesCategory =
        filters.category === "all" || product.category === filters.category;

      return matchesSearch && matchesCategory;
    });

    if (filters.sort === "low") {
      result = result.slice().sort((first, second) => first.price - second.price);
    } else if (filters.sort === "high") {
      result = result.slice().sort((first, second) => second.price - first.price);
    } else if (filters.sort === "featured") {
      result = result.slice().sort((first, second) => {
        const featuredOrder =
          Number(Boolean(second.is_featured)) - Number(Boolean(first.is_featured));

        return featuredOrder || second.id - first.id;
      });
    }

    return result;
  }, [filters, products]);

  return (
    <div className="min-h-screen bg-[#fff8fa] pb-20">
      <section className="border-b border-[#f0e2e7] bg-white">
        <div className="home-container py-11 text-center sm:py-14">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#fff1f5] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b74662]">
            <Sparkles size={14} />
            Ritual Helô
          </p>
          <h1 className="mt-5 font-display text-4xl text-[#43232d] sm:text-5xl">
            Encontre seu cuidado ideal
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            Explore produtos para pele e cabelos com compra simples,
            pagamento seguro, frete promocional e condições especiais no cartão.
          </p>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-zinc-600">
            {benefits.map(({ icon, text }) => (
              <span key={text} className="inline-flex items-center gap-2">
                {createElement(icon, {
                  size: 17,
                  className: "text-[#d9536f]",
                })}
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="home-container pt-9">
        <ProductsFilter
          categories={categories}
          filters={filters}
          onChange={setFilters}
          resultCount={filteredProducts.length}
          totalCount={products.length}
        />

        {loading && (
          <div className="mt-10 rounded-3xl border border-[#f0e2e7] bg-white py-16 text-center text-zinc-500">
            Carregando produtos...
          </div>
        )}

        {!loading && error && (
          <div className="mt-10 rounded-3xl border border-[#f0e2e7] bg-white py-16 text-center">
            <p className="font-medium text-[#43232d]">Não foi possível carregar a vitrine.</p>
            <p className="mt-2 text-sm text-zinc-500">{error}</p>
          </div>
        )}

        {!loading && !error && filteredProducts.length === 0 && (
          <div className="mt-10 rounded-3xl border border-[#f0e2e7] bg-white py-16 text-center">
            <p className="font-display text-2xl text-[#43232d]">
              Nenhum produto encontrado
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              Tente outra busca ou limpe os filtros para visualizar a linha completa.
            </p>
            <button
              type="button"
              onClick={() =>
                setFilters({
                  search: "",
                  category: "all",
                  sort: "default",
                })
              }
              className="mt-7 rounded-xl border border-[#e6c8d0] px-6 py-3 text-sm font-semibold text-[#b74662] transition hover:bg-[#fff1f5]"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {!loading && !error && filteredProducts.length > 0 && (
          <div className="mt-9 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                subtitle={product.subtitle}
                price={Number(product.price || 0)}
                category={CATEGORY_LABELS[product.category] || product.category}
                isFeatured={product.is_featured}
                image={product.image_url ? `${API_URL}${product.image_url}` : ""}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
