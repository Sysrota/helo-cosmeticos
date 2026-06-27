const PRODUCT_CONTEXT_KEY = "helo_whatsapp_product_context";
const CATEGORY_CONTEXT_KEY = "helo_whatsapp_category_context";
const CONTEXT_EVENT = "helo:whatsapp-context";

const CATEGORY_LABELS = {
  condicionador: "Condicionador",
  finalizador: "Finalizador",
  kit: "Kits",
  mascara: "Máscara",
  redutor: "Redutor de volume",
  shampoo: "Shampoo",
  skincare: "Skincare",
};

function readJson(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function formatBRL(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function cleanLine(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function productDisplayName(title) {
  return cleanLine(title)
    .replace(/\s*-\s*Rotina.*$/i, "")
    .replace(/\s*-\s*Helô Cosméticos.*$/i, "");
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category || "";
}

function cartSummary(cart = []) {
  const items = cart
    .filter(Boolean)
    .map((item) => {
      const title = cleanLine(item.title || item.name);
      if (!title) return "";
      const quantity = Number(item.quantity || 1);
      return `${title} x${quantity}`;
    })
    .filter(Boolean)
    .slice(0, 4);

  if (!items.length) {
    return null;
  }

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price || item.unit_price || 0) * Number(item.quantity || 1),
    0
  );

  return {
    items,
    total,
  };
}

function cartText(cartInfo) {
  if (!cartInfo) return "";

  return [
    "",
    "Meu carrinho:",
    ...cartInfo.items.map((item) => `• ${item}`),
    `Total: ${formatBRL(cartInfo.total)}`,
  ].join("\n");
}

export function saveWhatsAppProductContext(product) {
  if (!product?.id) return;

  sessionStorage.setItem(
    PRODUCT_CONTEXT_KEY,
    JSON.stringify({
      id: product.id,
      title: product.title,
      category: product.category,
      price: product.price,
    })
  );

  window.dispatchEvent(new Event(CONTEXT_EVENT));
}

export function saveWhatsAppCategoryContext(category) {
  if (!category || category === "all") {
    sessionStorage.removeItem(CATEGORY_CONTEXT_KEY);
  } else {
    sessionStorage.setItem(
      CATEGORY_CONTEXT_KEY,
      JSON.stringify({
        category,
        label: categoryLabel(category),
      })
    );
  }

  window.dispatchEvent(new Event(CONTEXT_EVENT));
}

export function subscribeWhatsAppContextEvent(handler) {
  window.addEventListener(CONTEXT_EVENT, handler);
  return () => window.removeEventListener(CONTEXT_EVENT, handler);
}

export function buildSiteWhatsAppMessage({
  pathname,
  cart = [],
}) {
  const productContext = readJson(PRODUCT_CONTEXT_KEY);
  const categoryContext = readJson(CATEGORY_CONTEXT_KEY);
  const cartInfo = cartSummary(cart);
  const productPathMatch = pathname.match(/^\/produto\/([^/]+)/);
  const productPathId = productPathMatch?.[1] || "";
  const isProductPath = Boolean(productPathMatch);
  const isProductsPath = pathname === "/produtos";
  const isCartPath = pathname === "/carrinho";
  const isHomePath = pathname === "/";

  if (isCartPath && cartInfo) {
    return [
      "Olá! Vim pelo carrinho da Helô Cosméticos e quero ajuda para finalizar.",
      cartText(cartInfo),
    ].join("");
  }

  if (
    isProductPath &&
    productContext?.title &&
    String(productContext.id) === productPathId
  ) {
    const name = productDisplayName(productContext.title);
    return [
      `Olá! Vim pela página do ${name}.`,
      cartText(cartInfo),
    ].join("");
  }

  if (isProductPath) {
    return [
      "Olá! Vim pela página de um produto da Helô Cosméticos.",
      cartText(cartInfo),
    ].join("");
  }

  if (isProductsPath && categoryContext?.category) {
    return [
      `Olá! Vim pela categoria ${categoryContext.label} da Helô Cosméticos.`,
      cartText(cartInfo),
    ].join("");
  }

  if (isHomePath) {
    return [
      "Olá! Vim pela página inicial da Helô Cosméticos.",
      cartText(cartInfo),
    ].join("");
  }

  return [
    "Olá! Vim pelo site da Helô Cosméticos e gostaria de atendimento.",
    cartText(cartInfo),
  ].join("");
}
