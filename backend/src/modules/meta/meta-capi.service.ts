import { createHash } from "crypto";

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_TOKEN;
const STORE_URL = process.env.STORE_URL || "https://helocosmeticos.com.br";
const GRAPH_URL = "https://graph.facebook.com/v19.0";

function sha256(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function hashPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return sha256(withCountry);
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
  num_items?: number;
  user_data?: {
    email?: string | null;
    phone?: string | null;
  };
}

export async function sendMetaCapiEvent(event: MetaCapiEvent): Promise<void> {
  if (!canSend()) {
    console.log("[Meta CAPI] Skipped — META_PIXEL_ID or META_CAPI_TOKEN not set");
    return;
  }

  const userDataRaw = event.user_data ?? {};
  const userDataHashed: Record<string, string[]> = {};
  if (userDataRaw.email) userDataHashed.em = [sha256(userDataRaw.email)];
  if (userDataRaw.phone) userDataHashed.ph = [hashPhone(userDataRaw.phone)];

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
          content_ids: event.content_ids,
          content_type: event.content_type ?? "product",
          num_items: event.num_items,
        },
      },
    ],
  };

  const url = `${GRAPH_URL}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[Meta CAPI] Error:", response.status, body);
  } else {
    console.log(`[Meta CAPI] ${event.event_name} sent — event_id: ${event.event_id}`);
  }
}
