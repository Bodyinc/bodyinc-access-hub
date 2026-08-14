import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";

const medicineChangesInput = z
  .object({
    search: z.string().trim().max(200).optional(),
    role: z.enum(["all", "admin", "provider"]).default("all"),
    crossCategoryOnly: z.boolean().default(false),
    days: z.number().int().min(1).max(3650).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .default({ page: 1, limit: 25, role: "all", crossCategoryOnly: false });

/**
 * Every medicine / plan switch performed by an admin or a practitioner, read from the
 * structured audit rows written by `changeRequestMedicine` and `changeSubscriptionMedicine`.
 */
export const listMedicineChanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => medicineChangesInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { normalizeIdSearch } = await import("@/lib/format");

    const from = (data.page - 1) * data.limit;
    const to = from + data.limit - 1;

    let q = supabaseAdmin
      .from("admin_activity_log")
      .select("id, admin_user_id, action, entity, entity_id, before, after, created_at", {
        count: "exact",
      })
      .in("action", ["request.change_medicine", "subscription.change_medicine"])
      .order("created_at", { ascending: false });

    if (data.days) {
      q = q.gte("created_at", new Date(Date.now() - data.days * 86400000).toISOString());
    }
    let idMatchOnly = false;
    if (data.search) {
      const s = normalizeIdSearch(data.search).toLowerCase();
      // Only treat the term as an ID when it reads like a uuid fragment; otherwise it is a
      // name / medicine search that has to be applied after the profile join.
      if (s && /^[0-9a-f-]+$/.test(s)) {
        q = q.ilike("entity_id", `${s}%`);
        idMatchOnly = true;
      }
    }

    const { data: rows, count, error } = await q.range(from, to);
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as any[];

    const actorIds = Array.from(new Set(list.map((r) => r.admin_user_id).filter(Boolean)));
    const patientIds = Array.from(
      new Set(list.map((r) => r?.after?.user_id).filter(Boolean)),
    ) as string[];
    const allIds = Array.from(new Set([...actorIds, ...patientIds])) as string[];

    const { data: profiles } = allIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", allIds)
      : { data: [] as any[] };
    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    const label = (snap: any) => {
      if (!snap) return "—";
      const name = snap.medicine_name ?? "—";
      const variant = snap.variant_name ? ` (${snap.variant_name})` : "";
      const months = snap.duration_months ? ` · ${snap.duration_months} mo` : "";
      return `${name}${variant}${months}`;
    };

    let result = list.map((r) => {
      const actor = r.admin_user_id ? (pMap.get(r.admin_user_id) as any) : null;
      const patient = r?.after?.user_id ? (pMap.get(r.after.user_id) as any) : null;
      return {
        id: r.id,
        created_at: r.created_at,
        entity: r.entity as string,
        entity_id: r.entity_id as string | null,
        source: r.action === "subscription.change_medicine" ? "subscription" : "order",
        actor_name: actor?.full_name ?? actor?.email ?? null,
        actor_role: (r?.after?.actor_role ?? "admin") as string,
        patient_name: patient?.full_name ?? null,
        patient_email: patient?.email ?? null,
        from_label: label(r.before),
        to_label: label(r.after),
        delta_cents: Number(r?.after?.delta_cents ?? 0),
        cross_category: Boolean(r?.after?.cross_category),
        cross_category_reason: r?.after?.cross_category_reason ?? null,
        note: r?.after?.note ?? null,
      };
    });

    if (data.role !== "all") result = result.filter((r) => r.actor_role === data.role);
    if (data.crossCategoryOnly) result = result.filter((r) => r.cross_category);
    if (data.search && !idMatchOnly) {
      const s = data.search.toLowerCase();
      result = result.filter(
        (r) =>
          (r.patient_name ?? "").toLowerCase().includes(s) ||
          (r.patient_email ?? "").toLowerCase().includes(s) ||
          r.from_label.toLowerCase().includes(s) ||
          r.to_label.toLowerCase().includes(s),
      );
    }

    const total = count ?? 0;
    return {
      data: result,
      total,
      page: data.page,
      page_size: data.limit,
      total_pages: total ? Math.ceil(total / data.limit) : 0,
    };
  });
