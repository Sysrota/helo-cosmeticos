import axios from "axios";

const MANDA_BEM_URL = "https://mandabem.com.br/ws/valor_envio";

// servico=ALL retorna todas as transportadoras habilitadas na conta pra
// aquele trajeto/pacote (Correios PAC/SEDEX, Jadlog, Loggi etc), cada uma
// como uma chave do objeto "resultado" - nao ha lista fixa de codigos.
const ALL_SERVICES = "ALL";

const NON_SERVICE_KEYS = new Set(["sucesso", "mensagem", "error"]);

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
  name?: string;
  price: number;
  days: number;
}

function isConfigured() {
  return Boolean(
    process.env.MANDA_BEM_PLATAFORMA_ID &&
      process.env.MANDA_BEM_PLATAFORMA_CHAVE
  );
}

export async function quoteMandaBemShipping(
  params: MandaBemQuoteParams
): Promise<MandaBemServiceQuote[]> {
  if (!isConfigured()) {
    return [];
  }

  const body = new URLSearchParams({
    plataforma_id: process.env.MANDA_BEM_PLATAFORMA_ID || "",
    plataforma_chave: process.env.MANDA_BEM_PLATAFORMA_CHAVE || "",
    cep_origem: params.cepOrigem,
    cep_destino: params.cepDestino,
    servico: ALL_SERVICES,
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
          `[MandaBem] Cotação indisponível para ${params.cepDestino}:`,
          resultado.error
        );
      }

      return [];
    }

    const quotes: MandaBemServiceQuote[] = [];

    for (const [servico, rawService] of Object.entries(resultado)) {
      if (NON_SERVICE_KEYS.has(servico)) continue;

      const service = rawService as { valor?: unknown; prazo?: unknown; name?: unknown };
      const price = Number(service?.valor);
      const days = Number(service?.prazo);

      if (
        !Number.isFinite(price) ||
        price <= 0 ||
        !Number.isFinite(days) ||
        days <= 0
      ) {
        continue;
      }

      quotes.push({
        servico,
        name: service?.name ? String(service.name) : undefined,
        price,
        days,
      });
    }

    return quotes;
  } catch (error) {
    console.error(
      "[MandaBem] Erro ao consultar frete:",
      axios.isAxiosError(error)
        ? error.response?.data || error.message
        : error
    );

    return [];
  }
}
