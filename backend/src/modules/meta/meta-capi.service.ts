import { createHash } from "crypto";

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_TOKEN;
const STORE_URL = process.env.STORE_URL || "https://helocosmeticos.com.br";
const GRAPH_URL = "https://graph.facebook.com/v19.0";
// Código de teste do Gerenciador de Eventos (aba "Testar eventos"). Quando
// definido, os eventos aparecem em tempo real ali para validação, sem
// contaminar os dados de produção/otimização de campanha.
const TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE;
// Modo DEBUG — loga payload completo enviado e resposta da Meta para cada
// evento (Purchase, etc). Ativar com META_CAPI_DEBUG=true no .env.
const DEBUG = process.env.META_CAPI_DEBUG === "true";

function sha256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function hashPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return sha256(withCountry);
}

function hashField(value?: string | null) {
  if (!value) return undefined;
  return sha256(String(value));
}

// Normaliza estado para sigla de 2 letras minúscula, exigido pela Meta antes do hash.
function hashState(value?: string | null) {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  return sha256(normalized.length > 2 ? normalized.slice(0, 2) : normalized);
}

// Normaliza CEP para apenas dígitos antes do hash, conforme especificação da Meta.
function hashZip(value?: string | null) {
  if (!value) return undefined;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return undefined;
  return sha256(digits);
}

function canSend() {
  return Boolean(PIXEL_ID && ACCESS_TOKEN);
}

export interface MetaCapiEvent {
  event_name: string;
  event_id: string;
  event_time?: number;
  source_url?: string;
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: { id: string; quantity: number; item_price: number }[];
  num_items?: number;
  user_data?: {
    email?: string | null;
    phone?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
    // external_id: identificador interno do cliente (ex: contact_id) — a Meta
    // recomenda hash, é enviado hasheado abaixo.
    external_id?: string | number | null;
    // fbp/fbc/IP/user-agent NÃO são hasheados — vão como capturados.
    fbp?: string | null;
    fbc?: string | null;
    client_ip_address?: string | null;
    client_user_agent?: string | null;
  };
}

export async function sendMetaCapiEvent(event: MetaCapiEvent): Promise<void> {
  if (!canSend()) {
    console.log("[Meta CAPI] Skipped — META_PIXEL_ID or META_CAPI_TOKEN not set");
    return;
  }

  const userDataRaw = event.user_data ?? {};
  const userDataHashed: Record<string, string | string[] | undefined> = {};
  if (userDataRaw.email) userDataHashed.em = [sha256(userDataRaw.email)];
  if (userDataRaw.phone) userDataHashed.ph = [hashPhone(userDataRaw.phone)];
  if (userDataRaw.first_name) userDataHashed.fn = [hashField(userDataRaw.first_name)!];
  if (userDataRaw.last_name) userDataHashed.ln = [hashField(userDataRaw.last_name)!];
  if (userDataRaw.city) userDataHashed.ct = [hashField(userDataRaw.city)!];
  if (userDataRaw.state) userDataHashed.st = [hashState(userDataRaw.state)!];
  if (userDataRaw.zip) userDataHashed.zp = [hashZip(userDataRaw.zip)!];
  if (userDataRaw.country) userDataHashed.country = [hashField(userDataRaw.country)!];
  if (userDataRaw.external_id) userDataHashed.external_id = [hashField(String(userDataRaw.external_id))!];
  // Não hasheados:
  if (userDataRaw.fbp) userDataHashed.fbp = userDataRaw.fbp;
  if (userDataRaw.fbc) userDataHashed.fbc = userDataRaw.fbc;
  if (userDataRaw.client_ip_address) userDataHashed.client_ip_address = userDataRaw.client_ip_address;
  if (userDataRaw.client_user_agent) userDataHashed.client_user_agent = userDataRaw.client_user_agent;

  const payload = {
    data: [
      {
        event_name: event.event_name,
        event_id: event.event_id,
        event_time: event.event_time ?? Math.floor(Date.now() / 1000),
        event_source_url: event.source_url ?? STORE_URL,
        action_source: "website",
        user_data: Object.keys(userDataHashed).length > 0 ? userDataHashed : undefined,
        custom_data: {
          currency: event.currency ?? "BRL",
          value: event.value,
          contents: event.contents,
          content_ids: event.content_ids,
          content_type: event.content_type ?? "product",
          num_items: event.num_items,
        },
      },
    ],
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  if (DEBUG) {
    console.log(
      "[Meta CAPI][DEBUG] Enviando evento",
      JSON.stringify(
        {
          origin: "CAPI",
          event_name: event.event_name,
          event_id: event.event_id,
          payload,
        },
        null,
        2
      )
    );
  }

  const url = `${GRAPH_URL}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const responseBody = DEBUG ? await response.text() : null;

  if (!response.ok) {
    const body = responseBody ?? (await response.text());
    console.error("[Meta CAPI] Error:", response.status, body);
  } else {
    console.log(`[Meta CAPI] ${event.event_name} sent — event_id: ${event.event_id}`);
    if (DEBUG) {
      console.log("[Meta CAPI][DEBUG] Resposta da Meta:", responseBody);
    }
  }
}
