import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";


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

    // One paged listUsers sweep replaces a getUserById call per patient row (that was
    // N auth round trips scaling with patient count); it runs concurrently with the
    // profiles query below.
    const authByIdPromise = (async () => {
      const map = new Map<string, any>();
      for (let authPage = 1; ; authPage++) {
        const { data: usersPage, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
          page: authPage,
          perPage: 1000,
        });
        if (usersErr) throw new Error(usersErr.message);
        const users = usersPage?.users ?? [];
        for (const u of users) map.set(u.id, u);
        if (users.length < 1000) break;
      }
      return map;
    })();

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
    const authById = await authByIdPromise;

    const rows = (profiles ?? []).map((p: any) => {
      const u: any = authById.get(p.id) ?? null;
      const bannedUntil = u?.banned_until ? new Date(u.banned_until) : null;
      const isDeactivated = !!(bannedUntil && bannedUntil.getTime() > Date.now());
      return {
        ...p,
        is_active: !isDeactivated,
        last_sign_in_at: u?.last_sign_in_at ?? null,
        email_confirmed_at: u?.email_confirmed_at ?? null,
      };
    });

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
      .select(
        "id, full_name, email, phone, dob, sex, avatar_url, street_address, apartment, city, state_code, postal_code, country, sms_consent, marketing_consent, created_at, updated_at",
      )
      .eq("id", data.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("Patient profile not found");

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const u: any = userRes?.user ?? null;
    const bannedUntil = u?.banned_until ? new Date(u.banned_until) : null;
    const isDeactivated = !!(bannedUntil && bannedUntil.getTime() > Date.now());

    return {
      ...profile,
      is_active: !isDeactivated,
      banned_until: u?.banned_until ?? null,
      last_sign_in_at: u?.last_sign_in_at ?? null,
      email_confirmed_at: u?.email_confirmed_at ?? null,
    };
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
  sex: z.enum(["male", "female", "other"]).nullable().optional(),
  street_address: z.string().trim().max(255).nullable().optional(),
  apartment: z.string().trim().max(60).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  state_code: z.string().trim().max(2).nullable().optional(),
  postal_code: z.string().trim().max(20).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
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
    if (rest.sex !== undefined) patch.sex = rest.sex;
    if (rest.street_address !== undefined) patch.street_address = rest.street_address || null;
    if (rest.apartment !== undefined) patch.apartment = rest.apartment || null;
    if (rest.city !== undefined) patch.city = rest.city || null;
    if (rest.state_code !== undefined) patch.state_code = rest.state_code ? rest.state_code.toUpperCase() : null;
    if (rest.postal_code !== undefined) patch.postal_code = rest.postal_code || null;
    if (rest.country !== undefined) patch.country = rest.country || null;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("profiles")
      .update(patch as any)
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

export const deletePatient = createServerFn({ method: "POST" })
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

    // Cancel live Stripe subscriptions first — a deleted account must never keep billing.
    // Abort the whole delete if a cancel fails, so we can't strand a billing subscription.
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", data.userId)
      .in("status", ["active", "trialing", "past_due", "unpaid", "incomplete"]);
    const live = (subs ?? []).filter((s: any) => s.stripe_subscription_id);
    if (live.length) {
      const { getStripe } = await import("@/integrations/stripe/client.server");
      const stripe = getStripe();
      for (const s of live) {
        try {
          await stripe.subscriptions.cancel(s.stripe_subscription_id);
        } catch (e: any) {
          if (e?.code !== "resource_missing") {
            throw new Error(
              `Could not cancel Stripe subscription ${s.stripe_subscription_id}: ${e?.message ?? e}`,
            );
          }
        }
      }
    }

    // These tables have a NOT NULL user_id and would block the auth delete.
    const { data: orders } = await supabaseAdmin
      .from("shop_checkout_orders")
      .select("id")
      .eq("user_id", data.userId);
    const orderIds = (orders ?? []).map((o: any) => o.id);
    if (orderIds.length) {
      await supabaseAdmin.from("shop_checkout_events").delete().in("order_id", orderIds);
      await supabaseAdmin.from("shop_checkout_orders").delete().eq("user_id", data.userId);
    }
    await supabaseAdmin
      .from("subscription_cancellation_feedback")
      .delete()
      .eq("user_id", data.userId);

    // Cascades profiles + user_roles; payments, subscriptions, refund_requests and
    // intake_sessions keep their rows with user_id nulled, so financial history survives.
    // The email is freed for a brand-new signup.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
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

    // Patients reset their password on the PATIENT portal — never on this admin app's
    // origin (which is what the client-provided redirect_to points at).
    const portalUrl = process.env.PATIENT_PORTAL_URL?.replace(/\/$/, "");
    const redirectTo = portalUrl
      ? `${portalUrl}/auth/callback?next=/reset-password`
      : data.redirect_to;

    const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(profile.email, {
      redirectTo,
    });
    if (linkErr) throw new Error(linkErr.message);
    return { ok: true };
  });

export const getPatientRelated = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    const email = (profile as any)?.email ?? null;

    // Orders = the patient's confirmed subscriptions (both onboarding + shop write these).
    const subQ = supabaseAdmin
      .from("subscriptions")
      .select("id, stripe_subscription_id, package_id, medicine_id, status, created_at")
      .eq("user_id", data.userId)
      .not("status", "in", "(incomplete,incomplete_expired)")
      .order("created_at", { ascending: false })
      .limit(100);

    // Sessions can be claimed by user or match email
    let sessionQ = supabaseAdmin
      .from("intake_sessions")
      .select("id, full_name, email, status, selected_plan_id, created_at, claimed_by_user_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (email) {
      sessionQ = sessionQ.or(`claimed_by_user_id.eq.${data.userId},email.eq.${email}`);
    } else {
      sessionQ = sessionQ.eq("claimed_by_user_id", data.userId);
    }

    const paymentQ = supabaseAdmin
      .from("payments")
      .select(
        "id, amount_cents, currency, status, stripe_invoice_id, stripe_subscription_id, created_at",
      )
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(100);

    const [{ data: subs }, { data: sessions }, { data: payments }] = await Promise.all([
      subQ,
      sessionQ,
      paymentQ,
    ]);

    const subRows = subs ?? [];
    const pkgIds = Array.from(new Set(subRows.map((s: any) => s.package_id).filter(Boolean)));
    const medIds = Array.from(new Set(subRows.map((s: any) => s.medicine_id).filter(Boolean)));
    const [{ data: pkgs }, { data: meds }] = await Promise.all([
      pkgIds.length
        ? supabaseAdmin.from("packages").select("id, name").in("id", pkgIds)
        : Promise.resolve({ data: [] as any[] }),
      medIds.length
        ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const pkgMap = new Map((pkgs ?? []).map((p: any) => [p.id, p.name]));
    const medMap = new Map((meds ?? []).map((m: any) => [m.id, m.name]));
    const payBySub = new Map<string, any>();
    for (const p of payments ?? []) {
      // payments are desc; overwriting leaves the earliest (initial charge) per subscription
      if (p.stripe_subscription_id) payBySub.set(p.stripe_subscription_id, p);
    }

    const orders = subRows.map((s: any) => {
      const pay = payBySub.get(s.stripe_subscription_id);
      const item =
        [medMap.get(s.medicine_id), pkgMap.get(s.package_id)].filter(Boolean).join(" — ") || "—";
      return {
        id: s.id,
        selected_plan_code: item,
        total: pay ? Number(pay.amount_cents) / 100 : 0,
        status: s.status === "active" ? "paid" : s.status,
        created_at: s.created_at,
      };
    });

    return {
      orders,
      sessions: sessions ?? [],
      payments: payments ?? [],
    };
  });

export const getPatientClinical = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", data.userId)
      .maybeSingle();
    const email = (profile as any)?.email ?? null;

    const sessionCols =
      "id, height_cm, weight_kg, state_code, selected_plan_id, status, created_at";
    // The session this user claimed is the definitive one; otherwise the latest matching email.
    let session: any = (
      await supabaseAdmin
        .from("intake_sessions")
        .select(sessionCols)
        .eq("claimed_by_user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ).data;
    if (!session && email) {
      session = (
        await supabaseAdmin
          .from("intake_sessions")
          .select(sessionCols)
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;
    }

    const h = Number(session?.height_cm ?? 0);
    const w = Number(session?.weight_kg ?? 0);
    const bmi = h && w ? Number((w / ((h / 100) * (h / 100))).toFixed(1)) : null;

    let goal: string | null = null;
    let eligibility: string | null = null;
    if (session) {
      const [{ data: catLink }, { data: elig }] = await Promise.all([
        supabaseAdmin
          .from("intake_session_categories")
          .select("medication_categories(name)")
          .eq("session_id", session.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("intake_session_eligibility_results")
          .select("result")
          .eq("session_id", session.id)
          .order("evaluated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      goal = (catLink as any)?.medication_categories?.name ?? null;
      eligibility = (elig as any)?.result ?? null;
    }

    // Current medicine/plan: prefer the live subscription (reflects any admin medicine change),
    // fall back to the intake session's selected plan.
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("medicine_id, package_id, status")
      .eq("user_id", data.userId)
      .not("status", "in", "(incomplete,incomplete_expired)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let medicineId = (sub as any)?.medicine_id ?? null;
    const packageId = (sub as any)?.package_id ?? session?.selected_plan_id ?? null;
    const subscriptionStatus = (sub as any)?.status ?? null;

    let plan: { name: string | null; duration_months: number | null; price: number | null } | null =
      null;
    if (packageId) {
      const { data: pkg } = await supabaseAdmin
        .from("packages")
        .select("name, duration_months, price, medicine_id")
        .eq("id", packageId)
        .maybeSingle();
      if (pkg) {
        plan = {
          name: pkg.name,
          duration_months: pkg.duration_months,
          price: Number(pkg.price),
        };
        if (!medicineId) medicineId = (pkg as any).medicine_id;
      }
    }

    let medicineName: string | null = null;
    if (medicineId) {
      const { data: med } = await supabaseAdmin
        .from("medicines")
        .select("name")
        .eq("id", medicineId)
        .maybeSingle();
      medicineName = (med as any)?.name ?? null;
    }

    return {
      has_data: Boolean(session || sub),
      bmi,
      goal,
      eligibility,
      state_code: session?.state_code ?? null,
      medicine_name: medicineName,
      plan,
      subscription_status: subscriptionStatus,
    };
  });