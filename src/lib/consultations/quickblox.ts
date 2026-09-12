import { getQuickbloxConfig } from "./config";

type QbErrorBody = {
  statusCode?: number;
  error?: string;
  message?: string;
};

type QbSession = {
  token: string;
  user_id: number;
};

type QbUser = {
  id: number;
  full_name?: string;
  email?: string;
};

export type QbAppointment = {
  _id: string;
  client_id?: number;
  provider_id?: number;
  dialog_id?: string | null;
  description?: string;
  date_end?: string | null;
};

let providerSessionCache: { token: string; userId: number; expiresAt: number } | null = null;

async function qbFetch<T>(
  path: string,
  init: RequestInit & { token?: string; apiKey?: string } = {},
): Promise<T> {
  const { apiUrl } = getQuickbloxConfig();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.apiKey) headers.set("Authorization", `Bearer ${init.apiKey}`);

  const res = await fetch(`${apiUrl}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body,
    cache: "no-store",
  });

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = { message: text };
    }
  }

  if (!res.ok) {
    const err = (json ?? {}) as QbErrorBody;
    const message = err.message || err.error || `QuickBlox request failed (${res.status})`;
    const error = new Error(message) as Error & { status: number };
    error.status = res.status;
    throw error;
  }

  return json as T;
}

async function loginProvider(email: string, password: string) {
  const result = await qbFetch<{ session: QbSession; data: QbUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ role: "provider", email, password }),
  });
  return { token: result.session.token, user: result.data };
}

export async function getProviderAuth() {
  const cfg = getQuickbloxConfig();
  const now = Date.now();
  if (providerSessionCache && providerSessionCache.token && providerSessionCache.expiresAt > now) {
    return providerSessionCache;
  }

  if (cfg.providerEmail && cfg.providerPassword) {
    const { token, user } = await loginProvider(cfg.providerEmail, cfg.providerPassword);
    providerSessionCache = {
      token,
      userId: cfg.providerId ?? user.id,
      expiresAt: now + 90 * 60 * 1000,
    };
    return providerSessionCache;
  }

  if (cfg.apiKey && cfg.providerId) {
    return { token: cfg.apiKey, userId: cfg.providerId, expiresAt: now + 90 * 60 * 1000 };
  }

  throw new Error("QuickBlox provider credentials are not configured.");
}

export function isAppointmentOpen(appointment: QbAppointment) {
  return appointment.date_end == null || appointment.date_end === "";
}

export async function listProviderAppointments() {
  const provider = await getProviderAuth();
  const listed = await qbFetch<{ items?: QbAppointment[] }>(
    "/appointments/my?limit=1000&sort_desc=updated_at",
    { token: provider.token },
  );
  return listed.items ?? [];
}

export function buildProviderAppointmentUrl(params: { token: string; appointmentId: string }) {
  const { providerAppUrl } = getQuickbloxConfig();
  const url = new URL(`${providerAppUrl}/appointment/${params.appointmentId}`);
  url.searchParams.set("token", params.token);
  return url.toString();
}

export function buildProviderInboxUrl(token: string) {
  const { providerAppUrl } = getQuickbloxConfig();
  const url = new URL(providerAppUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
