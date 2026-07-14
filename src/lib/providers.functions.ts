import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { providerFormSchema } from "./providers.schema";
import { assertAdmin } from "@/lib/admin-guard";


const PROFILE_KEYS = ["full_name", "phone", "avatar_url"] as const;
type ProfileKey = (typeof PROFILE_KEYS)[number];

function splitProviderPayload<T extends Record<string, any>>(input: T) {
  const profile: Record<string, any> = {};
  const provider: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if ((PROFILE_KEYS as readonly string[]).includes(k)) profile[k as ProfileKey] = v;
    else provider[k] = v;
  }
  return { profile, provider };
}

const listInput = z
  .object({
    search: z.string().trim().max(120).optional(),
    status: z.enum(["all", "active", "inactive"]).default("all"),
  })
  .default({ status: "all" });

export const listProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let query = context.supabase
      .from("provider_directory")
      .select("id, full_name, email, phone, avatar_url, specialty, credentials, is_active, created_at")
      .order("created_at", { ascending: false });

    if (data.status === "active") query = query.eq("is_active", true);
    if (data.status === "inactive") query = query.eq("is_active", false);

    if (data.search) {
      const s = `%${data.search}%`;
      query = query.or(
        `full_name.ilike.${s},email.ilike.${s},specialty.ilike.${s}`,
      );
    }

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: provider, error } = await context.supabase
      .from("providers")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!provider) throw new Error("Provider not found");
    const { data: profile, error: profileErr } = await context.supabase
      .from("profiles")
      .select("full_name, email, phone, avatar_url")
      .eq("id", data.id)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);
    return { ...(provider as any), ...((profile as any) ?? {}) };
  });

const createInput = providerFormSchema.extend({
  redirect_to: z.string().url(),
});

export const createProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { redirect_to, email, ...rest } = data;
    const { profile: profileFields, provider: providerFields } = splitProviderPayload(rest);

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: profileFields.full_name },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Could not create user");
    }
    const userId = created.user.id;

    // Upsert profile (trigger may have already inserted a base row)
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: userId, email, full_name: profileFields.full_name ?? "", ...profileFields } as any,
        { onConflict: "id" },
      );
    if (profileErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(profileErr.message);
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "provider" });
    if (roleErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(roleErr.message);
    }

    const { error: insertErr } = await supabaseAdmin
      .from("providers")
      .insert({ id: userId, ...providerFields });
    if (insertErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error(insertErr.message);
    }

    const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(
      email,
      { redirectTo: redirect_to },
    );
    if (linkErr) {
      // Provider exists; surface warning but don't roll back
      return { id: userId, invite_sent: false, warning: linkErr.message };
    }
    return { id: userId, invite_sent: true };
  });

const updateInput = providerFormSchema.partial().extend({
  id: z.string().uuid(),
});

export const updateProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, email, ...rest } = data;
    const { profile: profileFields, provider: providerFields } = splitProviderPayload(rest);

    if (Object.keys(profileFields).length > 0) {
      const { error } = await context.supabase
        .from("profiles")
        .update(profileFields as any)
        .eq("id", id);
      if (error) throw new Error(error.message);
    }

    if (email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, { email });
      if (authErr) throw new Error(authErr.message);
      // Trigger on auth.users will sync profiles.email
    }

    if (Object.keys(providerFields).length > 0) {
      const { error } = await context.supabase
        .from("providers")
        .update(providerFields as any)
        .eq("id", id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), redirect_to: z.string().url() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row?.email) throw new Error("Provider not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(
      row.email,
      { redirectTo: data.redirect_to },
    );
    if (linkErr) throw new Error(linkErr.message);
    return { ok: true };
  });

export const setProviderActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updErr } = await supabaseAdmin
      .from("providers")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    // Ban / unban the auth user so login is actually blocked
    await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.is_active ? "none" : "876000h",
    });
    return { ok: true };
  });

export const deleteProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });