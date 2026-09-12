export function getQuickbloxConfig() {
  const apiUrl = (process.env.QUICKBLOX_API_URL ?? "https://api-bodyinc.quickblox.com").replace(
    /\/$/,
    "",
  );
  const providerAppUrl = (
    process.env.QUICKBLOX_PROVIDER_APP_URL ?? "https://provider-bodyinc.quickblox.com"
  ).replace(/\/$/, "");
  const providerEmail = process.env.QUICKBLOX_PROVIDER_EMAIL?.trim() || "";
  const providerPassword = process.env.QUICKBLOX_PROVIDER_PASSWORD?.trim() || "";
  const apiKey = process.env.QUICKBLOX_API_KEY?.trim() || "";
  const providerIdRaw = process.env.QUICKBLOX_PROVIDER_ID?.trim() || "";
  const providerId = providerIdRaw ? Number(providerIdRaw) : null;

  return {
    apiUrl,
    providerAppUrl,
    providerEmail,
    providerPassword,
    apiKey,
    providerId: Number.isFinite(providerId) ? providerId : null,
  };
}

export function isQuickbloxConfigured() {
  const cfg = getQuickbloxConfig();
  const hasProviderAuth = Boolean(cfg.providerEmail && cfg.providerPassword);
  const hasApiKey = Boolean(cfg.apiKey && cfg.providerId);
  return Boolean(cfg.apiUrl && cfg.providerAppUrl && (hasProviderAuth || hasApiKey));
}
