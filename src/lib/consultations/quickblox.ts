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
  created_at?: number;
  updated_at?: number;
  priority?: number;
};

export type QuickbloxProviderSession = {
  token: string;
  userId: number;
};

let ownerSessionCache: QuickbloxProviderSession & { expiresAt: number } | null = null;
const agentSessionCache = new Map<string, QuickbloxProviderSession & { expiresAt: number }>();

export function qbPasswordForProvider(userId: string) {
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
    try {
      const { token, user } = await loginProvider(cfg.providerEmail, cfg.providerPassword);
      ownerSessionCache = {
        token,
        userId: cfg.providerId ?? user.id,
        expiresAt: now + 90 * 60 * 1000,
      };
      return ownerSessionCache;
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      const message = error instanceof Error ? error.message : "";
      if (status === 401 || /unauthorized/i.test(message)) {
        throw new Error(
          "QuickBlox clinic provider login failed. Check QUICKBLOX_PROVIDER_EMAIL and QUICKBLOX_PROVIDER_PASSWORD on the host, then redeploy.",
        );
      }
      throw error;
    }
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
  const cfg = getQuickbloxConfig();

  // If this email is the clinic owner/admin email, use the owner credentials directly
  if (cfg.providerEmail && email === cfg.providerEmail.trim().toLowerCase()) {
    return getOwnerProviderAuth();
  }

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
  const cfg = getQuickbloxConfig();

  // 1. If this is the clinic owner account, return the owner session
  if (cfg.providerEmail && email === cfg.providerEmail.trim().toLowerCase()) {
    const owner = await getOwnerProviderAuth();
    return { userId: owner.userId, created: false };
  }

  // 2. If already cached in memory, return immediately
  const cached = agentSessionCache.get(email);
  if (cached && cached.token && cached.expiresAt > Date.now()) {
    return { userId: cached.userId, created: false };
  }

  // 3. Try logging in first for existing provider accounts (avoids redundant 422 user creation calls)
  try {
    const existing = await loginQuickbloxProviderAgent({ email, userId: params.userId });
    return { userId: existing.userId, created: false };
  } catch (loginError) {
    const status = (loginError as Error & { status?: number }).status;
    const message = loginError instanceof Error ? loginError.message : "";

    // If rate-limited or blocked by login policy, do not try to re-register or claim wrong password
    if (status === 403 || /blocked due to login policy/i.test(message)) {
      throw new Error(
        `QuickBlox user is temporarily rate-limited: ${message || "Please wait a few minutes before trying again."}`,
      );
    }

    // If login failed with something other than 401 unauthorized, rethrow
    if (status !== 401 && !/unauthorized/i.test(message)) {
      throw loginError;
    }
  }

  // 4. User does not exist or unauthorized, attempt creation
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
    // 422 or 409 means user already exists in QuickBlox, but login failed earlier with 401
    if (status === 422 || status === 409) {
      throw new Error(
        "This email already has a QuickBlox account with a different password. Use another email, or ask IT to reset that QuickBlox user.",
      );
    }
    throw error;
  }
}

export async function addProviderToDialogOccupants(params: {
  dialogId: string;
  qbProviderId: number;
}): Promise<boolean> {
  if (!params.dialogId || !params.qbProviderId) return false;
  try {
    const owner = await getOwnerProviderAuth();
    const res = await fetch(`https://api.quickblox.com/chat/Dialog/${params.dialogId}.json`, {
      method: "PUT",
      headers: {
        "QB-Token": owner.token,
        "Content-Type": "application/json",
        "QuickBlox-REST-API-Version": "0.1.1",
      },
      body: JSON.stringify({
        push_all: {
          occupants_ids: [params.qbProviderId],
        },
      }),
    });

    if (res.ok) return true;
    const text = await res.text();
    // QuickBlox returns 400 with "Users are already present in occupants_ids" if already added
    if (/already present/i.test(text)) return true;
    console.warn("[consultations] addProviderToDialogOccupants failed:", res.status, text);
    return false;
  } catch (error) {
    console.warn("[consultations] addProviderToDialogOccupants exception:", error);
    return false;
  }
}

export async function reassignAppointmentToProvider(params: {
  appointmentId: string;
  qbProviderId: number;
  currentProviderToken?: string;
  dialogId?: string | null;
}): Promise<{ dialogId: string | null }> {
  let dialogId = params.dialogId ?? null;

  // If current provider token is provided, try that first (as QuickBlox requires the current assignee's token)
  if (params.currentProviderToken) {
    try {
      const updated = await qbFetch<QbAppointment>(`/appointments/${params.appointmentId}`, {
        method: "PATCH",
        token: params.currentProviderToken,
        body: JSON.stringify({ provider_id: params.qbProviderId }),
      });
      if (updated?.dialog_id) dialogId = updated.dialog_id;
    } catch (tokenErr) {
      console.warn("[consultations] reassign with currentProviderToken failed:", tokenErr);
    }
  }

  // Next try owner
  try {
    const owner = await getOwnerProviderAuth();
    const updated = await qbFetch<QbAppointment>(`/appointments/${params.appointmentId}`, {
      method: "PATCH",
      token: owner.token,
      body: JSON.stringify({ provider_id: params.qbProviderId }),
    });
    if (updated?.dialog_id) dialogId = updated.dialog_id;
  } catch (ownerErr) {
    console.warn("[consultations] owner reassign failed:", ownerErr);
  }

  // Ensure the provider is added to the dialog occupants
  if (!dialogId) {
    try {
      const appt = await getAppointmentById(params.appointmentId);
      if (appt?.dialog_id) dialogId = appt.dialog_id;
    } catch {}
  }

  if (dialogId && params.qbProviderId) {
    void addProviderToDialogOccupants({
      dialogId,
      qbProviderId: params.qbProviderId,
    }).catch(() => {});
  }

  return { dialogId };
}

export async function claimAppointmentForSession(params: {
  appointmentId: string;
  qbProviderId: number;
  token: string;
  dialogId?: string | null;
}): Promise<{ dialogId: string | null }> {
  let dialogId = params.dialogId ?? null;
  try {
    const reassigned = await reassignAppointmentToProvider({
      appointmentId: params.appointmentId,
      qbProviderId: params.qbProviderId,
      currentProviderToken: params.token,
      dialogId: params.dialogId,
    });
    if (reassigned.dialogId) dialogId = reassigned.dialogId;
  } catch (error) {
    console.warn("[consultations] claimAppointmentForSession owner reassign failed:", error);
    try {
      const patched = await qbFetch<QbAppointment>(`/appointments/${params.appointmentId}`, {
        method: "PATCH",
        token: params.token,
        body: JSON.stringify({ provider_id: params.qbProviderId }),
      });
      if (patched?.dialog_id) dialogId = patched.dialog_id;
    } catch (fallbackErr) {
      console.warn("[consultations] claim fallback patch failed:", fallbackErr);
    }
  }

  if (!dialogId) {
    try {
      const appt = await getAppointmentById(params.appointmentId);
      if (appt?.dialog_id) dialogId = appt.dialog_id;
    } catch {}
  }

  if (dialogId && params.qbProviderId) {
    void addProviderToDialogOccupants({
      dialogId,
      qbProviderId: params.qbProviderId,
    }).catch(() => {});
  }

  return { dialogId };
}

export async function endQuickbloxAppointment(params: {
  appointmentId: string;
  token?: string;
  qbProviderId?: number;
  conclusion?: string;
  language?: string;
}) {
  const conclusion = params.conclusion?.trim() || "Consultation completed";
  const language = params.language || "en";
  const body = JSON.stringify({
    date_end: new Date().toISOString(),
    language,
    conclusion,
  });

  const tryEnd = async (auth: { token?: string; apiKey?: string }) => {
    try {
      return await qbFetch(`/appointments/${params.appointmentId}`, {
        method: "PATCH",
        token: auth.token,
        apiKey: auth.apiKey,
        body,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // If already ended or auth fail because it is completed, consider it done
      if (/already/i.test(msg) || /auth fail/i.test(msg) || /not found/i.test(msg)) {
        return null;
      }
      throw err;
    }
  };

  // 1. Try with session token if provided
  if (params.token) {
    try {
      await tryEnd({ token: params.token });
      return;
    } catch (error) {
      console.warn("[consultations] end with session token failed:", error);
    }
  }

  // 2. Try with owner session
  try {
    const owner = await getOwnerProviderAuth();
    if (owner.token) {
      try {
        await tryEnd({ token: owner.token });
        return;
      } catch (ownerEndErr) {
        // If owner gets 403, try reassigning to owner first then patching date_end
        try {
          await qbFetch(`/appointments/${params.appointmentId}`, {
            method: "PATCH",
            token: owner.token,
            body: JSON.stringify({ provider_id: owner.userId }),
          });
          await tryEnd({ token: owner.token });
          return;
        } catch (reassignEndErr) {
          console.warn("[consultations] owner reassign and end failed:", reassignEndErr);
        }
      }
    }
  } catch (ownerAuthErr) {
    console.warn("[consultations] end with owner token failed:", ownerAuthErr);
  }

  // 3. Try with API key if configured
  const { apiKey } = getQuickbloxConfig();
  if (apiKey) {
    try {
      await tryEnd({ apiKey });
      return;
    } catch (error) {
      console.warn("[consultations] end with api key failed:", error);
    }
  }
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
      const status = (error as Error & { status?: number }).status;
      if (status !== 403 && status !== 404) {
        console.warn("[consultations] get appointment with session failed:", appointmentId, error);
      }
    }
  }

  const { apiKey } = getQuickbloxConfig();
  if (apiKey) {
    try {
      return await qbFetch<QbAppointment>(`/appointments/${appointmentId}`, { apiKey });
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      if (status !== 403 && status !== 404) {
        console.warn("[consultations] get appointment with api key failed:", appointmentId, error);
      }
    }
  }

  try {
    const owner = await getOwnerProviderAuth();
    return await qbFetch<QbAppointment>(`/appointments/${appointmentId}`, { token: owner.token });
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status !== 403 && status !== 404) {
      console.warn("[consultations] get appointment with owner failed:", appointmentId, error);
    }
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
  const appt = await qbFetch<QbAppointment>("/appointments", {
    method: "POST",
    token: params.providerToken,
    body: JSON.stringify({
      provider_id: params.providerId,
      client_id: params.clientId,
      description: params.description.slice(0, 500),
    }),
  });

  if (appt?.dialog_id && params.providerId) {
    void addProviderToDialogOccupants({
      dialogId: appt.dialog_id,
      qbProviderId: params.providerId,
    }).catch(() => {});
  }

  return appt;
}
