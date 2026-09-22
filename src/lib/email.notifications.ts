/**
 * Domain helpers for Body Inc transactional emails.
 * Import only from server functions (lazy-import the Brevo client).
 */

import type { EmailTemplateKey } from "@/lib/email.templates";

export type ProfileContact = { email: string; name: string | null };

export async function resolveProfileContact(
  supabaseAdmin: any,
  userId: string | null | undefined,
): Promise<ProfileContact | null> {
  if (!userId) return null;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();
  const email = (data as { email?: string | null } | null)?.email?.trim();
  if (!email) return null;
  return {
    email,
    name: (data as { full_name?: string | null } | null)?.full_name ?? null,
  };
}

export async function resolveMedicineName(
  supabaseAdmin: any,
  medicineId: string | null | undefined,
): Promise<string> {
  if (!medicineId) return "your medication";
  const { data } = await supabaseAdmin
    .from("medicines")
    .select("name")
    .eq("id", medicineId)
    .maybeSingle();
  return (data as { name?: string } | null)?.name?.trim() || "your medication";
}

type NotifyOpts = {
  supabaseAdmin: any;
  userId: string | null | undefined;
  template: EmailTemplateKey;
  params?: Record<string, string | number | boolean | null | undefined>;
};

/** Resolve contact + send email. Never throws. Returns whether Brevo accepted the message. */
export async function notifyUserById(opts: NotifyOpts): Promise<boolean> {
  try {
    const contact = await resolveProfileContact(opts.supabaseAdmin, opts.userId);
    if (!contact) {
      console.warn(`[email] no contact for user ${opts.userId}; skip ${opts.template}`);
      return false;
    }
    const { sendTransactionalEmail } = await import("@/integrations/brevo/client.server");
    const result = await sendTransactionalEmail({
      to: { email: contact.email, name: contact.name },
      template: opts.template,
      params: {
        FIRSTNAME: contact.name?.split(/\s+/)[0] ?? "",
        FULLNAME: contact.name ?? "",
        ...opts.params,
      },
    });
    if (!result.ok) {
      if (result.skipped) {
        console.warn(`[brevo] skipped ${opts.template}: ${result.reason}`);
      } else {
        console.error(`[brevo] ${opts.template} failed: ${result.error}`);
      }
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[email] notifyUserById ${opts.template} failed:`, e);
    return false;
  }
}

const PATIENT_TEMPLATE_STATUS: Partial<Record<EmailTemplateKey, string>> = {
  patient_approved: "approved",
  patient_rejected: "rejected",
  patient_additional_payment: "awaiting_additional_payment",
  patient_prescription_ready: "prescribed",
  patient_sent_to_pharmacy: "sent_to_pharmacy",
  patient_shipped: "dispatched",
  patient_delivered: "delivered",
  patient_provider_assigned: "provider_assigned",
};

/** Must match patient-portal `sendUnsentOrderStatusEmails` claim keys. */
const PATIENT_STATUS_REMINDER = "order_status";

function patientStatusClaim(template: EmailTemplateKey, requestId: string): {
  targetId: string;
  periodKey: string;
} {
  const status = PATIENT_TEMPLATE_STATUS[template];
  if (status) return { targetId: requestId, periodKey: status };
  return { targetId: requestId, periodKey: template };
}

async function claimPatientOrderEmail(
  supabaseAdmin: any,
  targetId: string,
  periodKey: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin.from("email_reminders").insert({
    reminder_type: PATIENT_STATUS_REMINDER,
    target_id: targetId,
    period_key: periodKey,
  });
  if (!error) return true;
  if (error.code === "23505") return false;
  console.error(`[email] failed to claim ${PATIENT_STATUS_REMINDER}/${targetId}: ${error.message}`);
  return false;
}

async function releasePatientOrderEmail(
  supabaseAdmin: any,
  targetId: string,
  periodKey: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("email_reminders")
    .delete()
    .eq("reminder_type", PATIENT_STATUS_REMINDER)
    .eq("target_id", targetId)
    .eq("period_key", periodKey);
  if (error) {
    console.error(`[email] failed to release ${PATIENT_STATUS_REMINDER}/${targetId}: ${error.message}`);
  }
}

export async function notifyPatientRequestEvent(opts: {
  supabaseAdmin: any;
  request: {
    id: string;
    user_id?: string | null;
    medicine_id?: string | null;
    tracking_number?: string | null;
  };
  template: EmailTemplateKey;
  extraParams?: Record<string, string | number | boolean | null | undefined>;
}): Promise<boolean> {
  const claim = patientStatusClaim(opts.template, opts.request.id);
  if (!(await claimPatientOrderEmail(opts.supabaseAdmin, claim.targetId, claim.periodKey))) {
    return true;
  }

  const medicineName = await resolveMedicineName(opts.supabaseAdmin, opts.request.medicine_id);
  const sent = await notifyUserById({
    supabaseAdmin: opts.supabaseAdmin,
    userId: opts.request.user_id,
    template: opts.template,
    params: {
      ORDER_ID: opts.request.id,
      MEDICINE_NAME: medicineName,
      TRACKING_NUMBER: opts.request.tracking_number ?? "",
      PORTAL_URL: process.env.PATIENT_PORTAL_URL?.replace(/\/$/, "") ?? "",
      ...opts.extraParams,
    },
  });
  if (sent) return true;
  await releasePatientOrderEmail(opts.supabaseAdmin, claim.targetId, claim.periodKey);
  return false;
}

export async function notifyProviderRequestEvent(opts: {
  supabaseAdmin: any;
  providerId: string | null | undefined;
  requestId: string;
  medicineId?: string | null;
  template: EmailTemplateKey;
  /** When set, skip email (provider claimed / acted themselves). */
  actorUserId?: string | null;
  extraParams?: Record<string, string | number | boolean | null | undefined>;
}): Promise<void> {
  if (!opts.providerId) return;
  if (opts.actorUserId && opts.actorUserId === opts.providerId) return;

  const medicineName = await resolveMedicineName(opts.supabaseAdmin, opts.medicineId);
  const providerPortal =
    process.env.PROVIDER_PORTAL_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "";

  await notifyUserById({
    supabaseAdmin: opts.supabaseAdmin,
    userId: opts.providerId,
    template: opts.template,
    params: {
      ORDER_ID: opts.requestId,
      MEDICINE_NAME: medicineName,
      REQUEST_URL: providerPortal
        ? `${providerPortal}/provider/requests/${opts.requestId}`
        : `/provider/requests/${opts.requestId}`,
      ...opts.extraParams,
    },
  });
}

/** Email every admin when a provider clinically approves an order (ready for pharmacy send). */
export async function notifyAdminsProviderApproved(opts: {
  supabaseAdmin: any;
  requestId: string;
  medicineId?: string | null;
  providerId?: string | null;
  patientUserId?: string | null;
}): Promise<number> {
  try {
    const { data: roleRows } = await opts.supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = Array.from(
      new Set(((roleRows ?? []) as { user_id: string }[]).map((r) => r.user_id).filter(Boolean)),
    );
    if (adminIds.length === 0) return 0;

    const medicineName = await resolveMedicineName(opts.supabaseAdmin, opts.medicineId);
    const [provider, patient] = await Promise.all([
      resolveProfileContact(opts.supabaseAdmin, opts.providerId),
      resolveProfileContact(opts.supabaseAdmin, opts.patientUserId),
    ]);

    const adminPortal =
      process.env.ADMIN_APP_URL?.replace(/\/$/, "") ||
      process.env.APP_URL?.replace(/\/$/, "") ||
      "https://admin.bodyinc.com";

    let sentCount = 0;
    for (const adminId of adminIds) {
      const ok = await notifyUserById({
        supabaseAdmin: opts.supabaseAdmin,
        userId: adminId,
        template: "admin_provider_approved",
        params: {
          ORDER_ID: opts.requestId,
          MEDICINE_NAME: medicineName,
          PROVIDER_NAME: provider?.name ?? "Provider",
          PATIENT_NAME: patient?.name ?? "Patient",
          REQUEST_URL: `${adminPortal}/admin/requests/${opts.requestId}`,
        },
      });
      if (ok) sentCount += 1;
    }
    return sentCount;
  } catch (e) {
    console.error("[email] notifyAdminsProviderApproved failed:", e);
    return 0;
  }
}

const NEW_FEEDBACK_REMINDER = "admin_new_feedback";

async function listAdminUserIds(supabaseAdmin: any): Promise<string[]> {
  const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
  return Array.from(
    new Set(((roleRows ?? []) as { user_id: string }[]).map((r) => r.user_id).filter(Boolean)),
  );
}

function adminPortalBase(): string {
  return (
    process.env.ADMIN_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "https://admin.bodyinc.com"
  );
}

/** Email every admin when a patient submits new feedback. */
export async function notifyAdminsNewFeedback(opts: {
  supabaseAdmin: any;
  feedback: {
    id: string;
    full_name?: string | null;
    email?: string | null;
    message: string;
    category?: string | null;
  };
}): Promise<number> {
  try {
    const adminIds = await listAdminUserIds(opts.supabaseAdmin);
    if (adminIds.length === 0) return 0;

    const patientName = opts.feedback.full_name?.trim() || "A patient";
    const category = opts.feedback.category?.trim() || "inquiry";
    let sentCount = 0;
    for (const adminId of adminIds) {
      const ok = await notifyUserById({
        supabaseAdmin: opts.supabaseAdmin,
        userId: adminId,
        template: "admin_new_feedback",
        params: {
          PATIENT_NAME: patientName,
          PATIENT_EMAIL: opts.feedback.email ?? "",
          CATEGORY: category,
          MESSAGE: opts.feedback.message,
          FEEDBACK_URL: `${adminPortalBase()}/admin/feedback`,
        },
      });
      if (ok) sentCount += 1;
    }
    return sentCount;
  } catch (e) {
    console.error("[email] notifyAdminsNewFeedback failed:", e);
    return 0;
  }
}

async function claimNewFeedbackEmail(supabaseAdmin: any, feedbackId: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from("email_reminders").insert({
    reminder_type: NEW_FEEDBACK_REMINDER,
    target_id: feedbackId,
    period_key: "",
  });
  if (!error) return true;
  if (error.code === "23505") return false;
  console.error("[email] claim admin_new_feedback failed:", error.message);
  return false;
}

export async function notifyNewFeedbackIfNeeded(
  supabaseAdmin: any,
  feedbackId: string,
): Promise<boolean> {
  const { data: row, error } = await supabaseAdmin
    .from("patient_feedback")
    .select("id, email, full_name, message, category")
    .eq("id", feedbackId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return false;
  if (!(await claimNewFeedbackEmail(supabaseAdmin, feedbackId))) return true;
  await notifyAdminsNewFeedback({ supabaseAdmin, feedback: row });
  return true;
}

/** Send admin emails for any new feedback that has not been notified yet. */
export async function dispatchPendingNewFeedbackEmails(supabaseAdmin: any): Promise<void> {
  try {
    const { data: rows } = await supabaseAdmin
      .from("patient_feedback")
      .select("id, email, full_name, message, category")
      .gte("created_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(40);
    if (!rows?.length) return;

    const ids = rows.map((r: { id: string }) => r.id);
    const { data: sent } = await supabaseAdmin
      .from("email_reminders")
      .select("target_id")
      .eq("reminder_type", NEW_FEEDBACK_REMINDER)
      .in("target_id", ids);
    const sentSet = new Set(((sent ?? []) as { target_id: string }[]).map((s) => s.target_id));

    for (const row of rows as Array<{
      id: string;
      email: string | null;
      full_name: string | null;
      message: string;
      category: string | null;
    }>) {
      if (sentSet.has(row.id)) continue;
      if (!(await claimNewFeedbackEmail(supabaseAdmin, row.id))) continue;
      await notifyAdminsNewFeedback({ supabaseAdmin, feedback: row });
    }
  } catch (e) {
    console.error("[email] dispatchPendingNewFeedbackEmails failed:", e);
  }
}
