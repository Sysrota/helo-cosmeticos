const pixelId =
  import.meta.env.VITE_META_PIXEL_ID;

let initialized = false;

function canUsePixel() {
  return typeof window !== "undefined" &&
    !!pixelId;
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
