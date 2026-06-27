export type CustomerIntent =
  | "catalog"
  | "product_search"
  | "current_product"
  | "need"
  | "greeting"
  | "unknown";

export function normalizeIntentText(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function hasAny(
  value: string,
  terms: string[]
) {
  return terms.some((term) =>
    value.includes(
      normalizeIntentText(term)
    )
  );
}

export function classifyCustomerIntent(
  message: string
): CustomerIntent {
  const normalized =
    normalizeIntentText(message);

  if (
    [
      "oi",
      "ola",
      "bom dia",
      "boa tarde",
      "boa noite",
    ].some((greeting) =>
      normalized === greeting ||
      normalized.startsWith(`${greeting} `)
    )
  ) {
    return "greeting";
  }

  if (
    hasAny(
      normalized,
      [
        "o que mais",
        "que mais voces tem",
        "que mais voces têm",
        "mais produtos",
        "outros produtos",
        "outras opcoes",
        "outras opções",
        "catalogo",
        "catalogo da loja",
        "ver produtos",
        "ver catalogo completo",
        "quais produtos",
        "duas linhas",
        "conhecer as duas linhas",
        "o que voces vendem",
        "o que voces tem",
        "trabalham com o que",
        "tem mais alguma coisa",
        "tem alguma outra coisa",
      ]
    )
  ) {
    return "catalog";
  }

  if (
    hasAny(
      normalized,
      [
        "oleosidade",
        "oleosa",
        "ressec",
        "pele seca",
        "sem brilho",
        "vico",
        "viço",
        "começar uma rotina",
        "comecar uma rotina",
        "minha pele",
      ]
    )
  ) {
    return "need";
  }

  if (
    hasAny(
      normalized,
      [
        "shampoo",
        "condicionador",
        "mascara",
        "máscara",
        "redutor",
        "finalizador",
        "cabelo",
        "capilar",
        "pele",
        "facial",
        "hidratante",
        "esfoliante",
        "gel de limpeza",
        "limpeza facial",
        "primeskin",
        "forte liso",
      ]
    )
  ) {
    return "product_search";
  }

  if (
    hasAny(
      normalized,
      [
        "esse",
        "essa",
        "ele",
        "ela",
        "do kit",
        "quanto",
        "preco",
        "preço",
        "valor",
        "custa",
        "frete",
        "cep",
        "entrega",
        "como usa",
        "modo de uso",
        "foto",
        "imagem",
        "link",
        "comprar",
        "finalizar",
        "sim",
        "quero",
        "gostei",
      ]
    )
  ) {
    return "current_product";
  }

  return "unknown";
}

export function shouldUseSavedProductContext(
  intent: CustomerIntent
) {
  return [
    "current_product",
    "need",
    "unknown",
  ].includes(intent);
}
