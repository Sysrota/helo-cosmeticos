export default function PaginationFincob({ pagina, totalPaginas, onChange }) {
  return (
    <div className="flex justify-center gap-2 py-4">
      {/* Botão Voltar */}
      <button
        disabled={pagina <= 1}
        onClick={() => onChange(pagina - 1)}
        className={`
          px-3 py-2 rounded-xl text-sm font-medium
          border border-gray-300 bg-white
          hover:bg-gray-100 active:scale-95 transition-all
          disabled:opacity-40 disabled:active:scale-100
        `}
      >
        Voltar
      </button>

      {/* Página atual */}
      <span className="px-3 py-2 rounded-xl text-sm font-semibold bg-gray-100 border border-gray-300">
        {pagina} / {totalPaginas}
      </span>

      {/* Botão Avançar */}
      <button
        disabled={pagina >= totalPaginas}
        onClick={() => onChange(pagina + 1)}
        className={`
          px-3 py-2 rounded-xl text-sm font-medium
          border border-gray-300 bg-white
          hover:bg-gray-100 active:scale-95 transition-all
          disabled:opacity-40 disabled:active:scale-100
        `}
      >
        Avançar
      </button>
    </div>
  );
}
