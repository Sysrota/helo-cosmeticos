import { useState } from "react";

export default function ProductsFilter({ onFilter }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("default");

  const handleFilter = () => {
    onFilter({ search, category, sort });
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm mb-12 border border-white/40">

      {/* GRID DOS FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* BUSCA */}
        <div>
          <label className="text-sm font-body text-helo-text">Buscar</label>
          <input
            type="text"
            className="w-full mt-2 px-4 py-3 rounded-xl border border-helo-rose/40 focus:ring-2 focus:ring-helo-rose outline-none"
            placeholder="Procurar produto..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              handleFilter();
            }}
          />
        </div>

        {/* CATEGORIA */}
        <div>
          <label className="text-sm font-body text-helo-text">Categoria</label>
          <select
            className="w-full mt-2 px-4 py-3 rounded-xl border border-helo-rose/40 focus:ring-2 focus:ring-helo-rose outline-none"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              handleFilter();
            }}
          >
            <option value="all">Todas</option>
            <option value="shampoo">Shampoo</option>
            <option value="mascara">Máscara</option>
            <option value="leavein">Leave-in</option>
            <option value="finalizador">Finalizador</option>
          </select>
        </div>

        {/* ORDENAR */}
        <div>
          <label className="text-sm font-body text-helo-text">Ordenar por</label>
          <select
            className="w-full mt-2 px-4 py-3 rounded-xl border border-helo-rose/40 focus:ring-2 focus:ring-helo-rose outline-none"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              handleFilter();
            }}
          >
            <option value="default">Padrão</option>
            <option value="low">Preço menor</option>
            <option value="high">Preço maior</option>
            <option value="featured">Destaques</option>
          </select>
        </div>

      </div>

    </div>
  );
}
