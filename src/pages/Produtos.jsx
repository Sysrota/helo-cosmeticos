import { useState } from "react";
import ProductsFilter from "../components/ProductsFilter";
import ProductCard from "../components/ProductCard";

const placeholder = "https://placehold.co/600x800/F6E6E9/D9536F?text=Produto&font=Playfair+Display";

const ALL_PRODUCTS = [
  { id: 1, title: "Shampoo Delicato", price: 49.90, category: "shampoo", image: placeholder },
  { id: 2, title: "Máscara Nutritiva", price: 59.90, category: "mascara", image: placeholder },
  { id: 3, title: "Leave-in Suavizante", price: 39.90, category: "leavein", image: placeholder },
  { id: 4, title: "Finalizador Glossy", price: 29.90, category: "finalizador", image: placeholder },
  { id: 5, title: "Shampoo Ultra Care", price: 69.90, category: "shampoo", image: placeholder },
  { id: 6, title: "Máscara Crescimento", price: 34.90, category: "mascara", image: placeholder },
];


export default function Produtos() {
  const [filtered, setFiltered] = useState(ALL_PRODUCTS);

  const handleFilter = ({ search, category, sort }) => {
    let result = [...ALL_PRODUCTS];

    // FILTRO: busca
    if (search) {
      result = result.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // FILTRO: categoria
    if (category !== "all") {
      result = result.filter(p => p.category === category);
    }

    // ORDENAR
    if (sort === "low") result.sort((a, b) => a.price - b.price);
    if (sort === "high") result.sort((a, b) => b.price - a.price);
    if (sort === "featured") result.sort((a, b) => b.price - a.price); // exemplo

    setFiltered(result);
  };

  return (
    <div className="bg-helo-background min-h-screen py-20">
      <div className="max-w-6xl mx-auto px-6">

        {/* TÍTULO */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-display text-helo-dark">
            Produtos
          </h1>
        </div>

        {/* FILTROS PREMIUM */}
        <ProductsFilter onFilter={handleFilter} />

        {/* GRID DE PRODUTOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">
          {filtered.map(product => (
            <ProductCard
              key={product.id}
              title={product.title}
              price={`R$ ${product.price.toFixed(2)}`}
              image={product.image}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
