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

/** Every medicine bought in the same checkout, in one label. A single line stays a single name. */
async function medicineLabelForOrder(
  supabaseAdmin: any,
  rows: Array<{ id?: string | null; medicine_id?: string | null; order_group_id?: string | null }>,
): Promise<{ label: string; requestIds: string[] }> {
  let source = rows;
  const idsToLoad = rows.map((row) => row.id).filter((id): id is string => Boolean(id) && !rows.some((row) => row.id === id && row.order_group_id));
  if (idsToLoad.length) {
    const { data, error } = await supabaseAdmin
      .from("medication_requests")
      .select("id, medicine_id, order_group_id")
      .in("id", idsToLoad);
    if (!error && data?.length) {
      const loaded = new Map((data as Array<{ id: string; medicine_id: string | null; order_group_id: string | null }>).map((row) => [row.id, row]));
      source = rows.map((row) => (row.id && loaded.get(row.id)) || row);
    }
  }
  const groupIds = [...new Set(source.map((row) => row.order_group_id).filter(Boolean))] as string[];
  let members = source.map((row) => ({ id: row.id ?? null, medicine_id: row.medicine_id ?? null }));
  if (groupIds.length) {
    const { data, error } = await supabaseAdmin
      .from("medication_requests")
      .select("id, medicine_id")
      .in("order_group_id", groupIds);
    if (!error && data?.length) {
      members = data as Array<{ id: string; medicine_id: string | null }>;
    }
  }
  const medicineIds = [...new Set(members.map((row) => row.medicine_id).filter(Boolean))] as string[];
  const names = [
    ...new Set(
      (await Promise.all(medicineIds.map((id) => resolveMedicineName(supabaseAdmin, id))))
        .map((name) => name.trim())
        .filter((name) => name && name !== "your medication"),
    ),
  ];
  return {
    label: names.join(", ") || "a treatment",
    requestIds: members.map((row) => row.id).filter((id): id is string => Boolean(id)),
  };
}

function addonPackageCount(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const obj = raw as {
    parent?: { subscription_details?: { metadata?: Record<string, string> | null } };
    subscription_details?: { metadata?: Record<string, string> | null };
    lines?: { data?: Array<{ metadata?: Record<string, string> | null }> };
  };
  const metas = [
    obj.parent?.subscription_details?.metadata,
    obj.subscription_details?.metadata,
    ...(obj.lines?.data ?? []).map((line) => line?.metadata),
  ];
  for (const meta of metas) {
    const rawIds = meta?.addon_package_ids;
    if (typeof rawIds === "string" && rawIds.trim()) {
      return rawIds.split(",").map((id) => id.trim()).filter(Boolean).length;
    }
  }
  return 0;
}

/** Primary checkout mail can fire before add-on orders are written. Hold it briefly. */
async function checkoutLinesStillArriving(
  supabaseAdmin: any,
  requestIds: string[],
): Promise<boolean> {
  if (!requestIds.length) return false;
  const { data, error } = await supabaseAdmin
    .from("medication_requests")
    .select("id, payment_id, created_at, order_group_id")
    .in("id", requestIds);
  if (error || !data?.length) return false;

  const now = Date.now();
  const holdMs = 3 * 60 * 1000;
  const byGroup = new Map<string, Array<{ payment_id?: string | null; created_at?: string | null }>>();
  for (const row of data as Array<{
    payment_id?: string | null;
    created_at?: string | null;
    order_group_id?: string | null;
    id: string;
  }>) {
    const key = row.order_group_id || row.id;
    const list = byGroup.get(key) ?? [];
    list.push(row);
    byGroup.set(key, list);
  }

  for (const members of byGroup.values()) {
    const newest = Math.max(
      ...members.map((row) => new Date(row.created_at ?? 0).getTime()),
    );
    if (!Number.isFinite(newest) || now - newest > holdMs) continue;
    const paymentIds = [...new Set(members.map((row) => row.payment_id).filter(Boolean))] as string[];
    if (!paymentIds.length) continue;
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("raw_event")
      .in("id", paymentIds);
    const expectedAddons = Math.max(
      0,
      ...(payments ?? []).map((pay: { raw_event?: unknown }) => addonPackageCount(pay.raw_event)),
    );
    if (expectedAddons > 0 && members.length < 1 + expectedAddons) return true;
  }
  return false;
}

/** Copied on every admin notification. Not added to patient or provider mail. */
const ADMIN_EMAIL_CC = "parth@appsrow.com";

const DEFAULT_PROVIDER_PORTAL = "https://provider.bodyinc.com";

/** Absolute provider site. A relative or localhost link makes the email button open a missing page. */
function providerPortalOrigin(): string {
  const configured = (process.env.PROVIDER_APP_URL || process.env.PROVIDER_PORTAL_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (
    /^https?:\/\//i.test(configured) &&
    !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configured)
  ) {
    return configured;
  }
  return DEFAULT_PROVIDER_PORTAL;
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
      ...(opts.template.startsWith("admin_") ? { cc: { email: ADMIN_EMAIL_CC } } : {}),
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

  const medicineName =
    opts.template === "patient_provider_assigned"
      ? await (async () => {
          const { label } = await medicineLabelForOrder(opts.supabaseAdmin, [
            { id: opts.request.id, medicine_id: opts.request.medicine_id },
          ]);
          return label === "a treatment" ? "your medication" : label;
        })()
      : await resolveMedicineName(opts.supabaseAdmin, opts.request.medicine_id);
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

export function medicineChangeMailLinks(requestId: string, kind: "payment" | "consent") {
  const portalBase = process.env.PATIENT_PORTAL_URL?.replace(/\/$/, "") ?? "";
  if (!portalBase) return { PORTAL_URL: "", SECONDARY_URL: "" };
  const review = `${portalBase}/orders/${requestId}`;
  if (kind === "payment") {
    return { PORTAL_URL: `${review}/pay`, SECONDARY_URL: `${review}?action=decline` };
  }
  return {
    PORTAL_URL: `${review}?action=approve`,
    SECONDARY_URL: `${review}?action=reject`,
  };
}

/** One reminder, 24 hours after the change. Does not reuse the original plan-change email claim. */
export async function remindPatientOfPlanChange(opts: {
  supabaseAdmin: any;
  request: { id: string; user_id?: string | null; medicine_id?: string | null };
}): Promise<boolean> {
  const targetId = opts.request.id;
  const periodKey = "plan_change_reminder";
  if (!(await claimPatientOrderEmail(opts.supabaseAdmin, targetId, periodKey))) return false;
  const { data: row } = await opts.supabaseAdmin
    .from("medication_requests")
    .select("plan_change_token, plan_change_delta_cents, medicine_id, user_id")
    .eq("id", opts.request.id)
    .maybeSingle();
  const delta = Number(row?.plan_change_delta_cents ?? 0);
  const amount = Math.max(delta, 0);
  const waitingForConsent = amount <= 0 && Boolean(row?.plan_change_token);
  if (amount <= 0 && !waitingForConsent) {
    await releasePatientOrderEmail(opts.supabaseAdmin, targetId, periodKey);
    return false;
  }
  const medicineName = await resolveMedicineName(
    opts.supabaseAdmin,
    row?.medicine_id ?? opts.request.medicine_id,
  );
  const links = medicineChangeMailLinks(
    opts.request.id,
    waitingForConsent ? "consent" : "payment",
  );
  const sent = await notifyUserById({
    supabaseAdmin: opts.supabaseAdmin,
    userId: row?.user_id ?? opts.request.user_id,
    template: waitingForConsent ? "patient_plan_consent" : "patient_additional_payment",
    params: {
      ORDER_ID: opts.request.id,
      MEDICINE_NAME: medicineName,
      AMOUNT_DUE: (amount / 100).toFixed(2),
      CREDIT_AMOUNT: delta < 0 ? (Math.abs(delta) / 100).toFixed(2) : "0.00",
      IS_REMINDER: "1",
      PORTAL_URL: links.PORTAL_URL,
      SECONDARY_URL: links.SECONDARY_URL,
    },
  });
  if (sent) return true;
  await releasePatientOrderEmail(opts.supabaseAdmin, targetId, periodKey);
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

  const { data: orderRow } = await opts.supabaseAdmin
    .from("medication_requests")
    .select("id, medicine_id, order_group_id, user_id")
    .eq("id", opts.requestId)
    .maybeSingle();
  const medicineName = (
    await medicineLabelForOrder(opts.supabaseAdmin, [
      orderRow ?? { id: opts.requestId, medicine_id: opts.medicineId ?? null },
    ])
  ).label;
  const providerPortal = providerPortalOrigin();
  const patient = await resolveProfileContact(opts.supabaseAdmin, orderRow?.user_id);
  let patientName = patient?.name?.trim() || "";
  if (!patientName && orderRow?.user_id) {
    const { data: nameRow } = await opts.supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", orderRow.user_id)
      .maybeSingle();
    patientName = (nameRow as { full_name?: string | null } | null)?.full_name?.trim() || "";
  }

  await notifyUserById({
    supabaseAdmin: opts.supabaseAdmin,
    userId: opts.providerId,
    template: opts.template,
    params: {
      ORDER_ID: opts.requestId,
      PATIENT_NAME: patientName || "A patient",
      REQUEST_URL: `${providerPortal}/provider/requests/${opts.requestId}`,
      ...opts.extraParams,
      MEDICINE_NAME: medicineName,
    },
  });
}

const CLAIM_READY_STATUSES = [
  "payment_completed",
  "provider_assigned",
  "pending_review",
  "awaiting_additional_payment",
  "approved",
  "prescribed",
];

const CLAIM_OFFER = "provider_claim_offer";
const CLAIM_OFFER_PERIOD = "ready";
const CLAIM_PAGE = 80;
const CLAIM_PAGES = 4;

async function releaseClaimOffer(supabaseAdmin: any, ids: string[]): Promise<void> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return;
  const { error } = await supabaseAdmin
    .from("email_reminders")
    .delete()
    .eq("reminder_type", CLAIM_OFFER)
    .eq("period_key", CLAIM_OFFER_PERIOD)
    .in("target_id", unique);
  if (error) console.warn("[email] release claim offer failed:", error.message);
}

/** Newest unassigned orders, including ones past the first page that were never mailed. */
async function loadClaimCandidates(supabaseAdmin: any): Promise<any[]> {
  const fresh: any[] = [];
  const stale: any[] = [];
  for (let page = 0; page < CLAIM_PAGES; page++) {
    const from = page * CLAIM_PAGE;
    const { data, error } = await supabaseAdmin
      .from("medication_requests")
      .select(
        "id, user_id, session_id, medicine_id, status, order_group_id, subscription_id, stripe_invoice_id, kind",
      )
      .is("provider_id", null)
      .in("status", CLAIM_READY_STATUSES)
      .order("created_at", { ascending: false })
      .range(from, from + CLAIM_PAGE - 1);
    if (error || !data?.length) break;
    const ids = data.map((row: { id: string }) => row.id).filter(Boolean);
    const [{ data: reminders }, { data: notes }] = await Promise.all([
      supabaseAdmin
        .from("email_reminders")
        .select("target_id")
        .eq("reminder_type", CLAIM_OFFER)
        .eq("period_key", CLAIM_OFFER_PERIOD)
        .in("target_id", ids),
      supabaseAdmin
        .from("notifications")
        .select("entity_id")
        .eq("type", "request_ready_to_claim")
        .in("entity_id", ids),
    ]);
    const reminded = new Set((reminders ?? []).map((row: { target_id: string }) => row.target_id));
    const noted = new Set(
      (notes ?? []).map((row: { entity_id: string | null }) => row.entity_id).filter(Boolean),
    );
    const staleRows = (data as { id: string; order_group_id?: string | null }[]).filter(
      (row) => reminded.has(row.id) && !noted.has(row.id) && row.order_group_id,
    );
    const deliveredGroups = new Set<string>();
    const groupIds = [...new Set(staleRows.map((row) => row.order_group_id).filter(Boolean))] as string[];
    if (groupIds.length) {
      const { data: members } = await supabaseAdmin
        .from("medication_requests")
        .select("id, order_group_id")
        .in("order_group_id", groupIds);
      const memberIds = (members ?? []).map((row: { id: string }) => row.id).filter(Boolean);
      if (memberIds.length) {
        const { data: groupNotes } = await supabaseAdmin
          .from("notifications")
          .select("entity_id")
          .eq("type", "request_ready_to_claim")
          .in("entity_id", memberIds);
        const notedMembers = new Set(
          (groupNotes ?? []).map((row: { entity_id: string | null }) => row.entity_id).filter(Boolean),
        );
        for (const member of (members ?? []) as { id: string; order_group_id?: string | null }[]) {
          if (member.order_group_id && notedMembers.has(member.id)) deliveredGroups.add(member.order_group_id);
        }
      }
    }
    for (const row of data as { id: string; order_group_id?: string | null }[]) {
      if (!reminded.has(row.id)) fresh.push(row);
      else if (!noted.has(row.id) && !(row.order_group_id && deliveredGroups.has(row.order_group_id))) {
        stale.push(row);
      }
    }
    if (data.length < CLAIM_PAGE) break;
    if (fresh.length >= 60) break;
  }
  return [...fresh, ...stale].slice(0, 80);
}

/** One email per new unassigned patient, to every active provider licensed in that state. */
export async function notifyProvidersPatientReadyToClaim(supabaseAdmin: any): Promise<void> {
  try {
    const { loadShopIntakeState, onboardingOwnershipByRequest, intakeIsReady } = await import(
      "@/lib/clinical-intake"
    );
    const { shopCheckoutRequestIdSet, userIdsInOpenChat } = await import("@/lib/order-groups");
    const rows = await loadClaimCandidates(supabaseAdmin);
    if (!rows.length) return;

    const userIds = Array.from(new Set(rows.map((r: any) => r.user_id).filter(Boolean))) as string[];
    const [inChat, shopIds, shopIntake] = await Promise.all([
      userIdsInOpenChat(supabaseAdmin, userIds),
      shopCheckoutRequestIdSet(supabaseAdmin, rows as any[]),
      loadShopIntakeState(
        supabaseAdmin,
        rows.map((row: { id: string }) => row.id),
      ),
    ]);
    const owned = await onboardingOwnershipByRequest(
      supabaseAdmin,
      (rows as any[])
        .filter((row) => !shopIds.has(row.id))
        .map((row) => ({
          id: row.id,
          session_id: row.session_id,
          user_id: row.user_id,
          subscription_id: row.subscription_id,
        })),
    );
    const intakeFlags = (rows as any[]).map((row) => {
      const fromShop = shopIds.has(row.id);
      return {
        id: row.id,
        fromShop,
        intakeReady: intakeIsReady({
          fromShop,
          decision: shopIntake.byRequest.get(row.id),
          onboardingReady: owned.get(row.id) ?? false,
        }),
      };
    });
    const intakeById = new Map(intakeFlags.map((row) => [row.id, row]));
    let ready = rows.filter((r: any) => {
      const flag = intakeById.get(r.id);
      return Boolean(flag?.intakeReady && r.user_id && (inChat.has(r.user_id) || flag.fromShop));
    });
    const groupIds = Array.from(new Set(ready.map((r: any) => r.order_group_id).filter(Boolean)));
    if (groupIds.length) {
      const { data: taken } = await supabaseAdmin
        .from("medication_requests")
        .select("order_group_id")
        .in("order_group_id", groupIds)
        .not("provider_id", "is", null);
      const takenGroups = new Set((taken ?? []).map((r: any) => r.order_group_id).filter(Boolean));
      ready = ready.filter((r: any) => !r.order_group_id || !takenGroups.has(r.order_group_id));
    }
    if (!ready.length) return;

    const readyIds = ready.map((r: any) => r.id).filter(Boolean);
    const { data: already } = await supabaseAdmin
      .from("email_reminders")
      .select("target_id")
      .eq("reminder_type", "provider_claim_offer")
      .eq("period_key", "ready")
      .in("target_id", readyIds);
    const announced = new Set((already ?? []).map((r: any) => r.target_id));

    const byPatient = new Map<string, any[]>();
    for (const row of ready as any[]) {
      const list = byPatient.get(row.user_id) ?? [];
      list.push(row);
      byPatient.set(row.user_id, list);
    }

    const { data: providers, error: provErr } = await supabaseAdmin
      .from("providers")
      .select("id, license_states, is_active, is_unavailable")
      .eq("is_active", true);
    if (provErr || !providers?.length) return;
    const active = (providers as any[]).filter((p) => !p.is_unavailable);
    const seenProvider = new Set<string>();
    const uniqueProviders = active.filter((p) => {
      if (!p.id || seenProvider.has(p.id)) return false;
      seenProvider.add(p.id);
      return true;
    });

    const portal = providerPortalOrigin();

    for (const rows of byPatient.values()) {
      const group = [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
      const lead = group[0];
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, state_code")
        .eq("id", lead.user_id)
        .maybeSingle();
      const state = String((profile as any)?.state_code ?? "")
        .trim()
        .toUpperCase();
      const patientName = (profile as any)?.full_name?.trim() || "A patient";
      if (!state) continue;
      const licensed = uniqueProviders.filter((p) =>
        ((p.license_states ?? []) as string[])
          .map((s) => String(s).toUpperCase())
          .includes(state),
      );
      if (!licensed.length) continue;
      const { label: medLabel, requestIds: purchaseIds } = await medicineLabelForOrder(
        supabaseAdmin,
        group,
      );
      if (await checkoutLinesStillArriving(supabaseAdmin, purchaseIds)) continue;
      const { data: alreadySent } = await supabaseAdmin
        .from("notifications")
        .select("entity_id")
        .eq("type", "request_ready_to_claim")
        .in("entity_id", purchaseIds);
      if ((alreadySent ?? []).length) {
        for (const requestId of purchaseIds) {
          if (announced.has(requestId)) continue;
          const { error: claimErr } = await supabaseAdmin.from("email_reminders").insert({
            reminder_type: CLAIM_OFFER,
            target_id: requestId,
            period_key: CLAIM_OFFER_PERIOD,
          });
          if (!claimErr) announced.add(requestId);
        }
        continue;
      }
      if (purchaseIds.some((id) => announced.has(id))) {
        await releaseClaimOffer(supabaseAdmin, purchaseIds);
        for (const id of purchaseIds) announced.delete(id);
      }
      const locked: string[] = [];
      for (const requestId of purchaseIds) {
        const { error: claimErr } = await supabaseAdmin.from("email_reminders").insert({
          reminder_type: CLAIM_OFFER,
          target_id: requestId,
          period_key: CLAIM_OFFER_PERIOD,
        });
        if (!claimErr) {
          announced.add(requestId);
          locked.push(requestId);
        }
      }
      if (!locked.length) continue;
      const fromShop = shopIds.has(lead.id);
      const title = fromShop ? "A shop order is ready to claim" : "A new patient is ready to claim";
      const body = fromShop
        ? `${patientName} placed a shop order for ${medLabel} and is waiting for a provider.`
        : `${patientName} finished signup for ${medLabel} and is waiting for a provider.`;
      const link = `/provider/requests/${lead.id}`;

      const contacts = await Promise.all(
        licensed.map(async (provider) => ({
          provider,
          contact: await resolveProfileContact(supabaseAdmin, provider.id),
        })),
      );
      const seenInbox = new Set<string>();
      const seenPush = new Set<string>();
      const recipients: { id: string; sendEmail: boolean }[] = [];
      for (const { provider, contact } of contacts) {
        if (!provider.id || seenPush.has(provider.id)) continue;
        seenPush.add(provider.id);
        const inbox = contact?.email?.trim().toLowerCase();
        const sendEmail = Boolean(inbox && !seenInbox.has(inbox));
        if (inbox && sendEmail) seenInbox.add(inbox);
        recipients.push({ id: provider.id, sendEmail });
      }
      const results = await Promise.all(
        recipients.map(async (recipient) => {
          let ok = false;
          if (recipient.sendEmail) {
            ok = await notifyUserById({
              supabaseAdmin,
              userId: recipient.id,
              template: "provider_patient_ready",
              params: {
                ORDER_ID: lead.id,
                MEDICINE_NAME: medLabel,
                PATIENT_NAME: patientName,
                REQUEST_URL: `${portal}/provider/requests/${lead.id}`,
                ORDER_SOURCE: fromShop ? "shop" : "onboarding",
              },
            });
          }
          // In-app row only — push is sent once by notify_provider_push_http on INSERT.
          try {
            const { error: noteErr } = await supabaseAdmin.from("notifications").insert({
              user_id: recipient.id,
              type: "request_ready_to_claim",
              title,
              body,
              link,
              entity_id: lead.id,
            });
            if (!noteErr) ok = true;
          } catch (e) {
            console.warn("[notify] ready-to-claim in-app failed:", e);
          }
          return ok;
        }),
      );
      if (!results.some(Boolean)) {
        await releaseClaimOffer(supabaseAdmin, locked);
        for (const id of locked) announced.delete(id);
      }
    }
  } catch (e) {
    console.error("[email] notifyProvidersPatientReadyToClaim failed:", e);
  }
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

export async function claimEmailReminder(
  supabaseAdmin: any,
  reminderType: string,
  targetId: string,
  periodKey: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin.from("email_reminders").insert({
    reminder_type: reminderType,
    target_id: targetId,
    period_key: periodKey,
  });
  if (!error) return true;
  if (error.code === "23505") return false;
  console.error(`[email] failed to claim ${reminderType}/${targetId}: ${error.message}`);
  return false;
}

export async function releaseEmailReminder(
  supabaseAdmin: any,
  reminderType: string,
  targetId: string,
  periodKey: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("email_reminders")
    .delete()
    .eq("reminder_type", reminderType)
    .eq("target_id", targetId)
    .eq("period_key", periodKey);
  if (error) {
    console.error(`[email] failed to release ${reminderType}/${targetId}: ${error.message}`);
  }
}

/** One-off mail to an address that may not have an account yet. Never throws. */
export async function notifyEmailAddress(opts: {
  email: string;
  name?: string | null;
  template: EmailTemplateKey;
  params?: Record<string, string | number | boolean | null | undefined>;
}): Promise<boolean> {
  try {
    const email = opts.email.trim();
    if (!email) return false;
    const { sendTransactionalEmail } = await import("@/integrations/brevo/client.server");
    const name = opts.name?.trim() || null;
    const result = await sendTransactionalEmail({
      to: { email, name },
      template: opts.template,
      params: {
        FIRSTNAME: name?.split(/\s+/)[0] ?? "",
        FULLNAME: name ?? "",
        ...opts.params,
      },
    });
    if (!result.ok) {
      const detail = result.skipped ? result.reason : result.error;
      console.error(`[brevo] ${opts.template} failed: ${detail}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[email] notifyEmailAddress ${opts.template} failed:`, e);
    return false;
  }
}

/** Last medicine-change email, the day before the 7 days run out. */
export async function remindPatientPlanChangeFinal(opts: {
  supabaseAdmin: any;
  request: { id: string; user_id?: string | null; medicine_id?: string | null };
}): Promise<boolean> {
  const periodKey = "plan_change_final";
  if (!(await claimEmailReminder(opts.supabaseAdmin, PATIENT_STATUS_REMINDER, opts.request.id, periodKey))) {
    return false;
  }
  const { data: row } = await opts.supabaseAdmin
    .from("medication_requests")
    .select("plan_change_token, plan_change_delta_cents, medicine_id, user_id, status")
    .eq("id", opts.request.id)
    .maybeSingle();
  if (row?.status !== "awaiting_additional_payment") {
    await releaseEmailReminder(opts.supabaseAdmin, PATIENT_STATUS_REMINDER, opts.request.id, periodKey);
    return false;
  }
  const delta = Number(row?.plan_change_delta_cents ?? 0);
  const amount = Math.max(delta, 0);
  const waitingForConsent = amount <= 0 && Boolean(row?.plan_change_token);
  if (amount <= 0 && !waitingForConsent) {
    await releaseEmailReminder(opts.supabaseAdmin, PATIENT_STATUS_REMINDER, opts.request.id, periodKey);
    return false;
  }
  const medicineName = await resolveMedicineName(
    opts.supabaseAdmin,
    row?.medicine_id ?? opts.request.medicine_id,
  );
  const links = medicineChangeMailLinks(opts.request.id, waitingForConsent ? "consent" : "payment");
  const sent = await notifyUserById({
    supabaseAdmin: opts.supabaseAdmin,
    userId: row?.user_id ?? opts.request.user_id,
    template: waitingForConsent ? "patient_plan_consent" : "patient_additional_payment",
    params: {
      ORDER_ID: opts.request.id,
      MEDICINE_NAME: medicineName,
      AMOUNT_DUE: (amount / 100).toFixed(2),
      CREDIT_AMOUNT: delta < 0 ? (Math.abs(delta) / 100).toFixed(2) : "0.00",
      IS_REMINDER: "1",
      IS_FINAL: "1",
      PORTAL_URL: links.PORTAL_URL,
      SECONDARY_URL: links.SECONDARY_URL,
    },
  });
  if (sent) return true;
  await releaseEmailReminder(opts.supabaseAdmin, PATIENT_STATUS_REMINDER, opts.request.id, periodKey);
  return false;
}

/** Renewal invoice failed. One email per invoice, even if Stripe retries the card. */
export async function notifyRenewalCardFailed(
  supabaseAdmin: any,
  invoice: { id?: string | null; subscription?: unknown; billing_reason?: string | null },
): Promise<boolean> {
  if (invoice.billing_reason && invoice.billing_reason !== "subscription_cycle") return false;
  const subscription = invoice.subscription as { id?: string } | string | null | undefined;
  const stripeSubscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
  if (!stripeSubscriptionId || !invoice.id) return false;

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("id, user_id, medicine_id, status")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();
  if (!sub?.id) return false;

  if (sub.status !== "past_due") {
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "past_due", updated_at: new Date().toISOString() })
      .eq("id", sub.id);
  }
  if (!sub.user_id) return false;

  const periodKey = invoice.id;
  if (!(await claimEmailReminder(supabaseAdmin, "renewal_card_failed", sub.id, periodKey))) return false;
  const medicineName = await resolveMedicineName(supabaseAdmin, sub.medicine_id);
  const sent = await notifyUserById({
    supabaseAdmin,
    userId: sub.user_id,
    template: "patient_renewal_failed",
    params: {
      MEDICINE_NAME: medicineName,
      PORTAL_URL: process.env.PATIENT_PORTAL_URL?.replace(/\/$/, "") ?? "",
    },
  });
  if (sent) return true;
  await releaseEmailReminder(supabaseAdmin, "renewal_card_failed", sub.id, periodKey);
  return false;
}

/** The assigned provider opened the case, so the one-day waiting email should not go out. */
export async function markProviderCaseOpened(supabaseAdmin: any, requestId: string): Promise<void> {
  await claimEmailReminder(supabaseAdmin, "provider_case_opened", requestId, "opened");
}
