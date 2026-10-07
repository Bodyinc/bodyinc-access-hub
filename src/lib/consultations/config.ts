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

  const appIdRaw =
    env("QUICKBLOX_APP_ID") ||
    env("VITE_QUICKBLOX_APP_ID") ||
    "108471";
  const appId = Number(appIdRaw) || 108471;
  const authKey =
    env("QUICKBLOX_AUTH_KEY") ||
    env("VITE_QUICKBLOX_AUTH_KEY") ||
    "ak_xjJy9Tuv9jDgdEw";
  const authSecret =
    env("QUICKBLOX_AUTH_SECRET") ||
    env("VITE_QUICKBLOX_AUTH_SECRET") ||
    "as_S6-E5A6Dwz-T2qb";
  const accountKey =
    env("QUICKBLOX_ACCOUNT_KEY") ||
    env("VITE_QUICKBLOX_ACCOUNT_KEY") ||
    "ack_UzqY8uy_UqMnkY3wyMpQ";

  return {
    apiUrl,
    providerAppUrl,
    providerEmail,
    providerPassword,
    apiKey,
    userSecret,
    providerId: Number.isFinite(providerId) ? providerId : null,
    appId,
    authKey,
    authSecret,
    accountKey,
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
