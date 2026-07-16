import axios from "axios";

const MANDA_BEM_URL = "https://mandabem.com.br/ws/valor_envio";

// A loja nao envia por SEDEX, so por transportadora.
const MANDA_BEM_SERVICES = ["PAC"] as const;

interface MandaBemQuoteParams {
  cepOrigem: string;
  cepDestino: string;
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
  valorSeguro: number;
}

export interface MandaBemServiceQuote {
  servico: string;
  price: number;
  days: number;
}

function isConfigured() {
  return Boolean(
    process.env.MANDA_BEM_PLATAFORMA_ID &&
      process.env.MANDA_BEM_PLATAFORMA_CHAVE
  );
}

async function quoteService(
  servico: string,
  params: MandaBemQuoteParams
): Promise<MandaBemServiceQuote | null> {
  const body = new URLSearchParams({
    plataforma_id: process.env.MANDA_BEM_PLATAFORMA_ID || "",
    plataforma_chave: process.env.MANDA_BEM_PLATAFORMA_CHAVE || "",
    cep_origem: params.cepOrigem,
    cep_destino: params.cepDestino,
    servico,
    peso: params.peso.toFixed(2),
    altura: params.altura.toFixed(2),
    largura: params.largura.toFixed(2),
    comprimento: params.comprimento.toFixed(2),
    valor_seguro: params.valorSeguro.toFixed(2),
  });

  try {
    const { data } = await axios.post(MANDA_BEM_URL, body, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const resultado = data?.resultado;

    if (!resultado || String(resultado.sucesso) !== "true") {
      if (resultado?.error) {
        console.warn(
          `[MandaBem] ${servico} indisponível para ${params.cepDestino}:`,
          resultado.error
        );
      }

      return null;
    }

    const service = resultado[servico];
    const price = Number(service?.valor);
    const days = Number(service?.prazo);

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(days) ||
      days <= 0
    ) {
      return null;
    }

    return {
      servico,
      price,
      days,
    };
  } catch (error) {
    console.error(
      `[MandaBem] Erro ao consultar ${servico}:`,
      axios.isAxiosError(error)
        ? error.response?.data || error.message
        : error
    );

    return null;
  }
}

export async function quoteMandaBemShipping(
  params: MandaBemQuoteParams
): Promise<MandaBemServiceQuote[]> {
  if (!isConfigured()) {
    return [];
  }

  const results = await Promise.all(
    MANDA_BEM_SERVICES.map((servico) => quoteService(servico, params))
  );

  return results.filter(
    (result): result is MandaBemServiceQuote => Boolean(result)
  );
}
