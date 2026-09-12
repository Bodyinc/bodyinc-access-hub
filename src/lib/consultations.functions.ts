import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertReviewer } from "@/lib/admin-guard";
import { isQuickbloxConfigured } from "@/lib/consultations/config";
import {
  buildProviderAppointmentUrl,
  buildProviderInboxUrl,
  getProviderAuth,
  isAppointmentOpen,
  listProviderAppointments,
} from "@/lib/consultations/quickblox";

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

function missingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? "";
  return error?.code === "42P01" || /patient_consultations/i.test(message);
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

async function visitStatusByAppointmentId(): Promise<Map<string, ConsultationVisitStatus>> {
  const map = new Map<string, ConsultationVisitStatus>();
  try {
    const items = await listProviderAppointments();
    for (const item of items) {
      if (!item._id) continue;
      map.set(item._id, isAppointmentOpen(item) ? "open" : "ended");
    }
  } catch (error) {
    console.warn("[consultations] list provider appointments failed:", error);
  }
  return map;
}

export const listConsultations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<ListConsultationsResult> => {
    const role = await assertReviewer(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("patient_consultations")
      .select("id, user_id, subscription_id, qb_appointment_id, started_at")
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

    const { data: rows, error } = await q;
    if (error) {
      if (missingTable(error)) return { configured: isQuickbloxConfigured(), rows: [] };
      throw new Error(error.message);
    }

    const consultations = rows ?? [];
    if (consultations.length === 0) {
      return { configured: isQuickbloxConfigured(), rows: [] };
    }

    const userIds = [...new Set(consultations.map((row) => row.user_id))];
    const subIds = [...new Set(consultations.map((row) => row.subscription_id))];

    const [{ data: profiles }, { data: subs }, visitStatus] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds),
      supabaseAdmin
        .from("subscriptions")
        .select("id, status, medicine_id, package_id")
        .in("id", subIds),
      visitStatusByAppointmentId(),
    ]);

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
        visit_status: visitStatus.get(row.qb_appointment_id) ?? "unknown",
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
      const session = await getProviderAuth();
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

export const openProviderInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OpenConsultationResult> => {
    await assertReviewer(context);
    if (!isQuickbloxConfigured()) {
      return { ok: false, message: "Consultations are not available yet." };
    }
    try {
      const session = await getProviderAuth();
      return { ok: true, url: buildProviderInboxUrl(session.token) };
    } catch (error) {
      console.error("[consultations] inbox open failed:", error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to open QuickBlox.",
      };
    }
  });
