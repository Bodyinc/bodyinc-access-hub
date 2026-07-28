import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertReviewer, assertAdmin } from "@/lib/admin-guard";

type Ctx = { supabase: any; userId: string };

// Non-terminal statuses for the default queue view.
const OPEN_STATUSES = [
  "payment_completed",
  "provider_assigned",
  "pending_review",
  "awaiting_additional_payment",
  "approved",
  "prescribed",
  "sent_to_pharmacy",
  "dispatched",
];

async function logEvent(
  supabaseAdmin: any,
  requestId: string,
  status: string,
  actorRole: "admin" | "provider" | "system",
  createdBy: string | null,
  note?: string | null,
): Promise<void> {
  await supabaseAdmin.from("medication_request_events").insert({
    request_id: requestId,
    status,
    actor_role: actorRole,
    created_by: createdBy,
    note: note ?? null,
  });
}

// Loads a request and enforces provider scoping: a provider may only touch requests assigned to
// them; an admin may touch any. Returns the row selected with `cols`.
async function loadScopedRequest(
  supabaseAdmin: any,
  requestId: string,
  role: "admin" | "provider",
  userId: string,
  cols: string,
): Promise<any> {
  const { data: req, error } = await supabaseAdmin
    .from("medication_requests")
    .select(cols)
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!req) throw new Error("Request not found.");
  if (role === "provider" && req.provider_id !== userId) throw new Error("Forbidden");
  return req;
}

async function resolvePaymentIntentForPayment(stripe: any, payment: any): Promise<string | null> {
  if (payment.stripe_payment_intent_id) return payment.stripe_payment_intent_id;
  if (!payment.stripe_invoice_id) return null;
  try {
    const inv = await stripe.invoices.retrieve(payment.stripe_invoice_id, { expand: ["payments"] });
    for (const entry of inv?.payments?.data ?? []) {
      const pi = entry?.payment?.payment_intent;
      const piId = typeof pi === "string" ? pi : pi?.id;
      if (piId) return piId;
    }
  } catch {
    // fall through
  }
  return null;
}

const listInput = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.string().trim().max(40).optional(),
  })
  .default({});

export const listRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const role = await assertReviewer(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("medication_requests")
      .select(
        "id, user_id, session_id, provider_id, medicine_id, package_id, kind, status, requires_consultation, tracking_number, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);

    if (role === "provider") q = q.eq("provider_id", context.userId);

    if (data.status && data.status !== "all") {
      q = data.status === "open" ? q.in("status", OPEN_STATUSES) : q.eq("status", data.status);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = rows ?? [];

    const userIds = Array.from(new Set(list.map((r: any) => r.user_id).filter(Boolean)));
    const sessionIds = Array.from(
      new Set(list.filter((r: any) => !r.user_id).map((r: any) => r.session_id).filter(Boolean)),
    );
    const medIds = Array.from(new Set(list.map((r: any) => r.medicine_id).filter(Boolean)));
    const provIds = Array.from(new Set(list.map((r: any) => r.provider_id).filter(Boolean)));

    const [{ data: profiles }, { data: sessions }, { data: meds }, { data: provs }] =
      await Promise.all([
        userIds.length
          ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        sessionIds.length
          ? supabaseAdmin.from("intake_sessions").select("id, full_name, email").in("id", sessionIds)
          : Promise.resolve({ data: [] as any[] }),
        medIds.length
          ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
          : Promise.resolve({ data: [] as any[] }),
        provIds.length
          ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", provIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const sMap = new Map((sessions ?? []).map((s: any) => [s.id, s]));
    const medMap = new Map((meds ?? []).map((m: any) => [m.id, m]));
    const provMap = new Map((provs ?? []).map((p: any) => [p.id, p]));

    let result = list.map((r: any) => {
      const p = pMap.get(r.user_id) as any;
      const sess = !p ? (sMap.get(r.session_id) as any) : null;
      const prov = provMap.get(r.provider_id) as any;
      return {
        id: r.id,
        customer_name: p?.full_name ?? sess?.full_name ?? null,
        customer_email: p?.email ?? sess?.email ?? null,
        is_guest: !p && !!sess,
        medicine_name: (medMap.get(r.medicine_id) as any)?.name ?? "—",
        provider_name: prov?.full_name ?? null,
        kind: r.kind,
        status: r.status,
        requires_consultation: r.requires_consultation,
        tracking_number: r.tracking_number,
        created_at: r.created_at,
      };
    });

    if (data.search) {
      const s = data.search.toLowerCase();
      result = result.filter(
        (r: any) =>
          (r.customer_name ?? "").toLowerCase().includes(s) ||
          (r.customer_email ?? "").toLowerCase().includes(s) ||
          (r.medicine_name ?? "").toLowerCase().includes(s) ||
          r.id.toLowerCase().includes(s),
      );
    }
    return result;
  });

export const getRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ requestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const role = await assertReviewer(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const req = await loadScopedRequest(supabaseAdmin, data.requestId, role, context.userId, "*");

    const [profileRes, sessionRes, medRes, pkgRes, provRes, eventsRes, rxRes, addPayRes] =
      await Promise.all([
        req.user_id
          ? supabaseAdmin
              .from("profiles")
              .select("id, full_name, email, state_code")
              .eq("id", req.user_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        req.session_id
          ? supabaseAdmin
              .from("intake_sessions")
              .select("id, full_name, email, state_code")
              .eq("id", req.session_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        req.medicine_id
          ? supabaseAdmin.from("medicines").select("id, name").eq("id", req.medicine_id).maybeSingle()
          : Promise.resolve({ data: null }),
        req.package_id
          ? supabaseAdmin
              .from("packages")
              .select("id, name, price, duration_months")
              .eq("id", req.package_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        req.provider_id
          ? supabaseAdmin
              .from("profiles")
              .select("id, full_name, email")
              .eq("id", req.provider_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabaseAdmin
          .from("medication_request_events")
          .select("id, status, note, actor_role, created_at")
          .eq("request_id", req.id)
          .order("created_at", { ascending: true }),
        supabaseAdmin
          .from("prescriptions")
          .select("id, medicine_name, directions, status, document_url, created_at")
          .eq("request_id", req.id)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("additional_payments")
          .select("id, amount_cents, currency, reason, status, created_at, paid_at")
          .eq("request_id", req.id)
          .order("created_at", { ascending: false }),
      ]);

    const patient = (profileRes.data as any) ?? (sessionRes.data as any) ?? null;
    return {
      request: req,
      patient: patient
        ? {
            name: patient.full_name ?? null,
            email: patient.email ?? null,
            state_code: patient.state_code ?? null,
            is_guest: !profileRes.data && !!sessionRes.data,
          }
        : null,
      medicine: medRes.data ?? null,
      package: pkgRes.data ?? null,
      provider: provRes.data ?? null,
      events: eventsRes.data ?? [],
      prescriptions: rxRes.data ?? [],
      additional_payments: addPayRes.data ?? [],
    };
  });

export const approveRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ requestId: z.string().uuid(), note: z.string().trim().max(500).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await assertReviewer(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const req = await loadScopedRequest(
      supabaseAdmin,
      data.requestId,
      role,
      context.userId,
      "id, status, provider_id",
    );
    if (req.status !== "pending_review") {
      throw new Error(`Cannot approve a request that is ${req.status}.`);
    }

    const { error } = await supabaseAdmin
      .from("medication_requests")
      .update({
        status: "approved",
        decision_by: context.userId,
        decision_at: new Date().toISOString(),
        decision_note: data.note?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    if (error) throw new Error(error.message);

    await logEvent(supabaseAdmin, req.id, "approved", role, context.userId, data.note?.trim() || null);
    return { ok: true };
  });

export const rejectRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ requestId: z.string().uuid(), note: z.string().trim().max(500).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await assertReviewer(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("@/integrations/stripe/client.server");
    const stripe = getStripe();

    const req = await loadScopedRequest(
      supabaseAdmin,
      data.requestId,
      role,
      context.userId,
      "id, status, provider_id, payment_id, subscription_id, stripe_invoice_id",
    );
    if (!["pending_review", "awaiting_additional_payment"].includes(req.status)) {
      throw new Error(`Cannot reject a request that is ${req.status}.`);
    }

    // Refund the charge for this order.
    let payment: any = null;
    if (req.payment_id) {
      const { data: p } = await supabaseAdmin
        .from("payments")
        .select("id, stripe_payment_intent_id, stripe_invoice_id")
        .eq("id", req.payment_id)
        .maybeSingle();
      payment = p ?? null;
    }
    if (!payment && req.stripe_invoice_id) {
      const { data: p } = await supabaseAdmin
        .from("payments")
        .select("id, stripe_payment_intent_id, stripe_invoice_id")
        .eq("stripe_invoice_id", req.stripe_invoice_id)
        .maybeSingle();
      payment = p ?? null;
    }
    if (!payment) throw new Error("Could not find the payment for this order to refund.");

    const paymentIntentId = await resolvePaymentIntentForPayment(stripe, payment);
    if (!paymentIntentId) {
      throw new Error(
        "Could not resolve the Stripe charge for this order; refund it from the Stripe dashboard, then reject.",
      );
    }
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
    if (!payment.stripe_payment_intent_id) {
      await supabaseAdmin
        .from("payments")
        .update({ stripe_payment_intent_id: paymentIntentId })
        .eq("id", payment.id);
    }
    await supabaseAdmin.from("payments").update({ status: "refunded" }).eq("id", payment.id);

    // Stop future billing on the subscription behind this order.
    if (req.subscription_id) {
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("id, stripe_subscription_id")
        .eq("id", req.subscription_id)
        .maybeSingle();
      if (sub?.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        } catch (e) {
          console.error("[requests] cancel subscription on reject failed:", e);
        }
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("id", sub.id);
      }
    }

    // Void any still-pending Workflow C payment request — the order is being refunded and closed.
    await supabaseAdmin
      .from("additional_payments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("request_id", req.id)
      .eq("status", "pending");

    await supabaseAdmin
      .from("medication_requests")
      .update({
        status: "rejected",
        decision_by: context.userId,
        decision_at: new Date().toISOString(),
        decision_note: data.note?.trim() || null,
        stripe_refund_id: refund.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    await logEvent(supabaseAdmin, req.id, "rejected", role, context.userId, data.note?.trim() || null);
    return { ok: true, stripe_refund_id: refund.id };
  });

export const changeRequestMedicine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        packageId: z.string().uuid(),
        note: z.string().trim().max(500).optional(),
        // Required when the new medicine sits outside the current medicine's categories.
        crossCategoryReason: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await assertReviewer(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("@/integrations/stripe/client.server");
    const { applyPackageChangeToSubscription } = await import("@/lib/subscription-reschedule");
    const stripe = getStripe();

    const req = await loadScopedRequest(
      supabaseAdmin,
      data.requestId,
      role,
      context.userId,
      "id, status, provider_id, user_id, subscription_id, package_id, medicine_id",
    );
    if (!["pending_review", "approved", "awaiting_additional_payment"].includes(req.status)) {
      throw new Error(`Cannot change medicine on a request that is ${req.status}.`);
    }

    const { data: newPkg, error: pkgErr } = await supabaseAdmin
      .from("packages")
      .select(
        "id, medicine_id, variant_id, duration_months, price, stripe_price_id, is_active, medicines(name), medicine_variants(name)",
      )
      .eq("id", data.packageId)
      .maybeSingle();
    if (pkgErr) throw new Error(pkgErr.message);
    if (!newPkg) throw new Error("Selected plan not found.");
    if (!newPkg.is_active) throw new Error("Selected plan is inactive.");
    if (!newPkg.stripe_price_id) {
      throw new Error("This plan isn't synced to Stripe yet. Open the medicine and save it, then retry.");
    }

    // Cross-category switches need an explicit clinical reason, which is logged on the order.
    const currentMedicineId = (req as any).medicine_id as string | null;
    let crossCategory = false;
    if (currentMedicineId && currentMedicineId !== newPkg.medicine_id) {
      const { data: catRows } = await supabaseAdmin
        .from("medication_category_medicines")
        .select("category_id, medicine_id")
        .in("medicine_id", [currentMedicineId, newPkg.medicine_id]);
      const oldCats = new Set(
        ((catRows ?? []) as any[])
          .filter((r) => r.medicine_id === currentMedicineId)
          .map((r) => r.category_id),
      );
      const newCats = ((catRows ?? []) as any[])
        .filter((r) => r.medicine_id === newPkg.medicine_id)
        .map((r) => r.category_id);
      crossCategory =
        oldCats.size > 0 && newCats.length > 0 && !newCats.some((c) => oldCats.has(c));
    }
    if (crossCategory && !data.crossCategoryReason) {
      throw new Error(
        "This medicine is in a different treatment category. A clinical reason is required.",
      );
    }

    let currentPrice = 0;
    if (req.package_id) {
      const { data: curPkg } = await supabaseAdmin
        .from("packages")
        .select("price")
        .eq("id", req.package_id)
        .maybeSingle();
      currentPrice = Number(curPkg?.price ?? 0);
    }
    const deltaCents = Math.round((Number(newPkg.price) - currentPrice) * 100);

    // Load the subscription (for the go-forward reschedule + the customer for a credit).
    let sub: any = null;
    if (req.subscription_id) {
      const { data: s } = await supabaseAdmin
        .from("subscriptions")
        .select("id, stripe_subscription_id, stripe_customer_id")
        .eq("id", req.subscription_id)
        .maybeSingle();
      sub = s ?? null;
    }

    // Reschedule the subscription so the new plan bills from the NEXT cycle.
    if (sub?.stripe_subscription_id) {
      await applyPackageChangeToSubscription({
        stripe,
        supabaseAdmin,
        sub: { id: sub.id, stripe_subscription_id: sub.stripe_subscription_id },
        pkg: newPkg as any,
      });
    }

    // Update the order's prescribed medicine snapshot.
    await supabaseAdmin
      .from("medication_requests")
      .update({
        medicine_id: newPkg.medicine_id,
        variant_id: newPkg.variant_id,
        package_id: newPkg.id,
        decision_by: context.userId,
        decision_at: new Date().toISOString(),
        decision_note: data.note?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    const medLabel = (newPkg as any).medicines?.name ?? "the new medication";

    if (crossCategory) {
      await logEvent(
        supabaseAdmin,
        req.id,
        "category_changed",
        role,
        context.userId,
        `Switched to a different treatment category (${medLabel}). Reason: ${data.crossCategoryReason}`,
      );
      await supabaseAdmin.from("medication_request_notes").insert({
        request_id: req.id,
        author_id: context.userId,
        author_role: role,
        body: `Category change → ${medLabel}. Clinical reason: ${data.crossCategoryReason}`,
      });
    }

    if (deltaCents > 0) {
      // More expensive: collect the current-cycle difference before the prescription is generated.
      await supabaseAdmin.from("additional_payments").insert({
        request_id: req.id,
        user_id: req.user_id,
        amount_cents: deltaCents,
        currency: "usd",
        reason: `Price difference for changing to ${medLabel}`,
        from_package_id: req.package_id,
        to_package_id: newPkg.id,
        status: "pending",
      });
      await supabaseAdmin
        .from("medication_requests")
        .update({ status: "awaiting_additional_payment", updated_at: new Date().toISOString() })
        .eq("id", req.id);
      await logEvent(
        supabaseAdmin,
        req.id,
        "awaiting_additional_payment",
        role,
        context.userId,
        `Changed to ${medLabel}; additional $${(deltaCents / 100).toFixed(2)} due.`,
      );
      return { ok: true, delta_cents: deltaCents, status: "awaiting_additional_payment" };
    }

    if (deltaCents < 0 && sub?.stripe_customer_id) {
      // Cheaper: credit the difference to the customer balance so it settles the next invoice.
      try {
        await stripe.customers.createBalanceTransaction(sub.stripe_customer_id, {
          amount: deltaCents, // negative = credit toward future invoices
          currency: "usd",
          description: `Credit for changing to ${medLabel} (settles next cycle)`,
        });
      } catch (e) {
        console.error("[requests] customer balance credit failed:", e);
      }
    }

    // Same price or cheaper: the change is approved immediately.
    await supabaseAdmin
      .from("medication_requests")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", req.id);
    await logEvent(
      supabaseAdmin,
      req.id,
      "approved",
      role,
      context.userId,
      deltaCents < 0
        ? `Changed to ${medLabel}; $${(Math.abs(deltaCents) / 100).toFixed(2)} credited next cycle.`
        : `Changed to ${medLabel}.`,
    );
    return { ok: true, delta_cents: deltaCents, status: "approved" };
  });

export const generatePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        directions: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await assertReviewer(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const req = await loadScopedRequest(
      supabaseAdmin,
      data.requestId,
      role,
      context.userId,
      "id, status, provider_id, user_id, medicine_id, variant_id, package_id",
    );
    if (req.status !== "approved") {
      throw new Error(
        req.status === "awaiting_additional_payment"
          ? "The additional payment must be completed before generating the prescription."
          : `Cannot generate a prescription for a request that is ${req.status}.`,
      );
    }

    const { data: pendingPay } = await supabaseAdmin
      .from("additional_payments")
      .select("id")
      .eq("request_id", req.id)
      .eq("status", "pending")
      .maybeSingle();
    if (pendingPay) {
      throw new Error("An additional payment is still pending for this order.");
    }

    const { data: med } = req.medicine_id
      ? await supabaseAdmin.from("medicines").select("name").eq("id", req.medicine_id).maybeSingle()
      : { data: null };

    const { data: rx, error } = await supabaseAdmin
      .from("prescriptions")
      .insert({
        request_id: req.id,
        user_id: req.user_id,
        provider_id: req.provider_id,
        medicine_id: req.medicine_id,
        variant_id: req.variant_id,
        package_id: req.package_id,
        medicine_name: (med as any)?.name ?? "Medication",
        directions: data.directions?.trim() || null,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("medication_requests")
      .update({ status: "prescribed", updated_at: new Date().toISOString() })
      .eq("id", req.id);
    await logEvent(supabaseAdmin, req.id, "prescribed", role, context.userId);

    return { ok: true, prescription_id: rx?.id ?? null };
  });

// Admin-only manual assignment. Used when a provider is licensed in the patient's state, so the
// order is created unassigned and the admin routes it to the right provider.
export const assignRequestProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ requestId: z.string().uuid(), providerId: z.string().uuid().nullable() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("medication_requests")
      .update({ provider_id: data.providerId, updated_at: new Date().toISOString() })
      .eq("id", data.requestId);
    if (error) throw new Error(error.message);
    if (data.providerId) {
      await logEvent(
        supabaseAdmin,
        data.requestId,
        "provider_assigned",
        "admin",
        context.userId,
        "Provider assigned by admin",
      );
    }
    return { ok: true };
  });

export const getPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ prescriptionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await assertReviewer(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rx } = await supabaseAdmin
      .from("prescriptions")
      .select("id, user_id, provider_id, medicine_name, directions, created_at")
      .eq("id", data.prescriptionId)
      .maybeSingle();
    if (!rx) throw new Error("Prescription not found.");
    if (role === "provider" && rx.provider_id !== context.userId) throw new Error("Forbidden");

    const [patientRes, provRes] = await Promise.all([
      rx.user_id
        ? supabaseAdmin.from("profiles").select("full_name").eq("id", rx.user_id).maybeSingle()
        : Promise.resolve({ data: null }),
      rx.provider_id
        ? supabaseAdmin.from("profiles").select("full_name").eq("id", rx.provider_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      id: rx.id,
      medicineName: rx.medicine_name,
      directions: rx.directions,
      createdAt: rx.created_at,
      patientName: (patientRes.data as { full_name?: string } | null)?.full_name ?? "Patient",
      providerName: (provRes.data as { full_name?: string } | null)?.full_name ?? null,
    };
  });

const FULFILLMENT_STATUSES = ["sent_to_pharmacy", "dispatched", "delivered", "cancelled"] as const;

export const advanceRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        status: z.enum(FULFILLMENT_STATUSES),
        trackingNumber: z.string().trim().max(200).optional(),
        note: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await assertReviewer(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const req = await loadScopedRequest(
      supabaseAdmin,
      data.requestId,
      role,
      context.userId,
      "id, status, provider_id",
    );

    const update: { status: string; updated_at: string; tracking_number?: string | null } = {
      status: data.status,
      updated_at: new Date().toISOString(),
    };
    if (data.trackingNumber !== undefined) update.tracking_number = data.trackingNumber || null;

    const { error } = await supabaseAdmin
      .from("medication_requests")
      .update(update)
      .eq("id", req.id);
    if (error) throw new Error(error.message);

    await logEvent(
      supabaseAdmin,
      req.id,
      data.status,
      role,
      context.userId,
      data.note?.trim() || (data.trackingNumber ? `Tracking: ${data.trackingNumber}` : null),
    );
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Clinical notes (internal): visible to admins and to the assigned practitioner.
// ---------------------------------------------------------------------------

export const listRequestNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ requestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const role = await assertReviewer(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await loadScopedRequest(supabaseAdmin, data.requestId, role, context.userId, "id, provider_id");

    const { data: rows, error } = await supabaseAdmin
      .from("medication_request_notes")
      .select("id, body, author_id, author_role, created_at")
      .eq("request_id", data.requestId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const authorIds = Array.from(
      new Set(((rows ?? []) as any[]).map((r) => r.author_id).filter(Boolean)),
    );
    const { data: profiles } = authorIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] as any[] };
    const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

    return ((rows ?? []) as any[]).map((r) => ({
      id: r.id,
      body: r.body,
      author_role: r.author_role,
      author_name: nameMap.get(r.author_id) ?? "Team member",
      is_mine: r.author_id === context.userId,
      created_at: r.created_at,
    }));
  });

export const addRequestNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ requestId: z.string().uuid(), body: z.string().trim().min(1).max(4000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const role = await assertReviewer(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await loadScopedRequest(supabaseAdmin, data.requestId, role, context.userId, "id, provider_id");

    const { error } = await supabaseAdmin.from("medication_request_notes").insert({
      request_id: data.requestId,
      author_id: context.userId,
      author_role: role,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
