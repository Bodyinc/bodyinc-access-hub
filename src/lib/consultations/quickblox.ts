import { createHmac } from "node:crypto";

import { canProvisionQuickbloxAgents, getQuickbloxConfig } from "./config";

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

export type QuickbloxProviderSession = {
  token: string;
  userId: number;
};

let ownerSessionCache: QuickbloxProviderSession & { expiresAt: number } | null = null;
const agentSessionCache = new Map<string, QuickbloxProviderSession & { expiresAt: number }>();

function qbPasswordForProvider(userId: string) {
  const { userSecret } = getQuickbloxConfig();
  if (!userSecret) throw new Error("QUICKBLOX_USER_SECRET is not configured.");
  const digest = createHmac("sha256", userSecret).update(`provider:${userId}`).digest("base64url");
  return `Bi.${digest.slice(0, 24)}!`;
}

function normalizeFullName(name: string) {
  const trimmed = name.trim() || "Provider";
  return trimmed.length >= 3 ? trimmed.slice(0, 60) : `${trimmed} MD`.slice(0, 60);
}

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

function cacheSession(email: string, session: QuickbloxProviderSession) {
  agentSessionCache.set(email, { ...session, expiresAt: Date.now() + 90 * 60 * 1000 });
}

export async function getOwnerProviderAuth(): Promise<QuickbloxProviderSession> {
  const cfg = getQuickbloxConfig();
  const now = Date.now();
  if (ownerSessionCache && ownerSessionCache.token && ownerSessionCache.expiresAt > now) {
    return ownerSessionCache;
  }

  if (cfg.providerEmail && cfg.providerPassword) {
    const { token, user } = await loginProvider(cfg.providerEmail, cfg.providerPassword);
    ownerSessionCache = {
      token,
      userId: cfg.providerId ?? user.id,
      expiresAt: now + 90 * 60 * 1000,
    };
    return ownerSessionCache;
  }

  if (cfg.apiKey && cfg.providerId) {
    return { token: cfg.apiKey, userId: cfg.providerId };
  }

  throw new Error("QuickBlox provider credentials are not configured.");
}

/** @deprecated use getOwnerProviderAuth */
export async function getProviderAuth() {
  return getOwnerProviderAuth();
}

export async function loginQuickbloxProviderAgent(params: { email: string; userId: string }) {
  const email = params.email.trim().toLowerCase();
  const cached = agentSessionCache.get(email);
  if (cached && cached.token && cached.expiresAt > Date.now()) {
    return { token: cached.token, userId: cached.userId };
  }
  const { token, user } = await loginProvider(email, qbPasswordForProvider(params.userId));
  const session = { token, userId: user.id };
  cacheSession(email, session);
  return session;
}

export async function ensureQuickbloxProviderAgent(params: {
  userId: string;
  email: string;
  fullName: string;
  profession?: string | null;
  phone?: string | null;
  language?: string | null;
}): Promise<{ userId: number; created: boolean }> {
  if (!canProvisionQuickbloxAgents()) {
    throw new Error("QuickBlox agent provisioning is not configured.");
  }

  const email = params.email.trim().toLowerCase();
  const password = qbPasswordForProvider(params.userId);
  const fullName = normalizeFullName(params.fullName);
  const profession = (params.profession?.trim() || "Clinician").slice(0, 60);
  const language = (params.language?.trim() || "English").slice(0, 40);

  try {
    const created = await qbFetch<{ session: QbSession; user: QbUser }>("/users/provider", {
      method: "POST",
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
        profession,
        language,
        ...(params.phone ? { phone: params.phone } : {}),
      }),
    });
    cacheSession(email, { token: created.session.token, userId: created.user.id });
    return { userId: created.user.id, created: true };
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status !== 422 && status !== 409) throw error;
  }

  try {
    const existing = await loginQuickbloxProviderAgent({ email, userId: params.userId });
    return { userId: existing.userId, created: false };
  } catch {
    throw new Error(
      "This email already has a QuickBlox account with a different password. Use another email, or ask IT to reset that QuickBlox user.",
    );
  }
}

export async function reassignAppointmentToProvider(params: {
  appointmentId: string;
  qbProviderId: number;
}) {
  const owner = await getOwnerProviderAuth();
  await qbFetch(`/appointments/${params.appointmentId}`, {
    method: "PATCH",
    token: owner.token,
    body: JSON.stringify({ provider_id: params.qbProviderId }),
  });
}

export function isAppointmentOpen(appointment: QbAppointment) {
  return appointment.date_end == null || appointment.date_end === "";
}

export async function listProviderAppointments(token?: string) {
  const session = token ? { token } : await getOwnerProviderAuth();
  const listed = await qbFetch<{ items?: QbAppointment[] }>(
    "/appointments/my?limit=1000&sort_desc=updated_at",
    { token: session.token },
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
