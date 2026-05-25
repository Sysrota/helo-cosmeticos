export const STORE_WHATSAPP_NUMBER = "5562994445197";

export function buildWhatsAppUrl(message) {
  return `https://wa.me/${STORE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
