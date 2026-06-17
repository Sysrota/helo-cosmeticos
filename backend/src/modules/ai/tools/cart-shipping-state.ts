interface ShippingAddress {
  zipcode?: string;
  street?: string;
  district?: string;
  city?: string;
  state?: string;
}

interface RememberShippingQuoteProps {
  cleanCep: string;
  address: ShippingAddress;
  destination: string;
  policy: string;
  options: any[];
  subtotal: number;
  freeShippingMinimum?: number;
}

export function invalidateCartShippingQuote(
  cart: any
) {
  if (
    !cart ||
    typeof cart !== "object"
  ) {
    return cart;
  }

  if (cart.shipping_quote) {
    delete cart.shipping_quote;
    cart.shipping_needs_recalculation =
      true;
    cart.shipping_recalculation_reason =
      "cart_changed";
  }

  return cart;
}

export function rememberCartShippingQuote(
  cart: any,
  {
    cleanCep,
    address,
    destination,
    policy,
    options,
    subtotal,
    freeShippingMinimum,
  }: RememberShippingQuoteProps
) {
  if (
    !cart ||
    typeof cart !== "object"
  ) {
    return cart;
  }

  cart.shipping_address = {
    cep:
      cleanCep,
    formatted_cep:
      address.zipcode || cleanCep,
    street:
      address.street || "",
    district:
      address.district || "",
    city:
      address.city || "",
    state:
      address.state || "",
  };

  cart.shipping_quote = {
    status:
      "current",
    cep:
      cleanCep,
    destination,
    policy,
    options,
    subtotal,
    free_shipping_minimum:
      freeShippingMinimum,
    calculated_at:
      new Date().toISOString(),
  };

  cart.shipping_needs_recalculation =
    false;
  delete cart.shipping_recalculation_reason;

  return cart;
}

export function rememberCartShippingAddress(
  cart: any,
  cleanCep: string,
  address: ShippingAddress
) {
  if (
    !cart ||
    typeof cart !== "object"
  ) {
    return cart;
  }

  cart.shipping_address = {
    cep:
      cleanCep,
    formatted_cep:
      address.zipcode || cleanCep,
    street:
      address.street || "",
    district:
      address.district || "",
    city:
      address.city || "",
    state:
      address.state || "",
  };

  return cart;
}
