function env(name: string) {
  return (process.env[name] ?? "").trim();
}

export function getQuickbloxConfig() {
  const apiUrl = (env("QUICKBLOX_API_URL") || "https://api-bodyinc.quickblox.com").replace(
    /\/$/,
    "",
  );
  const providerAppUrl = (
    env("QUICKBLOX_PROVIDER_APP_URL") || "https://provider-bodyinc.quickblox.com"
  ).replace(/\/$/, "");
  const providerEmail = env("QUICKBLOX_PROVIDER_EMAIL");
  const providerPassword = env("QUICKBLOX_PROVIDER_PASSWORD");
  const apiKey = env("QUICKBLOX_API_KEY");
  const userSecret = env("QUICKBLOX_USER_SECRET");
  const providerIdRaw = env("QUICKBLOX_PROVIDER_ID");
  const providerId = providerIdRaw ? Number(providerIdRaw) : null;

  return {
    apiUrl,
    providerAppUrl,
    providerEmail,
    providerPassword,
    apiKey,
    userSecret,
    providerId: Number.isFinite(providerId) ? providerId : null,
  };
}

export function isQuickbloxConfigured() {
  const cfg = getQuickbloxConfig();
  const hasProviderAuth = Boolean(cfg.providerEmail && cfg.providerPassword);
  const hasApiKey = Boolean(cfg.apiKey && cfg.providerId);
  return Boolean(cfg.apiUrl && cfg.providerAppUrl && (hasProviderAuth || hasApiKey));
}

export function canProvisionQuickbloxAgents() {
  return isQuickbloxConfigured() && Boolean(getQuickbloxConfig().userSecret);
}
