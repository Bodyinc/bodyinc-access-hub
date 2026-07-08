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

const promoInput = z.object({
  code: z.string().trim().min(1).max(60),
  discount_type: z.enum(["percent", "amount"]),
  percent_off: z.number().min(0).max(100).nullable().optional(),
  amount_off_cents: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
  auto_apply: z.boolean().default(false),
  max_redemptions: z.number().int().min(1).nullable().optional(),
  redeem_by: z.string().trim().min(1).nullable().optional(),
});

function toRow(data: z.infer<typeof promoInput>) {
  return {
    code: data.code.trim().toUpperCase(),
    discount_type: data.discount_type,
    percent_off: data.discount_type === "percent" ? (data.percent_off ?? 0) : null,
    amount_off_cents: data.discount_type === "amount" ? (data.amount_off_cents ?? 0) : null,
    currency: "usd",
    is_active: data.is_active,
    auto_apply: data.auto_apply,
    max_redemptions: data.max_redemptions ?? null,
    redeem_by: data.redeem_by || null,
  };
}

export const listPromos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getPromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: promo, error } = await supabaseAdmin
      .from("promo_codes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!promo) throw new Error("Promo not found");
    return promo;
  });

export const createPromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => promoInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin
      .from("promo_codes")
      .insert(toRow(data))
      .select("id")
      .single();
    if (error) {
      throw new Error(
        /duplicate|unique/i.test(error.message)
          ? "A promo code with that name already exists."
          : error.message,
      );
    }
    return { id: created.id };
  });

export const updatePromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => promoInput.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const { error } = await supabaseAdmin
      .from("promo_codes")
      .update(toRow(rest))
      .eq("id", id);
    if (error) {
      throw new Error(
        /duplicate|unique/i.test(error.message)
          ? "A promo code with that name already exists."
          : error.message,
      );
    }
    return { id };
  });

export const setPromoActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("promo_codes")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("promo_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
