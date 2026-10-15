import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";
import { WIPE_GROUPS, TABLES, expandGroups, type WipeGroupKey } from "@/lib/danger-zone";

const inputSchema = z.object({
  groups: z
    .array(z.enum(WIPE_GROUPS.map((g) => g.key) as [WipeGroupKey, ...WipeGroupKey[]]))
    .min(1),
});

export const wipePlatformData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const groups = expandGroups(data.groups);
    const deleted: Record<string, number> = {};

    for (const entry of TABLES) {
      if (!groups.includes(entry.group)) continue;
      const client = supabaseAdmin as never as {
        from: (t: string) => any;
      };

      const { count } = await client.from(entry.table).select("*", { count: "exact", head: true });

      const { error } = await client.from(entry.table).delete().not(entry.col, "is", null);
      if (error) throw new Error(`${entry.table}: ${error.message}`);

      deleted[entry.group] = (deleted[entry.group] ?? 0) + (count ?? 0);
    }

    if (groups.includes("orders")) {
      const { deleteMedicineChangeHistory } = await import("@/lib/audit.functions");
      await deleteMedicineChangeHistory(supabaseAdmin, { all: true });
    }

    if (groups.includes("patient")) {
      const { data: patientRoles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "patient");
      const patientUserIds = (patientRoles ?? []).map((r: any) => r.user_id);
      if (patientUserIds.length > 0) {
        await supabaseAdmin.from("patient_consultations").delete().in("user_id", patientUserIds);
        await supabaseAdmin.from("referrals").delete().in("referrer_user_id", patientUserIds);
        await supabaseAdmin.from("referrals").delete().in("referred_user_id", patientUserIds);
        await supabaseAdmin.from("notifications").delete().in("user_id", patientUserIds);
        await supabaseAdmin.from("profiles").delete().in("id", patientUserIds);
        await supabaseAdmin.from("user_roles").delete().in("user_id", patientUserIds).eq("role", "patient");
        for (const uid of patientUserIds) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(uid);
          } catch {}
        }
        deleted["patient"] = (deleted["patient"] ?? 0) + patientUserIds.length;
      }
    }

    await supabaseAdmin.from("admin_activity_log").insert({
      admin_user_id: context.userId,
      action: "danger.wipe",
      entity: "platform_data",
      entity_id: null,
      before: null,
      after: { groups, deleted } as never,
    });

    return { ok: true, groups, deleted };
  });
