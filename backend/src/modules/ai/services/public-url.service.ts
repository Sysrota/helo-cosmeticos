function cleanBaseUrl(value?: string) {
  const url =
    value?.trim();

  if (!url) {
    return "";
  }

  return url.replace(/\/$/, "");
}

export function getPublicSiteUrl() {
  return (
    cleanBaseUrl(process.env.FRONTEND_URL) ||
    cleanBaseUrl(process.env.APP_URL) ||
    "https://helocosmeticos.com"
  );
}

export function getProductUrl(productId: number) {
  return `${getPublicSiteUrl()}/produto/${productId}`;
}

export function getProductsUrl() {
  return `${getPublicSiteUrl()}/produtos`;
}
