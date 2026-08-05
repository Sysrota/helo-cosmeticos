import type { MetaCapiEvent } from "./meta-capi.service.js";

interface OrderForMetaUserData {
  fbp?: string | null;
  fbc?: string | null;
  client_ip_address?: string | null;
  client_user_agent?: string | null;
  contact_id?: number | null;
  contact?: {
    email?: string | null;
    phone?: string | null;
    name?: string | null;
    city?: string | null;
    state?: string | null;
    addresses?: {
      cep?: string | null;
      city?: string | null;
      state?: string | null;
    }[];
  } | null;
}

// Monta o user_data completo (advanced matching) para a Conversions API a
// partir de um pedido — usado tanto no fluxo Pix/Boleto (webhook) quanto no
// de cartão, para manter a qualidade de correspondência consistente entre
// os dois. Ver documentação: https://www.facebook.com/business/help/611774685654668
export function buildMetaUserData(
  order: OrderForMetaUserData
): NonNullable<MetaCapiEvent["user_data"]> {
  const contact = order.contact;
  const address = contact?.addresses?.[0];

  const nameParts = String(contact?.name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const firstName = nameParts[0] || null;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  return {
    email: contact?.email ?? null,
    phone: contact?.phone ?? null,
    first_name: firstName,
    last_name: lastName,
    city: address?.city || contact?.city || null,
    state: address?.state || contact?.state || null,
    zip: address?.cep || null,
    country: "BR",
    external_id: order.contact_id ?? null,
    fbp: order.fbp ?? null,
    fbc: order.fbc ?? null,
    client_ip_address: order.client_ip_address ?? null,
    client_user_agent: order.client_user_agent ?? null,
  };
}
