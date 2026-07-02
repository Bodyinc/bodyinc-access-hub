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
      .from("shop_checkout_orders")
      .select(
        "id, user_id, medicine_id, selected_package_id, selected_plan_code, payment_method_code, subtotal, shipping, total, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: orders, error } = await q;
    if (error) throw new Error(error.message);

    const rows = orders ?? [];
    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
    const orderIds = rows.map((r: any) => r.id);

    const [{ data: profiles }, { data: items }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      orderIds.length
        ? supabaseAdmin
            .from("shop_checkout_order_items")
            .select("order_id, quantity")
            .in("order_id", orderIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const iMap = new Map<string, number>();
    for (const it of items ?? []) {
      iMap.set(it.order_id, (iMap.get(it.order_id) ?? 0) + Number(it.quantity ?? 0));
    }

    let result = rows.map((r: any) => {
      const p = pMap.get(r.user_id) as any;
      return {
        ...r,
        customer_name: p?.full_name ?? null,
        customer_email: p?.email ?? null,
        item_count: iMap.get(r.id) ?? 0,
      };
    });

    if (data.search) {
      const s = data.search.toLowerCase();
      result = result.filter((r: any) =>
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

    const { data: order, error } = await supabaseAdmin
      .from("shop_checkout_orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");

    const [{ data: items }, { data: events }, { data: profile }, { data: payments }] =
      await Promise.all([
        supabaseAdmin
          .from("shop_checkout_order_items")
          .select("*")
          .eq("order_id", order.id)
          .order("created_at", { ascending: true }),
        supabaseAdmin
          .from("shop_checkout_events")
          .select("*")
          .eq("order_id", order.id)
          .order("created_at", { ascending: false }),
        order.user_id
          ? supabaseAdmin
              .from("profiles")
              .select(
                "id, full_name, email, phone, street_address, city, state_code, postal_code, country",
              )
              .eq("id", order.user_id)
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
        order.user_id
          ? supabaseAdmin
              .from("payments")
              .select("*")
              .eq("user_id", order.user_id)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
      ]);

    return {
      order,
      items: items ?? [],
      events: events ?? [],
      customer: profile ?? null,
      payments: payments ?? [],
    };
  });