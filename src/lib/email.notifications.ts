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

/** Resolve contact + queue email. Never throws. */
export async function notifyUserById(opts: NotifyOpts): Promise<void> {
  try {
    const contact = await resolveProfileContact(opts.supabaseAdmin, opts.userId);
    if (!contact) {
      console.warn(`[email] no contact for user ${opts.userId}; skip ${opts.template}`);
      return;
    }
    const { queueTransactionalEmail } = await import("@/integrations/brevo/client.server");
    queueTransactionalEmail({
      to: { email: contact.email, name: contact.name },
      template: opts.template,
      params: {
        FIRSTNAME: contact.name?.split(/\s+/)[0] ?? "",
        FULLNAME: contact.name ?? "",
        ...opts.params,
      },
    });
  } catch (e) {
    console.error(`[email] notifyUserById ${opts.template} failed:`, e);
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
}): Promise<void> {
  const medicineName = await resolveMedicineName(opts.supabaseAdmin, opts.request.medicine_id);
  await notifyUserById({
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
