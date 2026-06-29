import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const listInput = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(["all", "active", "deactivated"]).default("all"),
  })
  .default({ status: "all" });

const idInput = z.object({ userId: z.string().uuid() });

export const listPatients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find user_ids with role = 'patient'
    const { data: roleRows, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "patient");
    if (roleErr) throw new Error(roleErr.message);
    const userIds = (roleRows ?? []).map((r: any) => r.user_id);
    if (userIds.length === 0) return [];

    let q = supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, dob, avatar_url, created_at")
      .in("id", userIds)
      .order("created_at", { ascending: false });

    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
    }
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);

    // Fetch ban status for each via auth admin
    const rows = await Promise.all(
      (profiles ?? []).map(async (p: any) => {
        const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(p.id);
        const u: any = userRes?.user ?? null;
        const bannedUntil = u?.banned_until ? new Date(u.banned_until) : null;
        const isDeactivated = !!(bannedUntil && bannedUntil.getTime() > Date.now());
        return {
          ...p,
          is_active: !isDeactivated,
          last_sign_in_at: u?.last_sign_in_at ?? null,
          email_confirmed_at: u?.email_confirmed_at ?? null,
        };
      }),
    );

    if (data.status === "active") return rows.filter((r) => r.is_active);
    if (data.status === "deactivated") return rows.filter((r) => !r.is_active);
    return rows;
  });

export const getPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: role, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!role || role.role !== "patient") throw new Error("Patient not found");

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, dob, avatar_url, created_at, updated_at")
      .eq("id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("Patient profile not found");

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const u: any = userRes?.user ?? null;
    const bannedUntil = u?.banned_until ? new Date(u.banned_until) : null;
    const isDeactivated = !!(bannedUntil && bannedUntil.getTime() > Date.now());

    const { count } = await supabaseAdmin
      .from("intake_responses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", data.userId);

    return {
      ...profile,
      is_active: !isDeactivated,
      banned_until: u?.banned_until ?? null,
      last_sign_in_at: u?.last_sign_in_at ?? null,
      email_confirmed_at: u?.email_confirmed_at ?? null,
      intake_response_count: count ?? 0,
    };
  });

export const listPatientIntakeResponses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("intake_responses")
      .select("*")
      .eq("user_id", data.userId)
      .order("submitted_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const profileUpdate = z.object({
  userId: z.string().uuid(),
  full_name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .optional(),
});

export const updatePatientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileUpdate.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { userId, ...rest } = data;
    const patch: Record<string, any> = {};
    if (rest.full_name !== undefined) patch.full_name = rest.full_name;
    if (rest.phone !== undefined) patch.phone = rest.phone || null;
    if (rest.dob !== undefined) patch.dob = rest.dob || null;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPatientActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.is_active ? "none" : "876000h",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendPatientPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), redirect_to: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    if (error || !profile?.email) throw new Error("Patient email not found");
    const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(profile.email, {
      redirectTo: data.redirect_to,
    });
    if (linkErr) throw new Error(linkErr.message);
    return { ok: true };
  });