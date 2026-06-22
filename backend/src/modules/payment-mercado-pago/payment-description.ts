interface PaymentItem {
  quantity: number;
  product: {
    title: string;
  };
}

const MAX_PAYMENT_DESCRIPTION_LENGTH = 120;

export function buildPaymentDescription(
  orderNumber: number | string,
  items: PaymentItem[]
) {
  const firstItem = items[0];
  const suffix = ` | Pedido #${orderNumber}`;
  const prefix = "Helô Cosméticos - ";

  if (!firstItem) {
    return `${prefix}Compra online${suffix}`;
  }

  const firstQuantity =
    firstItem.quantity > 1
      ? `${firstItem.quantity}x `
      : "";
  const remainingItems = items
    .slice(1)
    .reduce(
      (total, item) =>
        total + item.quantity,
      0
    );
  const extraItems =
    remainingItems > 0
      ? ` + ${remainingItems} ${remainingItems === 1 ? "item" : "itens"}`
      : "";
  const summary =
    `${firstQuantity}${firstItem.product.title}${extraItems}`;
  const availableSummaryLength =
    MAX_PAYMENT_DESCRIPTION_LENGTH -
    prefix.length -
    suffix.length;
  const safeSummary =
    summary.length > availableSummaryLength
      ? `${summary.slice(0, availableSummaryLength - 3).trim()}...`
      : summary;

  return `${prefix}${safeSummary}${suffix}`;
}
