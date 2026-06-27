import { ExternalLink } from "lucide-react";

export function OrderBoletoCard({
  generateBoleto,
  loadingBoleto,
  boletoData,
  order,
  total,
}) {
  const isPaid =
    order.payment_status === "paid" ||
    order.payment_status === "approved";

  return (
    <div className="bg-white border border-[#eee2e6] rounded-[22px] p-5">

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#43232d]">Boleto Bancário</h3>
        <p className="text-sm text-zinc-500 mt-1">
          Pague em qualquer banco, lotérica ou internet banking. Válido por 3 dias úteis.
        </p>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm">
          <span className="text-zinc-600">Total</span>
          <span className="font-semibold text-[#43232d]">
            {Number(total || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Sem desconto — o boleto não possui desconto adicional.
        </p>
      </div>

      <div className={`mb-5 rounded-2xl p-4 border ${
        isPaid
          ? "bg-green-50 border-green-200"
          : "bg-yellow-50 border-yellow-200"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-500">Status Pagamento</div>
            <div className={`font-bold mt-1 ${isPaid ? "text-green-700" : "text-yellow-700"}`}>
              {isPaid ? "Pagamento confirmado" : "Aguardando pagamento"}
            </div>
          </div>
          <div className={`w-4 h-4 rounded-full ${isPaid ? "bg-green-500" : "bg-yellow-500"}`} />
        </div>
      </div>

      <button
        onClick={generateBoleto}
        disabled={loadingBoleto}
        className="w-full bg-[#d85c7a] hover:bg-[#c9506d] text-white h-14 rounded-2xl font-bold transition-all"
      >
        {loadingBoleto
          ? "Gerando boleto..."
          : boletoData
            ? "Gerar novo boleto"
            : "Gerar Boleto"}
      </button>

      {boletoData && (
        <div className="mt-5 border border-[#eee2e6] rounded-2xl p-4 flex flex-col gap-4">
          <div className="text-center">
            <div className="text-xl font-semibold text-[#43232d]">Boleto Gerado</div>
            <div className="text-sm text-zinc-500 mt-1">
              Vence em 3 dias úteis. Pague em qualquer banco ou lotérica.
            </div>
          </div>

          {boletoData.boleto_barcode && (
            <>
              <div className="text-xs text-zinc-500 font-medium">Código de barras</div>
              <textarea
                readOnly
                value={boletoData.boleto_barcode}
                className="w-full h-20 border border-[#eee2e6] rounded-2xl p-4 text-sm font-mono"
              />
              <button
                onClick={() => navigator.clipboard.writeText(boletoData.boleto_barcode)}
                className="w-full bg-[#43232d] hover:bg-[#532d38] text-white py-4 rounded-2xl font-semibold"
              >
                Copiar código de barras
              </button>
            </>
          )}

          {boletoData.boleto_url && (
            <a
              href={boletoData.boleto_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 border border-[#d85c7a] text-[#d85c7a] py-4 rounded-2xl font-semibold hover:bg-[#fff5f7] transition"
            >
              <ExternalLink size={16} />
              Imprimir / Ver boleto
            </a>
          )}
        </div>
      )}
    </div>
  );
}
