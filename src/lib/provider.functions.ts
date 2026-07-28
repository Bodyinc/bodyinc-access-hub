import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertProvider } from "@/lib/provider-guard";

type Ctx = { supabase: any; userId: string };

// Clinical-only patient projections. Contact details (email, phone), addresses, Stripe ids and
// any money figures are deliberately never selected on the practitioner side.
const PROFILE_CLINICAL_COLS = "id, full_name, dob, sex, state_code";
const SESSION_CLINICAL_COLS =
  "id, full_name, dob, sex, state_code, height_cm, weight_kg, created_at";

const OPEN_STATUSES = [
  "payment_completed",
  "provider_assigned",
  "pending_review",
  "awaiting_additional_payment",
  "approved",
  "prescribed",
  "sent_to_pharmacy",
  "dispatched",
];

function bmiOf(height_cm: unknown, weight_kg: unknown): number | null {
  const h = Number(height_cm ?? 0);
  const w = Number(weight_kg ?? 0);
  if (!h || !w) return null;
  return Number((w / ((h / 100) * (h / 100))).toFixed(1));
}

function ageOf(dob: unknown): number | null {
  if (!dob) return null;
  const d = new Date(String(dob));
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

// Patient keys are "u_<user id>" for account holders and "s_<intake session id>" for guests.
function parsePatientKey(key: string): { kind: "user" | "session"; id: string } {
  const kind = key.startsWith("s_") ? "session" : "user";
  return { kind, id: key.slice(2) };
}
export function patientKey(kind: "user" | "session", id: string): string {
  return `${kind === "session" ? "s" : "u"}_${id}`;
}

export const providerDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertProvider(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = context.userId;

    const { data: rows } = await supabaseAdmin
      .from("medication_requests")
      .select("id, status, created_at, updated_at")
      .eq("provider_id", me)
      .limit(1000);

    const list = (rows ?? []) as any[];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const counts = {
      pending_review: list.filter((r) => r.status === "pending_review").length,
      awaiting_additional_payment: list.filter((r) => r.status === "awaiting_additional_payment")
        .length,
      approved: list.filter((r) => r.status === "approved").length,
      prescribed_today: list.filter(
        (r) => r.status === "prescribed" && new Date(r.updated_at) >= startOfDay,
      ).length,
      open: list.filter((r) => OPEN_STATUSES.includes(r.status)).length,
    };

    const claimable = await countClaimable(supabaseAdmin, me);
    return { ...counts, claimable };
  });

async function providerStates(supabaseAdmin: any, me: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("providers")
    .select("license_states")
    .eq("id", me)
    .maybeSingle();
  return ((data?.license_states ?? []) as string[]).map((s) => String(s).toUpperCase());
}

// Unassigned open orders whose patient state is covered by this provider's licences.
async function loadClaimable(supabaseAdmin: any, me: string): Promise<any[]> {
  const states = await providerStates(supabaseAdmin, me);
  if (states.length === 0) return [];

  const { data: rows } = await supabaseAdmin
    .from("medication_requests")
    .select("id, user_id, session_id, medicine_id, kind, status, requires_consultation, created_at")
    .is("provider_id", null)
    .in("status", OPEN_STATUSES)
    .order("created_at", { ascending: false })
    .limit(300);

  const list = (rows ?? []) as any[];
  if (list.length === 0) return [];

  const userIds = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
  const sessionIds = Array.from(new Set(list.map((r) => r.session_id).filter(Boolean)));
  const medIds = Array.from(new Set(list.map((r) => r.medicine_id).filter(Boolean)));

  const [{ data: profiles }, { data: sessions }, { data: meds }] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from("profiles").select("id, full_name, state_code").in("id", userIds)
      : Promise.resolve({ data: [] as any[] }),
    sessionIds.length
      ? supabaseAdmin.from("intake_sessions").select("id, full_name, state_code").in("id", sessionIds)
      : Promise.resolve({ data: [] as any[] }),
    medIds.length
      ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const sMap = new Map((sessions ?? []).map((s: any) => [s.id, s]));
  const medMap = new Map((meds ?? []).map((m: any) => [m.id, m.name]));

  return list
    .map((r) => {
      const p: any = pMap.get(r.user_id);
      const sess: any = !p ? sMap.get(r.session_id) : null;
      const state = (p?.state_code ?? sess?.state_code ?? null) as string | null;
      return {
        id: r.id,
        patient_name: p?.full_name ?? sess?.full_name ?? "Patient",
        state_code: state,
        medicine_name: medMap.get(r.medicine_id) ?? "—",
        kind: r.kind,
        status: r.status,
        requires_consultation: r.requires_consultation,
        created_at: r.created_at,
      };
    })
    .filter((r) => !!r.state_code && states.includes(String(r.state_code).toUpperCase()));
}

async function countClaimable(supabaseAdmin: any, me: string): Promise<number> {
  return (await loadClaimable(supabaseAdmin, me)).length;
}

export const listClaimableRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ search: z.string().trim().max(200).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertProvider(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let rows = await loadClaimable(supabaseAdmin, context.userId);
    if (data.search) {
      const s = data.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.patient_name.toLowerCase().includes(s) ||
          String(r.medicine_name).toLowerCase().includes(s) ||
          r.id.toLowerCase().includes(s),
      );
    }
    return rows;
  });

// Claim a single unassigned order for myself. Racy claims lose: the update is conditional on the
// order still having no provider.
export const claimRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ requestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertProvider(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = context.userId;

    const claimable = await loadClaimable(supabaseAdmin, me);
    if (!claimable.some((r) => r.id === data.requestId)) {
      throw new Error("This order is no longer available to claim, or is outside your licensed states.");
    }

    const { data: updated, error } = await supabaseAdmin
      .from("medication_requests")
      .update({ provider_id: me, updated_at: new Date().toISOString() })
      .eq("id", data.requestId)
      .is("provider_id", null)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Another practitioner just claimed this order.");

    await supabaseAdmin.from("medication_request_events").insert({
      request_id: data.requestId,
      status: "provider_assigned",
      actor_role: "provider",
      created_by: me,
      note: "Claimed by practitioner",
    });
    return { ok: true };
  });

export const listMyPatients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ search: z.string().trim().max(200).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertProvider(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows } = await supabaseAdmin
      .from("medication_requests")
      .select("id, user_id, session_id, medicine_id, status, created_at")
      .eq("provider_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(500);

    const list = (rows ?? []) as any[];
    const userIds = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
    const sessionIds = Array.from(
      new Set(list.filter((r) => !r.user_id).map((r) => r.session_id).filter(Boolean)),
    );
    const medIds = Array.from(new Set(list.map((r) => r.medicine_id).filter(Boolean)));

    const [{ data: profiles }, { data: sessions }, { data: meds }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select(PROFILE_CLINICAL_COLS).in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      sessionIds.length
        ? supabaseAdmin.from("intake_sessions").select(SESSION_CLINICAL_COLS).in("id", sessionIds)
        : Promise.resolve({ data: [] as any[] }),
      medIds.length
        ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const sMap = new Map((sessions ?? []).map((s: any) => [s.id, s]));
    const medMap = new Map((meds ?? []).map((m: any) => [m.id, m.name]));

    const byKey = new Map<string, any>();
    for (const r of list) {
      const p: any = pMap.get(r.user_id);
      const sess: any = !p ? sMap.get(r.session_id) : null;
      const src = p ?? sess;
      if (!src) continue;
      const key = patientKey(p ? "user" : "session", src.id);
      const existing = byKey.get(key);
      if (existing) {
        existing.order_count += 1;
        continue;
      }
      byKey.set(key, {
        key,
        name: src.full_name ?? "Patient",
        is_guest: !p,
        sex: src.sex ?? null,
        age: ageOf(src.dob),
        state_code: src.state_code ?? null,
        latest_medicine: medMap.get(r.medicine_id) ?? "—",
        latest_status: r.status,
        last_order_at: r.created_at,
        order_count: 1,
      });
    }

    let result = Array.from(byKey.values());
    if (data.search) {
      const s = data.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          String(p.latest_medicine).toLowerCase().includes(s) ||
          String(p.state_code ?? "").toLowerCase().includes(s) ||
          p.key.toLowerCase().includes(s),
      );
    }
    return result;
  });

export const getMyPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ key: z.string().trim().min(3).max(80) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertProvider(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = context.userId;
    const { kind, id } = parsePatientKey(data.key);

    // Access control: the practitioner must own at least one order for this patient.
    const scopeCol = kind === "user" ? "user_id" : "session_id";
    const { data: myOrders } = await supabaseAdmin
      .from("medication_requests")
      .select("id, medicine_id, package_id, kind, status, requires_consultation, created_at, session_id, user_id")
      .eq("provider_id", me)
      .eq(scopeCol, id)
      .order("created_at", { ascending: false })
      .limit(100);
    const orders = (myOrders ?? []) as any[];
    if (orders.length === 0) throw new Error("Patient not found.");

    const src =
      kind === "user"
        ? (
            await supabaseAdmin
              .from("profiles")
              .select(PROFILE_CLINICAL_COLS)
              .eq("id", id)
              .maybeSingle()
          ).data
        : (
            await supabaseAdmin
              .from("intake_sessions")
              .select(SESSION_CLINICAL_COLS)
              .eq("id", id)
              .maybeSingle()
          ).data;
    if (!src) throw new Error("Patient not found.");

    // Clinical intake: for account holders find the session they claimed; guests already are one.
    let session: any = kind === "session" ? src : null;
    if (!session) {
      session = (
        await supabaseAdmin
          .from("intake_sessions")
          .select(SESSION_CLINICAL_COLS)
          .eq("claimed_by_user_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;
    }
    if (!session) {
      const sessionIdFromOrder = orders.find((o) => o.session_id)?.session_id;
      if (sessionIdFromOrder) {
        session = (
          await supabaseAdmin
            .from("intake_sessions")
            .select(SESSION_CLINICAL_COLS)
            .eq("id", sessionIdFromOrder)
            .maybeSingle()
        ).data;
      }
    }

    let goals: string[] = [];
    let eligibility: any[] = [];
    let answers: any[] = [];
    if (session) {
      const [{ data: cats }, { data: elig }, { data: resp }] = await Promise.all([
        supabaseAdmin
          .from("intake_session_categories")
          .select("medication_categories(name)")
          .eq("session_id", session.id),
        supabaseAdmin
          .from("intake_session_eligibility_results")
          .select("result, reason, evaluated_at, medicines(name)")
          .eq("session_id", session.id)
          .order("evaluated_at", { ascending: false }),
        supabaseAdmin
          .from("intake_session_questionnaire_responses")
          .select(
            "id, answer_text, answer_number, answer_boolean, answer_option_ids, created_at, questionnaire_questions(prompt, question_type)",
          )
          .eq("session_id", session.id)
          .order("created_at", { ascending: true }),
      ]);
      goals = ((cats ?? []) as any[])
        .map((c) => c.medication_categories?.name)
        .filter(Boolean) as string[];
      eligibility = ((elig ?? []) as any[]).map((e) => ({
        medicine_name: e.medicines?.name ?? "—",
        result: e.result,
        reason: e.reason,
        evaluated_at: e.evaluated_at,
      }));

      const optionIds = Array.from(
        new Set(((resp ?? []) as any[]).flatMap((r) => r.answer_option_ids ?? [])),
      );
      const { data: opts } = optionIds.length
        ? await supabaseAdmin
            .from("questionnaire_question_options")
            .select("id, label")
            .in("id", optionIds)
        : { data: [] as any[] };
      const optMap = new Map((opts ?? []).map((o: any) => [o.id, o.label]));

      answers = ((resp ?? []) as any[]).map((r) => {
        const chosen = (r.answer_option_ids ?? [])
          .map((oid: string) => optMap.get(oid))
          .filter(Boolean);
        const value =
          chosen.length > 0
            ? chosen.join(", ")
            : r.answer_text ??
              (r.answer_number != null ? String(r.answer_number) : null) ??
              (r.answer_boolean != null ? (r.answer_boolean ? "Yes" : "No") : null);
        return {
          id: r.id,
          prompt: r.questionnaire_questions?.prompt ?? "Question",
          answer: value ?? "—",
        };
      });
    }

    const medIds = Array.from(new Set(orders.map((o) => o.medicine_id).filter(Boolean)));
    const pkgIds = Array.from(new Set(orders.map((o) => o.package_id).filter(Boolean)));
    const [{ data: meds }, { data: pkgs }, { data: rxs }] = await Promise.all([
      medIds.length
        ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
        : Promise.resolve({ data: [] as any[] }),
      pkgIds.length
        ? supabaseAdmin.from("packages").select("id, name, duration_months").in("id", pkgIds)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin
        .from("prescriptions")
        .select("id, medicine_name, directions, status, created_at")
        .in(
          "request_id",
          orders.map((o) => o.id),
        )
        .order("created_at", { ascending: false }),
    ]);
    const medMap = new Map((meds ?? []).map((m: any) => [m.id, m.name]));
    const pkgMap = new Map((pkgs ?? []).map((p: any) => [p.id, p]));

    return {
      key: data.key,
      patient: {
        name: src.full_name ?? "Patient",
        is_guest: kind === "session",
        sex: src.sex ?? null,
        age: ageOf(src.dob),
        state_code: src.state_code ?? null,
        height_cm: session?.height_cm ?? null,
        weight_kg: session?.weight_kg ?? null,
        bmi: bmiOf(session?.height_cm, session?.weight_kg),
      },
      goals,
      eligibility,
      answers,
      orders: orders.map((o) => ({
        id: o.id,
        medicine_name: medMap.get(o.medicine_id) ?? "—",
        plan_name: (pkgMap.get(o.package_id) as any)?.name ?? null,
        kind: o.kind,
        status: o.status,
        created_at: o.created_at,
      })),
      prescriptions: rxs ?? [],
    };
  });

export const getMyProviderProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertProvider(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = context.userId;

    const [{ data: prov }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("providers").select("*").eq("id", me).maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", me)
        .maybeSingle(),
    ]);
    if (!prov) throw new Error("Practitioner record not found.");

    return {
      full_name: (profile as any)?.full_name ?? "",
      email: (profile as any)?.email ?? "",
      avatar_url: (profile as any)?.avatar_url ?? null,
      bio: prov.bio ?? "",
      credentials: prov.credentials ?? "",
      specialty: prov.specialty ?? "",
      languages: (prov.languages ?? []) as string[],
      consultation_types: (prov.consultation_types ?? []) as string[],
      years_experience: prov.years_experience ?? null,
      license_states: (prov.license_states ?? []) as string[],
      // Read-only, admin-controlled:
      license_number: prov.license_number ?? null,
      npi: prov.npi ?? null,
      dea: prov.dea ?? null,
      is_active: prov.is_active,
    };
  });

const profileInput = z.object({
  full_name: z.string().trim().min(2).max(120),
  avatar_url: z.string().trim().url().max(500).nullable().optional(),
  bio: z.string().trim().max(2000).optional(),
  credentials: z.string().trim().max(200).optional(),
  specialty: z.string().trim().max(200).optional(),
  years_experience: z.number().int().min(0).max(80).nullable().optional(),
  languages: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  consultation_types: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  license_states: z
    .array(z.string().trim().length(2).regex(/^[A-Za-z]{2}$/))
    .max(60)
    .optional(),
});

// A practitioner may edit their presentation fields plus their licensed states. NPI, DEA, licence
// number and active status stay admin-controlled and are never read from this input.
export const updateMyProviderProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertProvider(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = context.userId;

    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.full_name, avatar_url: data.avatar_url ?? null })
      .eq("id", me);
    if (profErr) throw new Error(profErr.message);

    const { error: provErr } = await supabaseAdmin
      .from("providers")
      .update({
        bio: data.bio ?? null,
        credentials: data.credentials ?? null,
        specialty: data.specialty ?? null,
        years_experience: data.years_experience ?? null,
        languages: data.languages ?? [],
        consultation_types: data.consultation_types ?? [],
        ...(data.license_states
          ? {
              license_states: Array.from(
                new Set(data.license_states.map((s) => s.toUpperCase())),
              ),
            }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", me);
    if (provErr) throw new Error(provErr.message);
    return { ok: true };
  });
