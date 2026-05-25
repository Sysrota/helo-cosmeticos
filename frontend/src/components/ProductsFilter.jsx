import { Search, SlidersHorizontal, X } from "lucide-react";

export default function ProductsFilter({
  categories,
  filters,
  onChange,
  resultCount,
  totalCount,
}) {
  const hasFilters =
    filters.search ||
    filters.category !== "all" ||
    filters.sort !== "default";

  function updateFilter(key, value) {
    onChange({
      ...filters,
      [key]: value,
    });
  }

  return (
    <section className="rounded-[1.5rem] border border-[#f0e2e7] bg-white p-5 shadow-[0_12px_32px_rgba(91,39,56,0.04)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#43232d]">
          <SlidersHorizontal size={17} className="text-[#d9536f]" />
          Filtre sua rotina
        </p>
        <p className="text-sm text-zinc-500">
          <strong className="text-[#43232d]">{resultCount}</strong>{" "}
          {resultCount === 1 ? "produto encontrado" : "produtos encontrados"}
          {hasFilters && totalCount !== resultCount ? ` de ${totalCount}` : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.25fr_0.8fr_0.8fr_auto] md:items-end">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-600">Buscar</span>
          <span className="relative block">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c7798d]"
            />
            <input
              type="search"
              className="h-[52px] w-full rounded-xl border border-[#eadfe3] bg-[#fffafb] py-3 pl-11 pr-4 text-sm text-[#43232d] outline-none transition focus:border-[#d9536f] focus:ring-2 focus:ring-[#f8dfe5]"
              placeholder="Busque por produto..."
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-600">Categoria</span>
          <select
            className="h-[52px] w-full rounded-xl border border-[#eadfe3] bg-[#fffafb] px-4 py-3 text-sm text-[#43232d] outline-none transition focus:border-[#d9536f]"
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
          >
            <option value="all">Todas as linhas</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-zinc-600">Ordenar</span>
          <select
            className="h-[52px] w-full rounded-xl border border-[#eadfe3] bg-[#fffafb] px-4 py-3 text-sm text-[#43232d] outline-none transition focus:border-[#d9536f]"
            value={filters.sort}
            onChange={(event) => updateFilter("sort", event.target.value)}
          >
            <option value="default">Mais recentes</option>
            <option value="featured">Destaques primeiro</option>
            <option value="low">Menor preço</option>
            <option value="high">Maior preço</option>
          </select>
        </label>

        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              onChange({
                search: "",
                category: "all",
                sort: "default",
              })
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#b74662] transition hover:bg-[#fff1f5]"
          >
            <X size={16} />
            Limpar
          </button>
        )}
      </div>
    </section>
  );
}
