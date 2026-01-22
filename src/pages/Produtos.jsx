import { useEffect, useMemo, useState } from "react";
import ProductsFilter from "../components/ProductsFilter";
import ProductCard from "../components/ProductCard";

const API_URL = "http://localhost:3333";

export default function Produtos() {
  const [all, setAll] = useState([]);
  const [filtered, setFiltered] = useState([]);

  async function load() {
    const res = await fetch(`${API_URL}/products?active=true&limit=100`);
    const data = await res.json();

    // ✅ remove duplicados por id (caso backend esteja retornando 1 linha por imagem)
    const unique = Array.from(
      new Map((data.items || []).map((p) => [p.id, p])).values()
    );

    setAll(unique);
    setFiltered(unique);
  }

  useEffect(() => {
    load();
  }, []);

  const handleFilter = ({ search, category, sort }) => {
    let result = [...all];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => (p.title || "").toLowerCase().includes(q));
    }

    if (category !== "all") {
      result = result.filter((p) => p.category === category);
    }

    if (sort === "low") result.sort((a, b) => a.price - b.price);
    if (sort === "high") result.sort((a, b) => b.price - a.price);
    if (sort === "featured") result.sort((a, b) => b.price - a.price);

    setFiltered(result);
  };

  const cards = useMemo(() => filtered, [filtered]);

  return (
    <div className="bg-helo-background min-h-screen py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display text-helo-dark">Produtos</h1>
        </div>

        <ProductsFilter onFilter={handleFilter} />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
          {cards.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}                         // ✅ agora o link funciona
              title={product.title}
              price={`R$ ${Number(product.price || 0).toFixed(2)}`}
              image={product.image_url ? `${API_URL}${product.image_url}` : ""}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
