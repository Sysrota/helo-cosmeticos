import { Filter, ArrowUpDown } from "lucide-react";
import Formatter from "../utils/Formatter";
import { statusPagamento } from "../utils/status-pagamento";
export default function HeaderModuloFincob({
  icon: Icon,
  title,
  subtitle,
  actionLabel = "Novo",
  onAction,
  onFilter,
  onOrder,
  orderRef,
  filtros,
  ordenar,
  onClearFilters,
  onClearOrder,
  ismostrarnovo = "true"
}) {
  const temFiltrosAtivos = Object.values(filtros || {}).some(
    (v) => v && String(v).trim() !== ""
  );

  return (
    <div className="w-full space-y-3 mb-1">

      {/* HEADER SUPERIOR */}
      <div className="bg-white shadow-sm rounded-xl px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">

        {/* Ícone + Títulos */}
        <div className="flex items-center space-x-4">
          {Icon && (
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shadow-sm">
              <Icon size={24} className="text-blue-700" />
            </div>
          )}

          <div>
            <h1 className="text-xl font-bold text-blue-700 leading-tight">
              {title}
            </h1>

            {subtitle && (
              <p className="text-gray-500 text-sm mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Botão Ação */}
        {ismostrarnovo && (
            <button
            onClick={onAction}
            className="
              flex items-center gap-2 bg-blue-600 hover:bg-blue-700 
              text-white font-medium px-4 py-2 rounded-lg shadow-sm
              transition-all active:scale-[0.97]
            "
          >
            <span className="text-lg">＋</span>
            {actionLabel}
          </button>
          )}
      </div>

 {/* BARRA DE AÇÕES + BADGES */}
    <div className="bg-white shadow-sm rounded-xl px-5 py-2 flex flex-wrap items-center gap-3">

      {/* Botão Filtro */}
      <button
        onClick={onFilter}
        className="
          flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 
          hover:bg-gray-100 transition-all text-gray-700 text-sm
        "
      >
        <Filter size={16} />
        Filtro
      </button>

      {/* Botão Ordenar */}
      <button
        ref={orderRef}
        onClick={onOrder}
        className="
          flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 
          hover:bg-gray-100 transition-all text-gray-700 text-sm
        "
      >
        <ArrowUpDown size={16} />
        Ordenar
      </button>

      {/* === CHIPS DE FILTROS ATIVOS === */}

      {/* CLIENTES */}

      {console.log(filtros)}

      {filtros?.numero_pedido && (
        <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
          <span>Nº do Pedido: <strong>{filtros.numero_pedido}</strong></span>
          <button
            onClick={() => onClearFilters({ field: "numero_pedido" })}
            className="text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </div>
      )}

      {filtros?.nome_fantasia && (
        <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
          <span>Nome Fantasia: <strong>{filtros.nome_fantasia}</strong></span>
          <button
            onClick={() => onClearFilters({ field: "nome_fantasia" })}
            className="text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </div>
      )}

      {filtros?.razao_social && (
        <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
          <span>Razão Social: <strong>{filtros.razao_social}</strong></span>
          <button
            onClick={() => onClearFilters({ field: "razao_social" })}
            className="text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </div>
      )}

      {filtros?.email && (
        <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
          <span>Email: <strong>{filtros.email}</strong></span>
          <button
            onClick={() => onClearFilters({ field: "email" })}
            className="text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </div>
      )}

      {filtros?.telefone && (
        <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
          <span>Telefone: <strong>{filtros.telefone}</strong></span>
          <button
            onClick={() => onClearFilters({ field: "telefone" })}
            className="text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </div>
      )}

      {filtros?.cpf && (
        <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
          <span>CPF/CNPJ: <strong>{filtros.cpf}</strong></span>
          <button
            onClick={() => onClearFilters({ field: "cpf" })}
            className="text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </div>
      )}

      {/* FIM DO CLIENTE */}



      {/* GENERICOS */}
        {filtros?.status && (
          <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
            <span>Status: <strong>{filtros.status === "ativo" ? "Ativos" : "Inativos"}</strong></span>
            <button
              onClick={() => onClearFilters({ field: "status" })}
              className="text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>
        )}

        {filtros?.nome && (
          <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
            <span>Nome: <strong>{filtros.nome}</strong></span>
            <button
              onClick={() => onClearFilters({ field: "nome" })}
              className="text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>
        )}

        {filtros?.fornecedor && (
          <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
            <span>Fornecedor: <strong>{filtros.fornecedor}</strong></span>
            <button
              onClick={() => onClearFilters({ field: "fornecedor" })}
              className="text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>
        )}

        {filtros?.descricao_venda && (
          <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
            <span>Descrição da venda: <strong>{filtros.descricao_venda}</strong></span>
            <button
              onClick={() => onClearFilters({ field: "descricao_venda" })}
              className="text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>
        )}

        {filtros?.status_pagamento && (
          <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
            <span>
              Status Pagamento: 
              <strong>
                 {statusPagamento[filtros.status_pagamento.toUpperCase()]?.label || "Indefinido"}
              </strong>
            </span>

            <button
              onClick={() => onClearFilters({ field: "status_pagamento" })}
              className="text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>
        )}



        {filtros?.categoria && (
          <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
            <span>Categoria: <strong>{filtros.categoria}</strong></span>
            <button
              onClick={() => onClearFilters({ field: "categoria" })}
              className="text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>
        )}

        {filtros?.valorMin && (
          <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
            <span>Valor mínimo: <strong>{Formatter.mascaraMoedaInput(filtros.valorMin)}</strong></span>
            <button
              onClick={() => onClearFilters({ field: "precoMin" })}
              className="text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>
        )}

        {filtros?.valorMax && (
          <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
            <span>Valor máximo: <strong>{Formatter.mascaraMoedaInput(filtros.valorMax)}</strong></span>
            <button
              onClick={() => onClearFilters({ field: "precoMax" })}
              className="text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>
        )}

        {filtros?.dataInicial && (
          <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
            <span>Data Inicial: <strong>{Formatter.data(filtros.dataInicial)}</strong></span>
            <button
              onClick={() => onClearFilters({ field: "dataInicial" })}
              className="text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>
        )}

        
        {filtros?.dataFinal && (
          <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md">
            <span>Data Final: <strong>{Formatter.data(filtros.dataFinal)}</strong></span>
            <button
              onClick={() => onClearFilters({ field: "dataFinal" })}
              className="text-gray-500 hover:text-gray-800"
            >
              ×
            </button>
          </div>
        )}

      {/* Fim dos Genéricos */}

      {/* Chip da Ordenação */}
      {ordenar && (
        <div className="flex items-center gap-2 text-sm bg-gray-100 px-2 py-1 rounded-md ml-1">
          <span>
            Ordenando:{" "}
            <strong>
              {ordenar === "fantasia_asc" && "Nome Fantasia A → Z"}
              {ordenar === "fantasia_desc" && "Nome Fantasia Z → A"}
              {ordenar === "recentes" && "Mais recentes"}
              {ordenar === "antigos" && "Mais antigos"}
              {ordenar === "status" && "Status"}
              {ordenar === "status_ativo" && "Ativos"}
              {ordenar === "status_inativo" && "Inativos"}
              {ordenar === "nome_asc" && "Nome Fantasia A → Z"}
              {ordenar === "nome_desc" && "Nome Fantasia A → Z"}
              {ordenar === "vencimento_asc"&& "Vencimento (Próximos)" }
              {ordenar === "vencimento_desc"&& "Vencimento (Últimos)" }
              {ordenar === "pago"&& "🟢 Pago" }
              {ordenar === "pendente"&& "🟡 A Vencer" }
              {ordenar === "vencido"&& "🔴 Vencido" }
              {ordenar === "razao_asc" && "Razão Social A → Z"}
              {ordenar === "razao_desc" && "Razão Social A → Z"}
              {ordenar === "valor_asc" && "Maior Valor"}
              {ordenar === "valor_desc" && "Menor Valor"}
            </strong>
          </span>
          <button
            onClick={onClearOrder}
            className="text-gray-500 hover:text-gray-800"
          >
            ×
          </button>
        </div>
      )}

      {/* BOTÃO LIMPAR TUDO (só aparece se houver algo ativo) */}
      {(ordenar || Object.values(filtros).some((v) => v)) && (
        <button
          onClick={() => {
            onClearOrder();
            onClearFilters({ all: true });
          }}
          className="text-xs text-red-600 hover:underline"
        >
          Limpar tudo
        </button>
      )}

    </div>

    </div>
  );
}