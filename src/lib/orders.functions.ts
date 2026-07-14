import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";


// A subscription is the canonical record of every purchase (onboarding + shop). "active" is
// shown as "paid"; incomplete subscriptions are unconfirmed and hidden from the default view.
function displayStatus(subStatus: string): string {
  return subStatus === "active" ? "paid" : subStatus;
}

const listInput = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.string().trim().max(40).optional(),
  })
  .default({});

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("subscriptions")
      .select("id, user_id, stripe_subscription_id, package_id, medicine_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data.status && data.status !== "all") {
      q = q.eq("status", data.status === "paid" ? "active" : data.status);
    } else {
      // Confirmed only — hide never-completed (abandoned) checkouts.
      q = q.not("status", "in", "(incomplete,incomplete_expired)");
    }

    const { data: subs, error } = await q;
    if (error) throw new Error(error.message);
    const rows = subs ?? [];

    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
    const pkgIds = Array.from(new Set(rows.map((r: any) => r.package_id).filter(Boolean)));
    const medIds = Array.from(new Set(rows.map((r: any) => r.medicine_id).filter(Boolean)));
    const subIds = rows.map((r: any) => r.stripe_subscription_id).filter(Boolean);

    const [{ data: profiles }, { data: pkgs }, { data: meds }, { data: payments }] =
      await Promise.all([
        userIds.length
          ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        pkgIds.length
          ? supabaseAdmin.from("packages").select("id, name").in("id", pkgIds)
          : Promise.resolve({ data: [] as any[] }),
        medIds.length
          ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
          : Promise.resolve({ data: [] as any[] }),
        subIds.length
          ? supabaseAdmin
              .from("payments")
              .select("stripe_subscription_id, amount_cents, status, created_at")
              .in("stripe_subscription_id", subIds)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
      ]);

    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const pkgMap = new Map((pkgs ?? []).map((p: any) => [p.id, p]));
    const medMap = new Map((meds ?? []).map((m: any) => [m.id, m]));
    const payMap = new Map<string, any>();
    for (const pay of payments ?? []) {
      // first payment per subscription = the initial charge (list amount)
      if (!payMap.has(pay.stripe_subscription_id)) payMap.set(pay.stripe_subscription_id, pay);
    }

    let result = rows.map((r: any) => {
      const p = pMap.get(r.user_id) as any;
      const pay = payMap.get(r.stripe_subscription_id);
      const medName = (medMap.get(r.medicine_id) as any)?.name;
      const pkgName = (pkgMap.get(r.package_id) as any)?.name;
      return {
        id: r.id,
        customer_name: p?.full_name ?? null,
        customer_email: p?.email ?? null,
        item_name: [medName, pkgName].filter(Boolean).join(" — ") || "—",
        item_count: 1,
        amount: pay ? Number(pay.amount_cents) / 100 : null,
        status: displayStatus(r.status),
        created_at: r.created_at,
      };
    });

    if (data.search) {
      const s = data.search.toLowerCase();
      result = result.filter(
        (r: any) =>
          (r.customer_name ?? "").toLowerCase().includes(s) ||
          (r.customer_email ?? "").toLowerCase().includes(s) ||
          r.id.toLowerCase().includes(s),
      );
    }
    return result;
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub, error } = await supabaseAdmin
      .from("subscriptions")
      .select(
        "id, user_id, session_id, stripe_subscription_id, stripe_customer_id, package_id, medicine_id, status, current_period_end, cancel_at_period_end, created_at",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub) throw new Error("Order not found");

    const [{ data: pkg }, { data: med }, { data: profile }, { data: payments }] = await Promise.all([
      sub.package_id
        ? supabaseAdmin
            .from("packages")
            .select("name, price, duration_months")
            .eq("id", sub.package_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
      sub.medicine_id
        ? supabaseAdmin.from("medicines").select("name").eq("id", sub.medicine_id).maybeSingle()
        : Promise.resolve({ data: null as any }),
      sub.user_id
        ? supabaseAdmin
            .from("profiles")
            .select(
              "id, full_name, email, phone, street_address, city, state_code, postal_code, country",
            )
            .eq("id", sub.user_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
      supabaseAdmin
        .from("payments")
        .select("*")
        .eq("stripe_subscription_id", sub.stripe_subscription_id)
        .order("created_at", { ascending: false }),
    ]);

    return {
      subscription: sub,
      package: pkg ?? null,
      medicine: med ?? null,
      customer: profile ?? null,
      payments: payments ?? [],
      display_status: displayStatus(sub.status),
    };
  });
