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
};

async function latestEventId(
  supabaseAdmin: any,
  requestId: string,
  template: EmailTemplateKey,
): Promise<string | null> {
  const status = PATIENT_TEMPLATE_STATUS[template];
  if (!status) return null;
  const { data: ev } = await supabaseAdmin
    .from("medication_request_events")
    .select("id")
    .eq("request_id", requestId)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ev?.id ?? null;
}

async function patientOrderEmailAlreadySent(
  supabaseAdmin: any,
  requestId: string,
  template: EmailTemplateKey,
): Promise<boolean> {
  const eventId = await latestEventId(supabaseAdmin, requestId, template);
  if (!eventId) return false;
  const { data } = await supabaseAdmin
    .from("email_reminders")
    .select("target_id")
    .eq("reminder_type", "order_status")
    .eq("target_id", eventId)
    .eq("period_key", "")
    .maybeSingle();
  return Boolean(data);
}

async function markPatientOrderEmailSent(
  supabaseAdmin: any,
  requestId: string,
  template: EmailTemplateKey,
): Promise<void> {
  const eventId = await latestEventId(supabaseAdmin, requestId, template);
  if (!eventId) return;
  const { error } = await supabaseAdmin.from("email_reminders").insert({
    reminder_type: "order_status",
    target_id: eventId,
    period_key: "",
  });
  if (error && error.code !== "23505") {
    console.error(`[email] failed to record ${template}/${eventId}: ${error.message}`);
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
  if (await patientOrderEmailAlreadySent(opts.supabaseAdmin, opts.request.id, opts.template)) {
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
  if (sent) {
    await markPatientOrderEmailSent(opts.supabaseAdmin, opts.request.id, opts.template);
    return true;
  }
  // Patient portal may already have delivered this status email even if admin Brevo failed.
  return patientOrderEmailAlreadySent(opts.supabaseAdmin, opts.request.id, opts.template);
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
