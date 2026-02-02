import { useParams } from "react-router-dom";
import { produtosPrimeSkin } from "../data/produtosPrimeSkin";

export default function ProdutoDescricao() {
  const { id } = useParams();
  const produto = produtosPrimeSkin[id];

  if (!produto) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-500">Produto não encontrado</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-slate-700">

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-pink-600">
          {produto.nome}
        </h1>
      </header>

      <section className="space-y-4 leading-relaxed">
        <p>{produto.descricao}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-slate-800 mb-2">
          Modo de Usar
        </h2>
        <p>{produto.modoDeUsar}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-slate-800 mb-2">
          Composição (INCI)
        </h2>
        <p className="text-sm leading-relaxed">
          {produto.composicaoINCI}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-medium text-slate-800 mb-2">
          Composição (Português)
        </h2>
        <p className="text-sm leading-relaxed">
          {produto.composicaoPT}
        </p>
      </section>

      <section className="mt-8 bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h2 className="text-lg font-medium text-slate-800 mb-2">
          Restrições de Uso
        </h2>
        <p className="text-sm leading-relaxed">
          {produto.restricoes}
        </p>
      </section>

    </div>
  );
}
