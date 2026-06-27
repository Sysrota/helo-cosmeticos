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

function contextLines(lines) {
  return [
    "",
    "Contexto do site:",
    ...lines.filter(Boolean),
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
      "Olá! Vim pelo carrinho da Helô Cosméticos.",
      contextLines([
        "origem=carrinho",
        `carrinho_itens=${cartInfo.items.join("; ")}`,
        `carrinho_valor=${formatBRL(cartInfo.total)}`,
      ]),
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
      contextLines([
        "origem=produto",
        `produto=${name}`,
        `produto_id=${productContext.id}`,
        productContext.category ? `categoria=${productContext.category}` : "",
        cartInfo ? `carrinho_itens=${cartInfo.items.join("; ")}` : "",
        cartInfo ? `carrinho_valor=${formatBRL(cartInfo.total)}` : "",
      ]),
    ].join("");
  }

  if (isProductPath) {
    return [
      "Olá! Vim pela página de um produto da Helô Cosméticos.",
      contextLines([
        "origem=produto",
        productPathId ? `produto_id=${productPathId}` : "",
        cartInfo ? `carrinho_itens=${cartInfo.items.join("; ")}` : "",
        cartInfo ? `carrinho_valor=${formatBRL(cartInfo.total)}` : "",
      ]),
    ].join("");
  }

  if (isProductsPath && categoryContext?.category) {
    return [
      `Olá! Vim pela categoria ${categoryContext.label} da Helô Cosméticos.`,
      contextLines([
        "origem=categoria",
        `categoria=${categoryContext.category}`,
        `categoria_nome=${categoryContext.label}`,
        cartInfo ? `carrinho_itens=${cartInfo.items.join("; ")}` : "",
        cartInfo ? `carrinho_valor=${formatBRL(cartInfo.total)}` : "",
      ]),
    ].join("");
  }

  if (isHomePath) {
    return [
      "Olá! Vim pela página inicial da Helô Cosméticos.",
      contextLines([
        "origem=home",
        cartInfo ? `carrinho_itens=${cartInfo.items.join("; ")}` : "",
        cartInfo ? `carrinho_valor=${formatBRL(cartInfo.total)}` : "",
      ]),
    ].join("");
  }

  return [
    "Olá! Vim pelo site da Helô Cosméticos e gostaria de atendimento.",
    contextLines([
      "origem=site",
      cartInfo ? `carrinho_itens=${cartInfo.items.join("; ")}` : "",
      cartInfo ? `carrinho_valor=${formatBRL(cartInfo.total)}` : "",
    ]),
  ].join("");
}
