import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertReviewer } from "@/lib/admin-guard";
import { isQuickbloxConfigured } from "@/lib/consultations/config";
import {
  buildProviderAppointmentUrl,
  buildProviderInboxUrl,
  claimAppointmentForSession,
  createPatientAppointment,
  ensurePatientQuickbloxClient,
  getAppointmentById,
  getOwnerProviderAuth,
  isAppointmentOpen,
  listAllAppointments,
  listProviderAppointments,
  type QbAppointment,
} from "@/lib/consultations/quickblox";
import { sessionForBodyIncProvider } from "@/lib/consultations/provider-agent";

export type ConsultationVisitStatus = "open" | "ended" | "unknown";

export type ConsultationRow = {
  id: string;
  user_id: string;
  subscription_id: string;
  qb_appointment_id: string;
  started_at: string;
  patient_name: string | null;
  patient_email: string | null;
  medicine_name: string | null;
  plan_label: string | null;
  subscription_status: string | null;
  visit_status: ConsultationVisitStatus;
};

export type ListConsultationsResult = {
  configured: boolean;
  rows: ConsultationRow[];
};

export type OpenConsultationResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

const listInput = z
  .object({
    search: z.string().trim().max(200).optional(),
    userId: z.string().uuid().optional(),
  })
  .default({});

const openInput = z.object({
  consultationId: z.string().uuid(),
});

const startFromRequestInput = z.object({
  requestId: z.string().uuid(),
});

function missingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? "";
  return error?.code === "42P01" || /patient_consultations/i.test(message);
}

function missingEndedAtColumn(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? "";
  return error?.code === "42703" || /ended_at/i.test(message);
}

function visitFromAppointment(item: QbAppointment): ConsultationVisitStatus {
  return isAppointmentOpen(item) ? "open" : "ended";
}

async function assignedPatientIds(supabaseAdmin: any, providerId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("medication_requests")
    .select("user_id")
    .eq("provider_id", providerId)
    .not("user_id", "is", null);
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((row: { user_id: string | null }) => row.user_id).filter(Boolean))];
}

async function visitStatusByAppointmentId(
  neededIds: string[],
  extraToken?: string,
) {
  const map = new Map<string, ConsultationVisitStatus>();
  const dateEnd = new Map<string, string | null>();

  const fill = (items: QbAppointment[]) => {
    for (const item of items) {
      if (!item._id) continue;
      map.set(item._id, visitFromAppointment(item));
      dateEnd.set(item._id, item.date_end ?? null);
    }
  };

  const lists = [listProviderAppointments(), listAllAppointments()];
  if (extraToken) lists.push(listProviderAppointments(extraToken));
  const results = await Promise.allSettled(lists);
  for (const result of results) {
    if (result.status !== "fulfilled") {
      console.warn("[consultations] list provider appointments failed:", result.reason);
      continue;
    }
    fill(result.value);
  }

  const missing = neededIds.filter((id) => id && !map.has(id));
  for (let i = 0; i < missing.length; i += 8) {
    const chunk = missing.slice(i, i + 8);
    const fetched = await Promise.all(
      chunk.map(async (id) => {
        const item = await getAppointmentById(id, extraToken);
        return item ? [id, item] as const : null;
      }),
    );
    for (const row of fetched) {
      if (!row) continue;
      fill([row[1]]);
    }
  }

  return { status: map, dateEnd };
}

async function persistEndedAt(
  supabaseAdmin: any,
  rows: { id: string; qb_appointment_id: string; ended_at?: string | null }[],
  visit: { status: Map<string, ConsultationVisitStatus>; dateEnd: Map<string, string | null> },
) {
  const now = new Date().toISOString();
  const updates = rows.flatMap((row) => {
    const status = visit.status.get(row.qb_appointment_id);
    if (!status) return [];
    if (status === "ended" && !row.ended_at) {
      return [{ id: row.id, ended_at: visit.dateEnd.get(row.qb_appointment_id) || now }];
    }
    if (status === "open" && row.ended_at) {
      return [{ id: row.id, ended_at: null as string | null }];
    }
    return [];
  });

  await Promise.all(
    updates.map(async (update) => {
      const { error } = await supabaseAdmin
        .from("patient_consultations")
        .update({ ended_at: update.ended_at, updated_at: now })
        .eq("id", update.id);
      if (error && !missingEndedAtColumn(error)) {
        console.warn("[consultations] persist ended_at failed:", error.message);
      }
    }),
  );
}

async function reviewerQuickbloxSession(
  role: "admin" | "provider",
  userId: string,
  supabaseAdmin: any,
) {
  if (role === "provider") return sessionForBodyIncProvider(supabaseAdmin, userId);
  return getOwnerProviderAuth();
}

export const listConsultations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<ListConsultationsResult> => {
    const role = await assertReviewer(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("patient_consultations")
      .select("id, user_id, subscription_id, qb_appointment_id, started_at, ended_at")
      .order("started_at", { ascending: false })
      .limit(300);

    if (data.userId) q = q.eq("user_id", data.userId);

    if (role === "provider") {
      const ids = await assignedPatientIds(supabaseAdmin, context.userId);
      if (ids.length === 0) return { configured: isQuickbloxConfigured(), rows: [] };
      if (data.userId && !ids.includes(data.userId)) {
        return { configured: isQuickbloxConfigured(), rows: [] };
      }
      q = q.in("user_id", ids);
    }

    let { data: rows, error } = await q;
    if (error && missingEndedAtColumn(error)) {
      const fallback = supabaseAdmin
        .from("patient_consultations")
        .select("id, user_id, subscription_id, qb_appointment_id, started_at")
        .order("started_at", { ascending: false })
        .limit(300);
      const retried = data.userId ? fallback.eq("user_id", data.userId) : fallback;
      const scoped =
        role === "provider"
          ? retried.in("user_id", await assignedPatientIds(supabaseAdmin, context.userId))
          : retried;
      ({ data: rows, error } = await scoped);
    }
    if (error) {
      if (missingTable(error)) return { configured: isQuickbloxConfigured(), rows: [] };
      throw new Error(error.message);
    }

    const consultations = (rows ?? []).map((row) => ({
      ...row,
      ended_at: "ended_at" in row ? ((row as { ended_at?: string | null }).ended_at ?? null) : null,
    }));
    if (consultations.length === 0) {
      return { configured: isQuickbloxConfigured(), rows: [] };
    }

    const userIds = [...new Set(consultations.map((row) => row.user_id))];
    const subIds = [...new Set(consultations.map((row) => row.subscription_id))];

    let extraToken: string | undefined;
    if (role === "provider") {
      const { data: me, error: meErr } = await supabaseAdmin
        .from("providers")
        .select("qb_user_id")
        .eq("id", context.userId)
        .maybeSingle();
      if (!meErr && me?.qb_user_id) {
        try {
          extraToken = (await sessionForBodyIncProvider(supabaseAdmin, context.userId)).token;
        } catch (error) {
          console.warn("[consultations] provider QuickBlox session failed:", error);
        }
      }
    }

    const [{ data: profiles }, { data: subs }, visit] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds),
      supabaseAdmin
        .from("subscriptions")
        .select("id, status, medicine_id, package_id")
        .in("id", subIds),
      visitStatusByAppointmentId(
        consultations.map((row) => row.qb_appointment_id),
        extraToken,
      ),
    ]);

    void persistEndedAt(supabaseAdmin, consultations, visit);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const subMap = new Map((subs ?? []).map((s: any) => [s.id, s]));
    const medIds = [
      ...new Set(
        (subs ?? []).map((s: any) => s.medicine_id).filter((id: string | null) => Boolean(id)),
      ),
    ];
    const pkgIds = [
      ...new Set(
        (subs ?? []).map((s: any) => s.package_id).filter((id: string | null) => Boolean(id)),
      ),
    ];

    const [{ data: meds }, { data: pkgs }] = await Promise.all([
      medIds.length
        ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
        : Promise.resolve({ data: [] as any[] }),
      pkgIds.length
        ? supabaseAdmin.from("packages").select("id, name").in("id", pkgIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const medMap = new Map((meds ?? []).map((m: any) => [m.id, m.name as string]));
    const pkgMap = new Map((pkgs ?? []).map((p: any) => [p.id, p.name as string]));

    const search = data.search?.trim().toLowerCase();
    const mapped: ConsultationRow[] = consultations.map((row) => {
      const profile = profileMap.get(row.user_id);
      const sub = subMap.get(row.subscription_id);
      return {
        id: row.id,
        user_id: row.user_id,
        subscription_id: row.subscription_id,
        qb_appointment_id: row.qb_appointment_id,
        started_at: row.started_at,
        patient_name: profile?.full_name ?? null,
        patient_email: role === "admin" ? (profile?.email ?? null) : null,
        medicine_name: sub?.medicine_id ? (medMap.get(sub.medicine_id) ?? null) : null,
        plan_label: sub?.package_id ? (pkgMap.get(sub.package_id) ?? null) : null,
        subscription_status: sub?.status ?? null,
        visit_status:
          visit.status.get(row.qb_appointment_id) ??
          (row.ended_at ? "ended" : "unknown"),
      };
    });

    const filtered = search
      ? mapped.filter((row) => {
          const haystack = [
            row.patient_name,
            row.patient_email,
            row.medicine_name,
            row.plan_label,
            row.user_id,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(search);
        })
      : mapped;

    return { configured: isQuickbloxConfigured(), rows: filtered };
  });

export const openConsultation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => openInput.parse(input))
  .handler(async ({ data, context }): Promise<OpenConsultationResult> => {
    const role = await assertReviewer(context);
    if (!isQuickbloxConfigured()) {
      return { ok: false, message: "Consultations are not available yet." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("patient_consultations")
      .select("id, user_id, qb_appointment_id")
      .eq("id", data.consultationId)
      .maybeSingle();

    if (error) {
      if (missingTable(error)) return { ok: false, message: "Consultations are not available yet." };
      return { ok: false, message: error.message };
    }
    if (!row?.qb_appointment_id) return { ok: false, message: "Consultation not found." };

    if (role === "provider") {
      const ids = await assignedPatientIds(supabaseAdmin, context.userId);
      if (!ids.includes(row.user_id)) return { ok: false, message: "Forbidden" };
    }

    try {
      const session = await reviewerQuickbloxSession(role, context.userId, supabaseAdmin);
      try {
        await claimAppointmentForSession({
          appointmentId: row.qb_appointment_id,
          qbProviderId: session.userId,
          token: session.token,
        });
      } catch (error) {
        console.warn("[consultations] reassign failed:", error);
      }
      return {
        ok: true,
        url: buildProviderAppointmentUrl({
          token: session.token,
          appointmentId: row.qb_appointment_id,
        }),
      };
    } catch (error) {
      console.error("[consultations] open failed:", error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to open this consultation.",
      };
    }
  });

export const startRequestConsultation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startFromRequestInput.parse(input))
  .handler(async ({ data, context }): Promise<OpenConsultationResult> => {
    const role = await assertReviewer(context);
    if (!isQuickbloxConfigured()) {
      return { ok: false, message: "Consultations are not available yet." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req, error } = await supabaseAdmin
      .from("medication_requests")
      .select("id, user_id, provider_id, subscription_id, medicine_id, status, session_id")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) return { ok: false, message: error.message };
    if (!req) return { ok: false, message: "Request not found." };
    if (role === "provider" && req.provider_id !== context.userId) {
      return { ok: false, message: "Forbidden" };
    }
    if (!req.user_id) {
      return {
        ok: false,
        message: "This patient does not have an account yet, so a consultation cannot start.",
      };
    }
    if (!req.subscription_id) {
      return { ok: false, message: "This order is missing a subscription." };
    }

    const { data: existing } = await supabaseAdmin
      .from("patient_consultations")
      .select("id, qb_appointment_id")
      .eq("subscription_id", req.subscription_id)
      .eq("user_id", req.user_id)
      .maybeSingle();

    try {
      const session = await reviewerQuickbloxSession(role, context.userId, supabaseAdmin);

      if (existing?.qb_appointment_id) {
        try {
          await claimAppointmentForSession({
            appointmentId: existing.qb_appointment_id,
            qbProviderId: session.userId,
            token: session.token,
          });
        } catch (error) {
          console.warn("[consultations] reassign failed:", error);
        }
        return {
          ok: true,
          url: buildProviderAppointmentUrl({
            token: session.token,
            appointmentId: existing.qb_appointment_id,
          }),
        };
      }

      const [{ data: profile }, { data: intake }, { data: medicine }] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("full_name, dob, sex")
          .eq("id", req.user_id)
          .maybeSingle(),
        req.session_id
          ? supabaseAdmin
              .from("intake_sessions")
              .select("full_name, dob, sex")
              .eq("id", req.session_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        req.medicine_id
          ? supabaseAdmin.from("medicines").select("name").eq("id", req.medicine_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const dobRaw = profile?.dob ?? intake?.dob ?? null;
      const dob = dobRaw ? String(dobRaw).slice(0, 10) : null;
      if (!dob) {
        return {
          ok: false,
          message: "Patient date of birth is required before starting a consultation.",
        };
      }

      const fullName = profile?.full_name?.trim() || intake?.full_name?.trim() || "Patient";
      const medicineName = medicine?.name?.trim() || "treatment";
      const client = await ensurePatientQuickbloxClient({
        userId: req.user_id,
        subscriptionId: req.subscription_id,
        fullName,
        dob,
        sex: profile?.sex ?? intake?.sex ?? null,
      });

      const appointment = await createPatientAppointment({
        clientId: client.userId,
        providerId: session.userId,
        providerToken: session.token,
        description: `${medicineName} consultation`,
      });

      const { error: insertError } = await supabaseAdmin.from("patient_consultations").insert({
        user_id: req.user_id,
        subscription_id: req.subscription_id,
        qb_user_id: client.userId,
        qb_appointment_id: appointment._id,
        qb_dialog_id: appointment.dialog_id ?? null,
      });
      if (insertError && insertError.code !== "23505") {
        return { ok: false, message: insertError.message };
      }

      await supabaseAdmin.from("medication_request_events").insert({
        request_id: req.id,
        status: req.status,
        actor_role: role,
        created_by: context.userId,
        note: "Consultation started",
      });

      try {
        const { notifyUserById } = await import("@/lib/email.notifications");
        const portal = process.env.PATIENT_PORTAL_URL?.replace(/\/$/, "") ?? "";
        await notifyUserById({
          supabaseAdmin,
          userId: req.user_id,
          template: "patient_consultation_started",
          params: {
            MEDICINE_NAME: medicineName,
            PORTAL_URL: portal ? `${portal}/consultations` : "",
          },
        });
      } catch (error) {
        console.warn("[consultations] patient start email failed:", error);
      }

      return {
        ok: true,
        url: buildProviderAppointmentUrl({
          token: session.token,
          appointmentId: appointment._id,
        }),
      };
    } catch (error) {
      console.error("[consultations] start from request failed:", error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to start this consultation.",
      };
    }
  });

export const openProviderInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OpenConsultationResult> => {
    const role = await assertReviewer(context);
    if (!isQuickbloxConfigured()) {
      return { ok: false, message: "Consultations are not available yet." };
    }
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const session = await reviewerQuickbloxSession(role, context.userId, supabaseAdmin);
      return { ok: true, url: buildProviderInboxUrl(session.token) };
    } catch (error) {
      console.error("[consultations] inbox open failed:", error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to open QuickBlox.",
      };
    }
  });
