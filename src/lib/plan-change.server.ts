import { randomBytes } from "node:crypto";

export const PLAN_CHANGE_TIMEOUT_MS = 48 * 60 * 60 * 1000;
const REMINDER_AFTER_MS = 24 * 60 * 60 * 1000;

export function newPlanChangeToken() {
  return randomBytes(24).toString("hex");
}

export function planChangeDeadline(from = Date.now()) {
  return new Date(from + PLAN_CHANGE_TIMEOUT_MS).toISOString();
}

function hubBase() {
  return (
    process.env.PROVIDER_APP_URL ||
    process.env.APP_URL ||
    process.env.ADMIN_APP_URL ||
    ""
  ).replace(/\/$/, "");
}

export function planChangeUrl(token: string) {
  const base = hubBase();
  const path = `/plan-change/${token}`;
  return base ? `${base}${path}` : path;
}

async function notifyProvider(
  supabaseAdmin: any,
  providerId: string | null | undefined,
  requestId: string,
  type: string,
  title: string,
  body: string,
) {
  if (!providerId) return;
  await supabaseAdmin.from("notifications").insert({
    user_id: providerId,
    type,
    title,
    body,
    link: `/provider/requests/${requestId}`,
    entity_id: requestId,
  });
}

async function applyDeferredBilling(
  supabaseAdmin: any,
  req: {
    id: string;
    package_id?: string | null;
    subscription_id?: string | null;
    plan_change_delta_cents?: number | null;
  },
) {
  if (!req.subscription_id || !req.package_id) return;
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("id, stripe_subscription_id, stripe_customer_id")
    .eq("id", req.subscription_id)
    .maybeSingle();
  const { data: pkg } = await supabaseAdmin
    .from("packages")
    .select("id, medicine_id, variant_id, duration_months, price, stripe_price_id, is_active")
    .eq("id", req.package_id)
    .maybeSingle();
  if (sub?.stripe_subscription_id && pkg) {
    const { applyPackageChangeToSubscription } = await import("@/lib/subscription-reschedule");
    const { getStripe } = await import("@/integrations/stripe/client.server");
    await applyPackageChangeToSubscription({
      stripe: getStripe(),
      supabaseAdmin,
      sub: { id: sub.id, stripe_subscription_id: sub.stripe_subscription_id },
      pkg,
    });
  }
  const delta = Number(req.plan_change_delta_cents ?? 0);
  if (delta < 0 && sub?.stripe_customer_id) {
    try {
      const { getStripe } = await import("@/integrations/stripe/client.server");
      await getStripe().customers.createBalanceTransaction(sub.stripe_customer_id, {
        amount: delta,
        currency: "usd",
        description: "Credit for a confirmed plan change (settles next cycle)",
      });
    } catch (error) {
      console.error("[plan-change] credit failed:", error);
    }
  }
}

/** Patient confirmed. Billing is applied and the order returns to the practitioner's decision. */
export async function confirmPlanChange(
  supabaseAdmin: any,
  requestId: string,
  source: "patient" | "payment",
) {
  const { data: req } = await supabaseAdmin
    .from("medication_requests")
    .select(
      "id, status, provider_id, user_id, medicine_id, package_id, subscription_id, plan_change_delta_cents, plan_change_token",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("Order not found.");
  if (req.status !== "awaiting_additional_payment") {
    return { ok: true, already: true, status: req.status };
  }

  await applyDeferredBilling(supabaseAdmin, req);

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("additional_payments")
    .update({ status: "paid", paid_at: now, updated_at: now })
    .eq("request_id", requestId)
    .eq("status", "pending");

  await supabaseAdmin
    .from("medication_requests")
    .update({
      status: "pending_review",
      plan_change_token: null,
      plan_change_deadline: null,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "awaiting_additional_payment");

  await supabaseAdmin.from("medication_request_events").insert({
    request_id: requestId,
    status: "pending_review",
    actor_role: source === "payment" ? "system" : "patient",
    created_by: req.user_id,
    note:
      source === "payment"
        ? "Patient confirmed the plan change by completing payment. Returned to the practitioner's decision."
        : "Patient confirmed the plan change. Returned to the practitioner's decision.",
  });

  await notifyProvider(
    supabaseAdmin,
    req.provider_id,
    requestId,
    "plan_change_confirmed",
    "Patient confirmed the plan change",
    "The order is back on your decision step. Approve, prescribe, or reject.",
  );

  return { ok: true, status: "pending_review" };
}

export async function declinePlanChange(
  supabaseAdmin: any,
  requestId: string,
  reason: "declined" | "timeout",
) {
  const { data: req } = await supabaseAdmin
    .from("medication_requests")
    .select(
      "id, status, provider_id, user_id, medicine_id, previous_medicine_id, previous_variant_id, previous_package_id",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (!req) throw new Error("Order not found.");
  if (req.status !== "awaiting_additional_payment") {
    return { ok: true, already: true, status: req.status };
  }

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("additional_payments")
    .update({ status: "cancelled", updated_at: now })
    .eq("request_id", requestId)
    .eq("status", "pending");

  const restore =
    req.previous_package_id != null || req.previous_medicine_id != null
      ? {
          medicine_id: req.previous_medicine_id,
          variant_id: req.previous_variant_id,
          package_id: req.previous_package_id,
        }
      : {};

  await supabaseAdmin
    .from("medication_requests")
    .update({
      ...restore,
      status: "pending_review",
      plan_change_token: null,
      plan_change_deadline: null,
      plan_change_delta_cents: null,
      previous_medicine_id: null,
      previous_variant_id: null,
      previous_package_id: null,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "awaiting_additional_payment");

  const note =
    reason === "timeout"
      ? "Plan change timed out after 48 hours with no patient response. Returned to the practitioner's decision."
      : "Patient declined the plan change. Returned to the practitioner's decision.";

  await supabaseAdmin.from("medication_request_events").insert({
    request_id: requestId,
    status: "pending_review",
    actor_role: reason === "timeout" ? "system" : "patient",
    created_by: reason === "timeout" ? null : req.user_id,
    note,
  });

  await notifyProvider(
    supabaseAdmin,
    req.provider_id,
    requestId,
    reason === "timeout" ? "plan_change_timeout" : "plan_change_declined",
    reason === "timeout" ? "Plan change timed out" : "Patient declined the plan change",
    note,
  );

  return { ok: true, status: "pending_review" };
}

/** Remind after 24 hours and revert after 48. Safe to call on each provider page load. */
export async function expireOverduePlanChanges(supabaseAdmin: any, providerId?: string) {
  let q = supabaseAdmin
    .from("medication_requests")
    .select("id, provider_id, user_id, medicine_id, updated_at, plan_change_deadline")
    .eq("status", "awaiting_additional_payment")
    .not("plan_change_deadline", "is", null)
    .limit(100);
  if (providerId) q = q.eq("provider_id", providerId);
  const { data, error } = await q;
  if (error) {
    console.error("[plan-change] expire lookup failed:", error.message);
    return;
  }
  const now = Date.now();
  for (const row of (data ?? []) as any[]) {
    const deadline = new Date(row.plan_change_deadline).getTime();
    if (Number.isFinite(deadline) && deadline <= now) {
      await declinePlanChange(supabaseAdmin, row.id, "timeout").catch((err) =>
        console.error("[plan-change] timeout failed:", err),
      );
      continue;
    }
    const updated = new Date(row.updated_at).getTime();
    if (now - updated >= REMINDER_AFTER_MS) {
      const { remindPatientOfPlanChange } = await import("@/lib/email.notifications");
      await remindPatientOfPlanChange({ supabaseAdmin, request: row }).catch((err) =>
        console.error("[plan-change] reminder failed:", err),
      );
    }
  }
}

export async function loadPlanChangeByToken(supabaseAdmin: any, token: string) {
  const { data } = await supabaseAdmin
    .from("medication_requests")
    .select(
      "id, status, medicine_id, plan_change_deadline, plan_change_delta_cents, plan_change_token",
    )
    .eq("plan_change_token", token)
    .maybeSingle();
  if (!data) return null;
  const { data: med } = data.medicine_id
    ? await supabaseAdmin.from("medicines").select("name").eq("id", data.medicine_id).maybeSingle()
    : { data: null };
  const { data: pay } = await supabaseAdmin
    .from("additional_payments")
    .select("status, stripe_checkout_session_id, amount_cents")
    .eq("request_id", data.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    status: data.status as string,
    medicine_name: (med as { name?: string } | null)?.name ?? "your medication",
    deadline: data.plan_change_deadline as string | null,
    delta_cents: Number(data.plan_change_delta_cents ?? 0),
    amount_cents: Number(pay?.amount_cents ?? 0),
    open: data.status === "awaiting_additional_payment",
  };
}
