import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function ProductsSection({ items, loading }) {
  return (
    <section className="bg-[#fff8fa] pb-20 pt-16 md:pb-24 md:pt-20">
      <div className="home-container">
        <div className="mb-11 flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b74662]">
              Escolhas para começar
            </p>
            <h2 className="mt-3 font-display text-3xl text-[#43232d] md:text-4xl">
              Produtos em destaque
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-600 md:text-base">
              Cuidados escolhidos para uma rotina simples, prazerosa e com a
              suavidade da Helô.
            </p>
          </div>

          <Link
            to="/produtos"
            className="inline-flex items-center gap-2 font-semibold text-[#b74662] transition hover:text-[#d9536f]"
          >
            Ver todos
            <ArrowRight size={18} />
          </Link>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white py-14 text-center text-zinc-500">
            Carregando produtos...
          </div>
        ) : items.length > 0 ? (
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {items.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                title={product.title}
                subtitle={product.subtitle}
                price={Number(product.price || 0)}
                image={
                  product.image_url
                    ? `${API_URL}${product.image_url}`
                    : ""
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-white py-14 text-center text-zinc-500">
            Nenhum produto disponível no momento.
          </div>
        )}
      </div>
    </section>
  );
}
