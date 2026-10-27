import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenSchema = z.object({ token: z.string().trim().min(16).max(128) });

export const getPlanChange = createServerFn({ method: "POST" })
  .validator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { declinePlanChange, loadPlanChangeByToken } = await import("@/lib/plan-change.server");
    const row = await loadPlanChangeByToken(supabaseAdmin, data.token);
    if (!row) return { found: false as const };
    if (row.open && row.deadline && new Date(row.deadline).getTime() <= Date.now()) {
      const { data: req } = await supabaseAdmin
        .from("medication_requests")
        .select("id")
        .eq("plan_change_token", data.token)
        .maybeSingle();
      if (req?.id) await declinePlanChange(supabaseAdmin, req.id, "timeout");
      return {
        found: true as const,
        open: false,
        medicine_name: row.medicine_name,
        amount_cents: 0,
        deadline: row.deadline,
        message: "This plan change timed out. The previous plan was restored.",
      };
    }
    return {
      found: true as const,
      open: row.open,
      medicine_name: row.medicine_name,
      amount_cents: row.delta_cents > 0 ? row.delta_cents : 0,
      deadline: row.deadline,
      message: row.open ? null : "This plan change has already been answered.",
    };
  });

export const respondToPlanChange = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    tokenSchema
      .extend({ decision: z.enum(["confirm", "decline"]) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { confirmPlanChange, declinePlanChange } = await import("@/lib/plan-change.server");
    const { data: req } = await supabaseAdmin
      .from("medication_requests")
      .select("id, status, plan_change_delta_cents")
      .eq("plan_change_token", data.token)
      .maybeSingle();
    if (!req || req.status !== "awaiting_additional_payment") {
      throw new Error("This link is no longer active.");
    }
    if (data.decision === "decline") {
      await declinePlanChange(supabaseAdmin, req.id, "declined");
      return { ok: true, payUrl: null as string | null };
    }

    const delta = Number(req.plan_change_delta_cents ?? 0);
    if (delta > 0) {
      const { data: pay } = await supabaseAdmin
        .from("additional_payments")
        .select("stripe_checkout_session_id")
        .eq("request_id", req.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pay?.stripe_checkout_session_id) {
        const { getStripe } = await import("@/integrations/stripe/client.server");
        const session = await getStripe().checkout.sessions.retrieve(pay.stripe_checkout_session_id);
        if (session.url && session.status === "open") return { ok: true, payUrl: session.url };
      }
      throw new Error("Open the payment link in your email to confirm this change.");
    }

    await confirmPlanChange(supabaseAdmin, req.id, "patient");
    return { ok: true, payUrl: null as string | null };
  });
