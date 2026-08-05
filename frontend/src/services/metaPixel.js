const pixelId =
  import.meta.env.VITE_META_PIXEL_ID;

// Modo DEBUG — loga no console cada evento disparado (nome, payload,
// event_id, origem) para validar novos eventos sem precisar abrir o
// Gerenciador de Eventos. Ativar com VITE_META_DEBUG=true no .env.
const DEBUG =
  import.meta.env.VITE_META_DEBUG === "true";

let initialized = false;

function canUsePixel() {
  return typeof window !== "undefined" &&
    !!pixelId;
}

function debugLog(eventName, params, options) {
  if (!DEBUG) return;
  console.log(
    "[Meta Pixel][DEBUG]",
    {
      origin: "Browser",
      event_name: eventName,
      event_id: options?.eventId || null,
      payload: params,
    }
  );
}

// Lê um cookie pelo nome (usado para _fbp/_fbc, gravados pelo próprio
// fbevents.js). Enviamos esses valores ao backend no checkout para que a
// Conversions API consiga deduplicar/casar com o evento do navegador mesmo
// quando o Purchase é confirmado depois, de forma assíncrona (webhook).
function readCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function getFbp() {
  return readCookie("_fbp");
}

export function getFbc() {
  const fromCookie = readCookie("_fbc");
  if (fromCookie) return fromCookie;

  // Fallback: se o cookie ainda não foi gravado (primeira visita antes do
  // fbevents.js carregar) mas a URL trouxe fbclid, montamos o valor no
  // formato esperado pela Meta: fb.1.<timestamp>.<fbclid>
  if (typeof window === "undefined") return null;
  const fbclid =
    new URLSearchParams(window.location.search).get("fbclid");
  if (!fbclid) return null;
  return `fb.1.${Date.now()}.${fbclid}`;
}

export function initMetaPixel() {
  if (
    !canUsePixel() ||
    initialized
  ) {
    return false;
  }

  /* eslint-disable */
  !(function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)})(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq(
    "init",
    pixelId
  );

  initialized = true;
  return true;
}

export function trackMetaEvent(
  eventName,
  params = {},
  options = {}
) {
  if (!canUsePixel()) {
    return false;
  }

  initMetaPixel();

  if (typeof window.fbq !== "function") {
    return false;
  }

  debugLog(eventName, params, options);

  if (options.eventId) {
    window.fbq(
      "track",
      eventName,
      params,
      {
        eventID:
          options.eventId,
      }
    );
  } else {
    window.fbq(
      "track",
      eventName,
      params
    );
  }

  return true;
}

export function trackMetaCustomEvent(
  eventName,
  params = {},
  options = {}
) {
  if (!canUsePixel()) {
    return false;
  }

  initMetaPixel();

  if (typeof window.fbq !== "function") {
    return false;
  }

  debugLog(eventName, params, options);

  if (options.eventId) {
    window.fbq(
      "trackCustom",
      eventName,
      params,
      {
        eventID:
          options.eventId,
      }
    );
  } else {
    window.fbq(
      "trackCustom",
      eventName,
      params
    );
  }

  return true;
}

export function trackMetaPageView() {
  return trackMetaEvent(
    "PageView"
  );
}

export function buildMetaContents(items = []) {
  return items.map((item) => ({
    id: String(
      item.product_id ??
      item.product?.id ??
      item.id ??
      item.product?.title ??
      ""
    ),
    quantity:
      Number(item.quantity || 1),
    item_price:
      Number(
        item.unit_price ??
        item.price ??
        0
      ),
  }));
}

export function buildMetaContentIds(items = []) {
  return buildMetaContents(items)
    .map((item) => item.id)
    .filter(Boolean);
}

export function buildMetaNumItems(items = []) {
  return items.reduce(
    (sum, item) => sum + Number(item.quantity || 1),
    0
  );
}
