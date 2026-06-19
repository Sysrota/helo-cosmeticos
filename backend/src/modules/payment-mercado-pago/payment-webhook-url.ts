function cleanBaseUrl(
  value?: string
) {
  const url =
    String(value || "")
      .trim()
      .replace(/\/$/, "");

  if (
    !url ||
    url.includes("localhost") ||
    url.includes("127.0.0.1")
  ) {
    return "";
  }

  return url;
}

export function getPaymentNotificationUrl() {
  const baseUrl =
    cleanBaseUrl(
      process.env.PUBLIC_API_URL
    ) ||
    cleanBaseUrl(
      process.env.BACKEND_URL
    ) ||
    cleanBaseUrl(
      process.env.FRONTEND_URL
    );

  return baseUrl
    ? `${baseUrl}/api/payment/webhook`
    : undefined;
}
