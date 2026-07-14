import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-guard";


// The confirmation_secret API flow does not store a payment_intent on our payments row
// nor embed one on the invoice directly — it lives under invoice.payments[].payment.
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

function invoiceUrls(rawEvent: any): { invoiceUrl: string | null; invoicePdfUrl: string | null } {
  if (!rawEvent || typeof rawEvent !== "object") {
    return { invoiceUrl: null, invoicePdfUrl: null };
  }
  return {
    invoiceUrl: typeof rawEvent.hosted_invoice_url === "string" ? rawEvent.hosted_invoice_url : null,
    invoicePdfUrl: typeof rawEvent.invoice_pdf === "string" ? rawEvent.invoice_pdf : null,
  };
}

const listInput = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.string().trim().max(40).optional(),
  })
  .default({});

export const listSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("subscriptions")
      .select(
        "id, user_id, stripe_subscription_id, package_id, medicine_id, status, current_period_end, cancel_at_period_end, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);

    if (data.status && data.status !== "all") {
      q = q.eq("status", data.status);
    } else {
      q = q.not("status", "in", "(incomplete,incomplete_expired)");
    }

    const { data: subs, error } = await q;
    if (error) throw new Error(error.message);
    const rows = subs ?? [];

    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean)));
    const pkgIds = Array.from(new Set(rows.map((r: any) => r.package_id).filter(Boolean)));
    const medIds = Array.from(new Set(rows.map((r: any) => r.medicine_id).filter(Boolean)));
    const subKeys = rows.map((r: any) => r.id);

    const [{ data: profiles }, { data: pkgs }, { data: meds }, { data: feedback }] =
      await Promise.all([
        userIds.length
          ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
        pkgIds.length
          ? supabaseAdmin.from("packages").select("id, name, price").in("id", pkgIds)
          : Promise.resolve({ data: [] as any[] }),
        medIds.length
          ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
          : Promise.resolve({ data: [] as any[] }),
        subKeys.length
          ? supabaseAdmin
              .from("subscription_cancellation_feedback")
              .select("subscription_id, reasons, other_text")
              .in("subscription_id", subKeys)
          : Promise.resolve({ data: [] as any[] }),
      ]);

    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const pkgMap = new Map((pkgs ?? []).map((p: any) => [p.id, p]));
    const medMap = new Map((meds ?? []).map((m: any) => [m.id, m]));
    const fbMap = new Map((feedback ?? []).map((f: any) => [f.subscription_id, f]));

    let result = rows.map((r: any) => {
      const p = pMap.get(r.user_id) as any;
      const pkg = pkgMap.get(r.package_id) as any;
      const med = medMap.get(r.medicine_id) as any;
      const fb = fbMap.get(r.id) as any;
      return {
        id: r.id,
        customer_name: p?.full_name ?? null,
        customer_email: p?.email ?? null,
        plan_name: [med?.name, pkg?.name].filter(Boolean).join(" — ") || "—",
        amount: pkg?.price != null ? Number(pkg.price) : null,
        status: r.status,
        current_period_end: r.current_period_end,
        cancel_at_period_end: r.cancel_at_period_end,
        cancellation_reasons: fb?.reasons ?? null,
        cancellation_note: fb?.other_text ?? null,
        created_at: r.created_at,
      };
    });

    if (data.search) {
      const s = data.search.toLowerCase();
      result = result.filter(
        (r: any) =>
          (r.customer_name ?? "").toLowerCase().includes(s) ||
          (r.customer_email ?? "").toLowerCase().includes(s) ||
          (r.plan_name ?? "").toLowerCase().includes(s),
      );
    }
    return result;
  });

export const listRefunds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("refund_requests")
      .select(
        "id, user_id, payment_id, amount_cents, reason, status, admin_note, stripe_refund_id, reviewed_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300);

    if (data.status && data.status !== "all") {
      q = q.eq("status", data.status);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const requests = rows ?? [];

    const userIds = Array.from(new Set(requests.map((r: any) => r.user_id).filter(Boolean)));
    const payIds = Array.from(new Set(requests.map((r: any) => r.payment_id).filter(Boolean)));

    const [{ data: profiles }, { data: payments }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      payIds.length
        ? supabaseAdmin
            .from("payments")
            .select("id, stripe_invoice_id, raw_event")
            .in("id", payIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const payMap = new Map((payments ?? []).map((p: any) => [p.id, p]));

    let result = requests.map((r: any) => {
      const p = pMap.get(r.user_id) as any;
      const pay = payMap.get(r.payment_id) as any;
      const { invoiceUrl, invoicePdfUrl } = invoiceUrls(pay?.raw_event);
      return {
        id: r.id,
        customer_name: p?.full_name ?? null,
        customer_email: p?.email ?? null,
        amount: Number(r.amount_cents) / 100,
        reason: r.reason,
        status: r.status,
        admin_note: r.admin_note,
        stripe_refund_id: r.stripe_refund_id,
        invoice_url: invoiceUrl,
        invoice_pdf_url: invoicePdfUrl,
        reviewed_at: r.reviewed_at,
        created_at: r.created_at,
      };
    });

    if (data.search) {
      const s = data.search.toLowerCase();
      result = result.filter(
        (r: any) =>
          (r.customer_name ?? "").toLowerCase().includes(s) ||
          (r.customer_email ?? "").toLowerCase().includes(s) ||
          (r.reason ?? "").toLowerCase().includes(s),
      );
    }
    return result;
  });

export const approveRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getStripe } = await import("@/integrations/stripe/client.server");
    const stripe = getStripe();

    const { data: req, error } = await supabaseAdmin
      .from("refund_requests")
      .select("id, payment_id, status, amount_cents")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Refund request not found");
    if (req.status !== "pending") throw new Error("This request has already been resolved.");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("id, stripe_payment_intent_id, stripe_invoice_id")
      .eq("id", req.payment_id)
      .maybeSingle();
    if (!payment) throw new Error("Payment not found for this request.");

    const paymentIntentId = await resolvePaymentIntentForPayment(stripe, payment);
    if (!paymentIntentId) {
      throw new Error(
        "Could not resolve the Stripe charge for this payment; refund it from the Stripe dashboard.",
      );
    }

    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });

    // Backfill so the charge.refunded webhook (which matches on payment_intent) can reconcile.
    if (!payment.stripe_payment_intent_id) {
      await supabaseAdmin
        .from("payments")
        .update({ stripe_payment_intent_id: paymentIntentId })
        .eq("id", payment.id);
    }

    await supabaseAdmin
      .from("refund_requests")
      .update({
        status: "approved",
        stripe_refund_id: refund.id,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    await supabaseAdmin.from("payments").update({ status: "refunded" }).eq("id", payment.id);

    return { ok: true, stripe_refund_id: refund.id };
  });

export const rejectRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), note: z.string().trim().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error } = await supabaseAdmin
      .from("refund_requests")
      .select("id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Refund request not found");
    if (req.status !== "pending") throw new Error("This request has already been resolved.");

    const { error: updateError } = await supabaseAdmin
      .from("refund_requests")
      .update({
        status: "rejected",
        admin_note: data.note?.trim() || null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (updateError) throw new Error(updateError.message);

    return { ok: true };
  });
