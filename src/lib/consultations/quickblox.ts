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

function normalizeFullName(name: string, fallback = "Provider") {
  const trimmed = name.trim() || fallback;
  if (trimmed.length >= 3) return trimmed.slice(0, 60);
  return `${trimmed} ${fallback === "Provider" ? "MD" : "PT"}`.slice(0, 60);
}

function qbPasswordForPlan(userId: string, subscriptionId: string) {
  const { userSecret } = getQuickbloxConfig();
  if (!userSecret) throw new Error("QUICKBLOX_USER_SECRET is not configured.");
  const digest = createHmac("sha256", userSecret)
    .update(`${userId}:${subscriptionId}`)
    .digest("base64url");
  return `Bi.${digest.slice(0, 24)}!`;
}

function qbClientEmail(userId: string, subscriptionId: string) {
  const { userSecret } = getQuickbloxConfig();
  if (!userSecret) throw new Error("QUICKBLOX_USER_SECRET is not configured.");
  const digest = createHmac("sha256", userSecret)
    .update(`${userId}:${subscriptionId}`)
    .digest("hex")
    .slice(0, 20);
  return `qb.${digest}@patients.bodyinc.com`;
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
  try {
    const result = await qbFetch<{ session: QbSession; data: QbUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ role: "provider", email, password }),
    });
    return { token: result.session.token, user: result.data };
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    const message = error instanceof Error ? error.message : "";
    if (status === 401 || /unauthorized/i.test(message)) {
      throw new Error(
        "QuickBlox provider login failed. Check QUICKBLOX_PROVIDER_EMAIL and QUICKBLOX_PROVIDER_PASSWORD on the host, then redeploy.",
      );
    }
    throw error;
  }
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

export async function claimAppointmentForSession(params: {
  appointmentId: string;
  qbProviderId: number;
  token: string;
}) {
  try {
    await reassignAppointmentToProvider({
      appointmentId: params.appointmentId,
      qbProviderId: params.qbProviderId,
    });
  } catch (error) {
    console.warn("[consultations] owner reassign failed:", error);
    await qbFetch(`/appointments/${params.appointmentId}`, {
      method: "PATCH",
      token: params.token,
      body: JSON.stringify({ provider_id: params.qbProviderId }),
    });
  }
}

export async function endQuickbloxAppointment(params: {
  appointmentId: string;
  token?: string;
  qbProviderId?: number;
}) {
  const body = JSON.stringify({ date_end: new Date().toISOString() });

  const tryEnd = async (auth: { token?: string; apiKey?: string }) => {
    await qbFetch(`/appointments/${params.appointmentId}`, {
      method: "PATCH",
      token: auth.token,
      apiKey: auth.apiKey,
      body,
    });
  };

  if (params.token && params.qbProviderId) {
    try {
      await claimAppointmentForSession({
        appointmentId: params.appointmentId,
        qbProviderId: params.qbProviderId,
        token: params.token,
      });
      await tryEnd({ token: params.token });
      return;
    } catch (error) {
      console.warn("[consultations] claim/end with session failed:", error);
    }
  } else if (params.token) {
    try {
      await tryEnd({ token: params.token });
      return;
    } catch (error) {
      console.warn("[consultations] end with session failed:", error);
    }
  }

  const { apiKey } = getQuickbloxConfig();
  if (apiKey) {
    try {
      await tryEnd({ apiKey });
      return;
    } catch (error) {
      console.warn("[consultations] end with api key failed:", error);
    }
  }

  const owner = await getOwnerProviderAuth();
  if (params.qbProviderId) {
    try {
      await reassignAppointmentToProvider({
        appointmentId: params.appointmentId,
        qbProviderId: params.qbProviderId,
      });
    } catch (error) {
      console.warn("[consultations] reassign before owner end failed:", error);
    }
  }
  await tryEnd({ token: owner.token });
}

export function isAppointmentOpen(appointment: QbAppointment) {
  return appointment.date_end == null || appointment.date_end === "";
}

async function fetchAppointmentList(path: string, auth: { token?: string; apiKey?: string }) {
  const listed = await qbFetch<{ items?: QbAppointment[] }>(path, auth);
  return listed.items ?? [];
}

export async function listProviderAppointments(token?: string) {
  const session = token ? { token } : await getOwnerProviderAuth();
  return fetchAppointmentList("/appointments/my?limit=1000&sort_desc=updated_at", {
    token: session.token,
  });
}

/** Admin-wide list. Uses the API key so reassigned visits still appear. */
export async function listAllAppointments() {
  const { apiKey } = getQuickbloxConfig();
  if (!apiKey) return [] as QbAppointment[];
  try {
    return await fetchAppointmentList("/appointments?limit=1000&sort_desc=updated_at", { apiKey });
  } catch (error) {
    console.warn("[consultations] list all appointments failed:", error);
    return [];
  }
}

export async function getAppointmentById(appointmentId: string, token?: string) {
  if (token) {
    try {
      return await qbFetch<QbAppointment>(`/appointments/${appointmentId}`, { token });
    } catch (error) {
      console.warn("[consultations] get appointment with session failed:", appointmentId, error);
    }
  }

  const { apiKey } = getQuickbloxConfig();
  if (apiKey) {
    try {
      return await qbFetch<QbAppointment>(`/appointments/${appointmentId}`, { apiKey });
    } catch (error) {
      console.warn("[consultations] get appointment with api key failed:", appointmentId, error);
    }
  }

  try {
    const owner = await getOwnerProviderAuth();
    return await qbFetch<QbAppointment>(`/appointments/${appointmentId}`, { token: owner.token });
  } catch (error) {
    console.warn("[consultations] get appointment with owner failed:", appointmentId, error);
    return null;
  }
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

/** Same HMAC identity the patient portal uses, so the patient can join this visit later. */
export async function ensurePatientQuickbloxClient(params: {
  userId: string;
  subscriptionId: string;
  fullName: string;
  dob: string;
  sex: string | null;
}): Promise<{ token: string; userId: number }> {
  const email = qbClientEmail(params.userId, params.subscriptionId);
  const password = qbPasswordForPlan(params.userId, params.subscriptionId);
  const fullName = normalizeFullName(params.fullName, "Patient");
  const gender = params.sex === "female" ? "female" : "male";

  try {
    const created = await qbFetch<{ session: QbSession; user?: QbUser; data?: QbUser }>(
      "/users/client",
      {
        method: "POST",
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          birthdate: params.dob,
          gender,
        }),
      },
    );
    const user = created.user ?? created.data;
    if (!created.session?.token || !user?.id) {
      throw new Error("QuickBlox did not return a patient session.");
    }
    return { token: created.session.token, userId: user.id };
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status !== 422 && status !== 409) throw error;
  }

  const loggedIn = await qbFetch<{ session: QbSession; data?: QbUser; user?: QbUser }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ role: "client", email, password }),
    },
  );
  const user = loggedIn.data ?? loggedIn.user;
  if (!loggedIn.session?.token || !user?.id) {
    throw new Error("QuickBlox login did not return a patient session.");
  }
  return { token: loggedIn.session.token, userId: user.id };
}

export async function createPatientAppointment(params: {
  clientId: number;
  providerId: number;
  providerToken: string;
  description: string;
}): Promise<QbAppointment> {
  return qbFetch<QbAppointment>("/appointments", {
    method: "POST",
    token: params.providerToken,
    body: JSON.stringify({
      provider_id: params.providerId,
      client_id: params.clientId,
      description: params.description.slice(0, 500),
    }),
  });
}
