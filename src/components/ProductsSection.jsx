import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";

// const API_URL = "http://localhost:3333";
const API_URL = import.meta.env.VITE_API_URL || "/api";
export default function ProductsSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch(`${API_URL}/products?active=true&limit=3&sort=new`);
        const data = await res.json();

        if (!alive) return;
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="py-20 bg-helo-background">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-display text-helo-dark">Nossos Produtos</h2>
          <p className="text-helo-text/80 mt-4 max-w-xl mx-auto">
            Linha criada com delicadeza, cuidado e qualidade para sua beleza diária.
          </p>
        </div>

        {loading ? (
          <div className="text-center text-helo-text/70">Carregando produtos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {items.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                title={p.title}
                price={`R$ ${Number(p.price || 0).toFixed(2)}`}
                image={p.image_url ? `${API_URL}${p.image_url}` : ""}
              />
            ))}
          </div>
        )}

        {!loading && items.length === 0 ? (
          <div className="text-center text-helo-text/70 mt-10">
            Nenhum produto cadastrado ainda.
          </div>
        ) : null}

        {/* Botão Ver todos */}
        <div className="flex justify-center mt-14">
          <Link
            to="/produtos"
            className="px-10 py-4 bg-helo-dark text-white rounded-xl text-lg font-semibold shadow-md hover:bg-helo-rose transition-all hover:shadow-xl"
          >
            Ver todos os produtos
          </Link>
        </div>
      </div>
    </section>
  );
}
