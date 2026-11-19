import { bmiFrom } from "@/lib/format";
import { shopCheckoutRequestIdSet } from "@/lib/order-groups";

export type IntakeGroup = "allergies" | "medications" | "history" | "other";

export type ClinicalAnswer = {
  id: string;
  prompt: string;
  answer: string;
  group: IntakeGroup;
  redFlag: boolean;
};

export type ClinicalIntake = {
  filled: boolean;
  goals: string[];
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  allergies: ClinicalAnswer[];
  medications: ClinicalAnswer[];
  history: ClinicalAnswer[];
  other: ClinicalAnswer[];
  red_flags: { label: string; detail: string }[];
  eligibility: {
    medicine_name: string;
    result: string;
    reason: string | null;
  }[];
};

export type PastOrder = {
  id: string;
  medicine_name: string;
  kind: string | null;
  status: string;
  created_at: string;
  notes: { id: string; body: string; created_at: string }[];
};

const EMPTY_INTAKE: ClinicalIntake = {
  filled: false,
  goals: [],
  height_cm: null,
  weight_kg: null,
  bmi: null,
  allergies: [],
  medications: [],
  history: [],
  other: [],
  red_flags: [],
  eligibility: [],
};

function groupFor(prompt: string): IntakeGroup {
  const p = prompt.toLowerCase();
  if (/allerg/.test(p)) return "allergies";
  if (/medic|supplement|drug|current treatment|prescription/.test(p)) return "medications";
  if (/histor|condition|diagnos|surg|illness|disease|past/.test(p)) return "history";
  return "other";
}

function answerValue(
  row: any,
  optMap: Map<string, { label: string; is_disqualifying?: boolean }>,
): { text: string; redFlag: boolean } {
  const chosen = ((row.answer_option_ids ?? []) as string[])
    .map((id) => optMap.get(id))
    .filter(Boolean) as { label: string; is_disqualifying?: boolean }[];
  const text =
    chosen.map((o) => o.label).join(", ") ||
    (row.answer_text ??
      (row.answer_number != null ? String(row.answer_number) : null) ??
      (row.answer_boolean != null ? (row.answer_boolean ? "Yes" : "No") : null)) ||
    "—";
  const prompt = String(row.questionnaire_questions?.prompt ?? "");
  const riskyPrompt = /contraindic|pregnan|red flag|suicid|chest pain|anaphyla/.test(
    prompt.toLowerCase(),
  );
  const affirmative = /^(yes|true)$/i.test(String(text).trim());
  const redFlag = chosen.some((o) => o.is_disqualifying) || (riskyPrompt && affirmative);
  return { text: String(text), redFlag };
}

/** True when the session has at least one submitted questionnaire answer. */
export async function filledSessionIdSet(
  supabaseAdmin: any,
  sessionIds: string[],
): Promise<Set<string>> {
  const ids = Array.from(new Set(sessionIds.filter(Boolean)));
  if (ids.length === 0) return new Set();
  const { data, error } = await supabaseAdmin
    .from("intake_session_questionnaire_responses")
    .select("session_id")
    .in("session_id", ids);
  if (error) throw new Error(error.message);
  return new Set(((data ?? []) as { session_id: string }[]).map((row) => row.session_id));
}

export async function sessionHasIntake(
  supabaseAdmin: any,
  sessionId: string | null | undefined,
): Promise<boolean> {
  if (!sessionId) return false;
  const filled = await filledSessionIdSet(supabaseAdmin, [sessionId]);
  return filled.has(sessionId);
}

export const WAITING_FOR_INTAKE = new Set([
  "payment_completed",
  "provider_assigned",
  "pending_review",
  "awaiting_additional_payment",
]);

/** Latest finished intake session for each patient. */
export async function completedIntakeSessionByUser(
  supabaseAdmin: any,
  userIds: string[],
): Promise<Map<string, string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return new Map();
  const { data, error } = await supabaseAdmin
    .from("intake_sessions")
    .select("id, claimed_by_user_id, status, updated_at")
    .in("claimed_by_user_id", ids);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as {
    id: string;
    claimed_by_user_id: string | null;
    status: string;
    updated_at: string | null;
  }[];
  const answered = await filledSessionIdSet(
    supabaseAdmin,
    rows.map((row) => row.id),
  );
  const best = new Map<string, { id: string; updated_at: string }>();
  for (const row of rows) {
    if (!row.claimed_by_user_id) continue;
    if (row.status !== "completed" && !answered.has(row.id)) continue;
    const prev = best.get(row.claimed_by_user_id);
    const updatedAt = row.updated_at ?? "";
    if (!prev || updatedAt > prev.updated_at) {
      best.set(row.claimed_by_user_id, { id: row.id, updated_at: updatedAt });
    }
  }
  return new Map(Array.from(best, ([userId, session]) => [userId, session.id]));
}

/** Patients who already finished an intake, even when a later order has no session id. */
export async function completedIntakeUserIds(
  supabaseAdmin: any,
  userIds: string[],
): Promise<Set<string>> {
  const sessions = await completedIntakeSessionByUser(supabaseAdmin, userIds);
  return new Set(sessions.keys());
}

type ShopSessionRow = {
  id: string;
  claimed_by_user_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

type ShopSubscriptionRow = {
  id: string;
  user_id: string | null;
  session_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
};

export type ShopIntakeDecision = {
  finishedSessionId: string | null;
  /** In-progress session that already belongs to this purchase. */
  ownSessionId: string | null;
  borrowedSessionId: string | null;
  /** Older session currently stored on the subscription, if it is not this purchase. */
  borrowedSubscriptionSessionId: string | null;
  subscriptionId: string | null;
  /**
   * The consultation questionnaire for this purchase was submitted.
   * Shop checkouts record that form in Jotform, not as a new intake session.
   */
  consultationFormSubmitted: boolean;
  consultationSubmissionId: string | null;
};

/** Shop order can be claimed once this purchase's own intake is finished. */
export function shopIntakeReady(decision: ShopIntakeDecision | null | undefined): boolean {
  return Boolean(decision?.finishedSessionId || decision?.consultationFormSubmitted);
}

/**
 * Intake is finished for this order only.
 * A shop line still needs its own session or this checkout's consultation form.
 * An onboarding line still needs its own session, unless this same checkout's
 * consultation form was submitted (the form is stored on the primary plan).
 * An older signup's form never counts.
 */
export function intakeIsReady(opts: {
  fromShop: boolean;
  decision?: ShopIntakeDecision | null;
  onboardingReady?: boolean;
}): boolean {
  if (shopIntakeReady(opts.decision)) return true;
  return !opts.fromShop && Boolean(opts.onboardingReady);
}

function emptyIntakeDecision(subscriptionId: string | null): ShopIntakeDecision {
  return {
    finishedSessionId: null,
    ownSessionId: null,
    borrowedSessionId: null,
    borrowedSubscriptionSessionId: null,
    subscriptionId,
    consultationFormSubmitted: false,
    consultationSubmissionId: null,
  };
}

export type ShopIntakeState = {
  shopIds: Set<string>;
  byRequest: Map<string, ShopIntakeDecision>;
};

function laterShopSession(current: ShopSessionRow | null, next: ShopSessionRow): ShopSessionRow {
  if (!current) return next;
  const currentAt = current.updated_at ?? current.created_at;
  const nextAt = next.updated_at ?? next.created_at;
  return nextAt > currentAt ? next : current;
}

/**
 * Initial shop orders can be claimed only after the intake for that purchase is finished.
 * A form the patient completed for an earlier medicine does not count.
 */
export async function loadShopIntakeState(
  supabaseAdmin: any,
  requestIds: string[],
): Promise<ShopIntakeState> {
  const ids = Array.from(new Set(requestIds.filter(Boolean)));
  const empty: ShopIntakeState = { shopIds: new Set(), byRequest: new Map() };
  if (ids.length === 0) return empty;

  const { data, error } = await supabaseAdmin
    .from("medication_requests")
    .select("id, user_id, session_id, subscription_id, stripe_invoice_id, kind, created_at")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const requests = (data ?? []) as {
    id: string;
    user_id: string | null;
    session_id: string | null;
    subscription_id: string | null;
    stripe_invoice_id: string | null;
    kind: string | null;
    created_at: string;
  }[];
  const shopIds = await shopCheckoutRequestIdSet(supabaseAdmin, requests);
  if (shopIds.size === 0) {
    const byRequest = new Map<string, ShopIntakeDecision>();
    for (const row of requests) {
      if (!row.subscription_id) continue;
      byRequest.set(row.id, emptyIntakeDecision(row.subscription_id));
    }
    await attachShopConsultationForms(supabaseAdmin, requests, byRequest);
    return { shopIds, byRequest };
  }

  const shopRows = requests.filter((row) => shopIds.has(row.id));
  const userIds = Array.from(new Set(shopRows.map((row) => row.user_id).filter(Boolean))) as string[];
  const subIds = Array.from(
    new Set(shopRows.map((row) => row.subscription_id).filter(Boolean)),
  ) as string[];

  const { data: subData, error: subError } = subIds.length
    ? await supabaseAdmin
        .from("subscriptions")
        .select("id, user_id, session_id, stripe_subscription_id, created_at")
        .in("id", subIds)
    : { data: [] as ShopSubscriptionRow[], error: null };
  if (subError) throw new Error(subError.message);
  const linkedSubs = (subData ?? []) as ShopSubscriptionRow[];

  const { data: userSubData, error: userSubError } = userIds.length
    ? await supabaseAdmin
        .from("subscriptions")
        .select("id, user_id, session_id, stripe_subscription_id, created_at")
        .in("user_id", userIds)
    : { data: [] as ShopSubscriptionRow[], error: null };
  if (userSubError) throw new Error(userSubError.message);
  const userSubs = (userSubData ?? []) as ShopSubscriptionRow[];
  const subById = new Map<string, ShopSubscriptionRow>();
  for (const sub of [...linkedSubs, ...userSubs]) subById.set(sub.id, sub);

  const stripeIds = Array.from(
    new Set(
      shopRows
        .map((row) => (row.subscription_id ? subById.get(row.subscription_id)?.stripe_subscription_id : null))
        .filter(Boolean),
    ),
  ) as string[];
  const linkedSessionIds = Array.from(
    new Set(
      shopRows.flatMap((row) => {
        const sub = row.subscription_id ? subById.get(row.subscription_id) : undefined;
        return [row.session_id, sub?.session_id].filter(Boolean) as string[];
      }),
    ),
  );

  const [byUserRes, byStripeRes, byIdRes] = await Promise.all([
    userIds.length
      ? supabaseAdmin
          .from("intake_sessions")
          .select("id, claimed_by_user_id, stripe_subscription_id, status, created_at, updated_at")
          .in("claimed_by_user_id", userIds)
      : Promise.resolve({ data: [] as ShopSessionRow[], error: null }),
    stripeIds.length
      ? supabaseAdmin
          .from("intake_sessions")
          .select("id, claimed_by_user_id, stripe_subscription_id, status, created_at, updated_at")
          .in("stripe_subscription_id", stripeIds)
      : Promise.resolve({ data: [] as ShopSessionRow[], error: null }),
    linkedSessionIds.length
      ? supabaseAdmin
          .from("intake_sessions")
          .select("id, claimed_by_user_id, stripe_subscription_id, status, created_at, updated_at")
          .in("id", linkedSessionIds)
      : Promise.resolve({ data: [] as ShopSessionRow[], error: null }),
  ]);
  if (byUserRes.error) throw new Error(byUserRes.error.message);
  if (byStripeRes.error) throw new Error(byStripeRes.error.message);
  if (byIdRes.error) throw new Error(byIdRes.error.message);

  const sessionById = new Map<string, ShopSessionRow>();
  for (const row of [
    ...((byUserRes.data ?? []) as ShopSessionRow[]),
    ...((byStripeRes.data ?? []) as ShopSessionRow[]),
    ...((byIdRes.data ?? []) as ShopSessionRow[]),
  ]) {
    sessionById.set(row.id, row);
  }
  const sessionsByUser = new Map<string, ShopSessionRow[]>();
  for (const session of sessionById.values()) {
    if (!session.claimed_by_user_id) continue;
    const list = sessionsByUser.get(session.claimed_by_user_id) ?? [];
    list.push(session);
    sessionsByUser.set(session.claimed_by_user_id, list);
  }

  const answered = new Set<string>();
  const responseTimes = new Map<string, string>();
  const sessionIds = Array.from(sessionById.keys());
  if (sessionIds.length) {
    const { data: responses, error: responseError } = await supabaseAdmin
      .from("intake_session_questionnaire_responses")
      .select("session_id, created_at")
      .in("session_id", sessionIds);
    if (responseError) throw new Error(responseError.message);
    for (const row of (responses ?? []) as { session_id: string; created_at: string | null }[]) {
      answered.add(row.session_id);
      if (!row.created_at) continue;
      const prev = responseTimes.get(row.session_id);
      if (!prev || row.created_at > prev) responseTimes.set(row.session_id, row.created_at);
    }
  }

  const byRequest = new Map<string, ShopIntakeDecision>();
  for (const row of shopRows) {
    const sub = row.subscription_id ? subById.get(row.subscription_id) : undefined;
    const earlier = userSubs.filter(
      (item) =>
        item.user_id &&
        item.user_id === row.user_id &&
        item.id !== sub?.id &&
        item.created_at < (sub?.created_at ?? row.created_at),
    );
    const earlierSessionIds = new Set(earlier.map((item) => item.session_id).filter(Boolean));
    const earlierStripeIds = new Set(
      earlier.map((item) => item.stripe_subscription_id).filter(Boolean),
    );
    const purchaseAt = new Date(sub?.created_at ?? row.created_at).getTime();
    const belongs = (session: ShopSessionRow) => {
      if (sub?.stripe_subscription_id && session.stripe_subscription_id === sub.stripe_subscription_id) {
        return true;
      }
      if (
        session.stripe_subscription_id &&
        session.stripe_subscription_id !== sub?.stripe_subscription_id
      ) {
        return false;
      }
      if (earlierSessionIds.has(session.id) || earlierStripeIds.has(session.stripe_subscription_id ?? "")) {
        return false;
      }
      const linked = session.id === row.session_id || session.id === sub?.session_id;
      if (!linked) return false;
      // A copied earlier form has no stripe id for this purchase and was started long before it.
      return new Date(session.created_at).getTime() >= purchaseAt - 60 * 60 * 1000;
    };
    const finished = (session: ShopSessionRow) =>
      session.status === "completed" || answered.has(session.id);

    const pool = [
      ...(row.user_id ? (sessionsByUser.get(row.user_id) ?? []) : []),
      ...Array.from(sessionById.values()).filter(
        (session) =>
          sub?.stripe_subscription_id &&
          session.stripe_subscription_id === sub.stripe_subscription_id,
      ),
    ];
    const seen = new Set<string>();
    let finishedSession: ShopSessionRow | null = null;
    let ownOpen: ShopSessionRow | null = null;
    for (const session of pool) {
      if (seen.has(session.id)) continue;
      seen.add(session.id);
      if (!belongs(session)) continue;
      if (finished(session)) finishedSession = laterShopSession(finishedSession, session);
      else if (session.id === row.session_id || session.id === sub?.session_id) {
        ownOpen = laterShopSession(ownOpen, session);
      }
    }

    // Pay-first shop checkouts finish the form after the order exists, sometimes on a new session
    // that is not linked yet. Answers saved after this purchase count. Older answers do not.
    if (!finishedSession && row.user_id) {
      const cutoff = new Date(new Date(row.created_at).getTime() - 2 * 60 * 1000).toISOString();
      for (const session of sessionsByUser.get(row.user_id) ?? []) {
        const answeredAt = responseTimes.get(session.id);
        if (!answeredAt || answeredAt < cutoff) continue;
        // A previous purchase's session counts only when new answers were saved for this order.
        if (earlierSessionIds.has(session.id) && answeredAt < row.created_at) continue;
        finishedSession = laterShopSession(finishedSession, session);
      }
    }

    const ownSessionId = finishedSession?.id ?? ownOpen?.id ?? null;
    const requestSession = row.session_id ? sessionById.get(row.session_id) : undefined;
    const subSession = sub?.session_id ? sessionById.get(sub.session_id) : undefined;
    byRequest.set(row.id, {
      finishedSessionId: finishedSession?.id ?? null,
      ownSessionId,
      borrowedSessionId:
        row.session_id && row.session_id !== ownSessionId && requestSession && !belongs(requestSession)
          ? row.session_id
          : null,
      borrowedSubscriptionSessionId:
        sub?.session_id &&
        sub.session_id !== ownSessionId &&
        subSession &&
        !belongs(subSession)
          ? sub.session_id
          : null,
      subscriptionId: row.subscription_id,
      consultationFormSubmitted: false,
      consultationSubmissionId: null,
    });
  }

  for (const row of requests) {
    if (byRequest.has(row.id) || !row.subscription_id) continue;
    byRequest.set(row.id, emptyIntakeDecision(row.subscription_id));
  }
  await attachShopConsultationForms(supabaseAdmin, requests, byRequest);

  return { shopIds, byRequest };
}

type ShopRequestRow = {
  id: string;
  subscription_id: string | null;
};

/**
 * Subscriptions that share this checkout. The consultation form is saved on the
 * primary plan, so an add-on line has to see that same submission.
 * A different order's subscription is not included.
 */
async function checkoutSubscriptionIds(
  supabaseAdmin: any,
  subscriptionIds: string[],
): Promise<Map<string, string[]>> {
  const ids = Array.from(new Set(subscriptionIds.filter(Boolean)));
  const groups = new Map<string, Set<string>>();
  for (const id of ids) groups.set(id, new Set([id]));
  if (ids.length === 0) return new Map();

  const { data: reqs, error } = await supabaseAdmin
    .from("medication_requests")
    .select("subscription_id, order_group_id")
    .in("subscription_id", ids);
  if (!error && reqs?.length) {
    const groupIds = Array.from(
      new Set((reqs as { order_group_id?: string | null }[]).map((row) => row.order_group_id).filter(Boolean)),
    ) as string[];
    let members = reqs as { subscription_id?: string | null; order_group_id?: string | null }[];
    if (groupIds.length) {
      const { data: more, error: moreError } = await supabaseAdmin
        .from("medication_requests")
        .select("subscription_id, order_group_id")
        .in("order_group_id", groupIds);
      if (!moreError && more?.length) members = more;
    }
    const byGroup = new Map<string, string[]>();
    for (const row of members) {
      if (!row.order_group_id || !row.subscription_id) continue;
      const list = byGroup.get(row.order_group_id) ?? [];
      if (!list.includes(row.subscription_id)) list.push(row.subscription_id);
      byGroup.set(row.order_group_id, list);
    }
    for (const row of reqs as { subscription_id?: string | null; order_group_id?: string | null }[]) {
      if (!row.subscription_id || !row.order_group_id) continue;
      const set = groups.get(row.subscription_id) ?? new Set([row.subscription_id]);
      for (const id of byGroup.get(row.order_group_id) ?? []) set.add(id);
      groups.set(row.subscription_id, set);
    }
  }

  const checkout = await supabaseAdmin
    .from("subscriptions")
    .select("id, checkout_group_id")
    .in("id", ids);
  if (!checkout.error && checkout.data?.length) {
    const checkoutIds = Array.from(
      new Set(
        (checkout.data as { checkout_group_id?: string | null }[])
          .map((row) => row.checkout_group_id)
          .filter(Boolean),
      ),
    ) as string[];
    let family = checkout.data as { id?: string | null; checkout_group_id?: string | null }[];
    if (checkoutIds.length) {
      const { data: more, error: moreError } = await supabaseAdmin
        .from("subscriptions")
        .select("id, checkout_group_id")
        .in("checkout_group_id", checkoutIds);
      if (!moreError && more?.length) family = more;
    }
    const byCheckout = new Map<string, string[]>();
    for (const row of family) {
      if (!row.checkout_group_id || !row.id) continue;
      const list = byCheckout.get(row.checkout_group_id) ?? [];
      if (!list.includes(row.id)) list.push(row.id);
      byCheckout.set(row.checkout_group_id, list);
    }
    for (const row of checkout.data as { id?: string | null; checkout_group_id?: string | null }[]) {
      if (!row.id || !row.checkout_group_id) continue;
      const set = groups.get(row.id) ?? new Set([row.id]);
      for (const id of byCheckout.get(row.checkout_group_id) ?? []) set.add(id);
      groups.set(row.id, set);
    }
  }

  return new Map(Array.from(groups, ([id, set]) => [id, Array.from(set)]));
}

/**
 * A shop purchase finishes intake in the consultation questionnaire.
 * That submission is for this checkout, so an older onboarding session still does not count.
 * Add-on medicines share the primary plan's submitted form.
 */
async function attachShopConsultationForms(
  supabaseAdmin: any,
  shopRows: ShopRequestRow[],
  byRequest: Map<string, ShopIntakeDecision>,
): Promise<void> {
  const pending = shopRows.filter((row) => {
    const decision = byRequest.get(row.id);
    return Boolean(row.subscription_id && decision && !decision.finishedSessionId);
  });
  const ownIds = Array.from(
    new Set(pending.map((row) => row.subscription_id).filter(Boolean)),
  ) as string[];
  if (ownIds.length === 0) return;
  const relatedBySub = await checkoutSubscriptionIds(supabaseAdmin, ownIds);
  const subscriptionIds = Array.from(
    new Set(ownIds.flatMap((id) => relatedBySub.get(id) ?? [id])),
  );
  if (subscriptionIds.length === 0) return;

  const submitted = new Map<string, { submissionId: string | null; submittedAt: string | null }>();
  let formColumns = true;
  const withForm = await supabaseAdmin
    .from("patient_consultations")
    .select("id, subscription_id, qb_appointment_id, form_submitted, form_submission_id, form_submitted_at")
    .in("subscription_id", subscriptionIds);
  let consultations = (withForm.data ?? []) as {
    id: string;
    subscription_id: string;
    qb_appointment_id: string | null;
    form_submitted?: boolean | null;
    form_submission_id?: string | null;
    form_submitted_at?: string | null;
  }[];
  if (withForm.error && /form_submitted|form_submission_id/i.test(withForm.error.message ?? "")) {
    formColumns = false;
    const basic = await supabaseAdmin
      .from("patient_consultations")
      .select("id, subscription_id, qb_appointment_id")
      .in("subscription_id", subscriptionIds);
    if (basic.error) {
      console.warn("[intake] consultation lookup failed:", basic.error.message);
      return;
    }
    consultations = (basic.data ?? []) as typeof consultations;
  } else if (withForm.error) {
    console.warn("[intake] consultation lookup failed:", withForm.error.message);
    return;
  }

  for (const row of consultations) {
    if (!row.subscription_id) continue;
    if (row.form_submitted || row.form_submission_id) {
      submitted.set(row.subscription_id, {
        submissionId: row.form_submission_id ?? null,
        submittedAt: row.form_submitted_at ?? null,
      });
    }
  }

  const unresolved = consultations.filter((row) => row.subscription_id && !submitted.has(row.subscription_id));
  if (unresolved.length) {
    try {
      const { jotformSubmissionsForPurchases } = await import("@/lib/consultations/jotform");
      const matches = await jotformSubmissionsForPurchases(
        unresolved.map((row) => ({
          subscriptionId: row.subscription_id,
          appointmentId: row.qb_appointment_id,
          consultationId: row.id,
        })),
      );
      for (const [subscriptionId, match] of matches) {
        submitted.set(subscriptionId, {
          submissionId: match.submissionId,
          submittedAt: match.submittedAt,
        });
        if (!formColumns || !match.submissionId) continue;
        const { error } = await supabaseAdmin
          .from("patient_consultations")
          .update({
            form_submitted: true,
            form_submission_id: match.submissionId,
            form_submitted_at: match.submittedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("subscription_id", subscriptionId);
        if (error && !/form_submitted|form_submission_id/i.test(error.message ?? "")) {
          console.warn("[intake] save consultation form failed:", error.message);
        }
      }
    } catch (error) {
      console.warn("[intake] consultation form lookup failed:", error);
    }
  }

  for (const row of pending) {
    const decision = byRequest.get(row.id);
    if (!decision || !row.subscription_id) continue;
    const related = relatedBySub.get(row.subscription_id) ?? [row.subscription_id];
    const hit = related
      .map((id) => submitted.get(id))
      .find((item): item is { submissionId: string | null; submittedAt: string | null } => Boolean(item));
    if (!hit) continue;
    decision.consultationFormSubmitted = true;
    decision.consultationSubmissionId = hit.submissionId;
  }
}

export async function withShopConsultationIntake(
  intake: ClinicalIntake,
  decision: ShopIntakeDecision | null | undefined,
): Promise<ClinicalIntake> {
  if (!decision?.consultationFormSubmitted || intake.filled) return intake;
  if (!decision.consultationSubmissionId) return { ...intake, filled: true };
  try {
    const { fetchJotformSubmissionAnswers } = await import("@/lib/consultations/jotform");
    const answers = await fetchJotformSubmissionAnswers(decision.consultationSubmissionId);
    return {
      ...intake,
      filled: true,
      other: answers.map((item, index) => ({
        id: `jotform-${decision.consultationSubmissionId}-${index}`,
        prompt: item.label,
        answer: item.value,
        group: "other" as const,
        redFlag: false,
      })),
    };
  } catch (error) {
    console.warn("[intake] consultation answers failed:", error);
    return { ...intake, filled: true };
  }
}

/**
 * Keep each order on its own finished intake. Shop and onboarding both refuse an older
 * form from another signup/purchase. Orders still waiting on intake are unassigned.
 */
type OwnershipRow = {
  id: string;
  session_id?: string | null;
  user_id?: string | null;
  subscription_id?: string | null;
};

async function subscriptionsSharingSessions(
  supabaseAdmin: any,
  userIds: string[],
  sessionIds: string[],
): Promise<{ id: string; user_id: string; session_id: string; created_at: string }[]> {
  const users = Array.from(new Set(userIds.filter(Boolean)));
  const sessions = Array.from(new Set(sessionIds.filter(Boolean)));
  const out: { id: string; user_id: string; session_id: string; created_at: string }[] = [];
  for (let i = 0; i < users.length; i += 50) {
    const userChunk = users.slice(i, i + 50);
    for (let j = 0; j < sessions.length; j += 50) {
      const sessionChunk = sessions.slice(j, j + 50);
      let from = 0;
      for (;;) {
        const { data, error } = await supabaseAdmin
          .from("subscriptions")
          .select("id, user_id, session_id, created_at")
          .in("user_id", userChunk)
          .in("session_id", sessionChunk)
          .range(from, from + 999);
        if (error) throw new Error(error.message);
        const page = (data ?? []) as {
          id: string;
          user_id: string;
          session_id: string;
          created_at: string;
        }[];
        out.push(...page);
        if (page.length < 1000) break;
        from += 1000;
      }
    }
  }
  return out;
}

async function rowsIn<T>(
  supabaseAdmin: any,
  table: string,
  column: string,
  ids: string[],
  select: string,
): Promise<T[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const out: T[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(select)
      .in(column, unique.slice(i, i + 100));
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as T[]));
  }
  return out;
}

/**
 * Same answer as calling onboardingSessionOwned once per order, in a handful of queries
 * instead of two or three database round trips per order.
 */
export async function onboardingOwnershipByRequest(
  supabaseAdmin: any,
  rows: OwnershipRow[],
  filledSessions?: Set<string>,
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  const sessionIds = rows.map((row) => row.session_id).filter(Boolean) as string[];
  const filled = filledSessions ?? (await filledSessionIdSet(supabaseAdmin, sessionIds));
  const needOlder: OwnershipRow[] = [];

  for (const row of rows) {
    const sessionId = row.session_id ?? null;
    if (!sessionId || !filled.has(sessionId)) {
      result.set(row.id, false);
      continue;
    }
    if (!row.user_id || !row.subscription_id) {
      result.set(row.id, true);
      continue;
    }
    needOlder.push(row);
  }
  if (needOlder.length === 0) return result;

  const subIds = needOlder.map((row) => row.subscription_id).filter(Boolean) as string[];
  const userIds = Array.from(new Set(needOlder.map((row) => row.user_id).filter(Boolean))) as string[];
  const ownedSessionIds = Array.from(
    new Set(needOlder.map((row) => row.session_id).filter(Boolean)),
  ) as string[];
  const [subs, candidates] = await Promise.all([
    rowsIn<{ id: string; created_at: string | null }>(
      supabaseAdmin,
      "subscriptions",
      "id",
      subIds,
      "id, created_at",
    ),
    subscriptionsSharingSessions(supabaseAdmin, userIds, ownedSessionIds),
  ]);
  const allowedSessions = new Set(ownedSessionIds);
  const createdAt = new Map(subs.map((row) => [row.id, row.created_at]));

  for (const row of needOlder) {
    const at = createdAt.get(row.subscription_id!);
    const atMs = at ? Date.parse(at) : Number.NaN;
    if (!at || Number.isNaN(atMs)) {
      result.set(row.id, true);
      continue;
    }
    const borrowed = candidates.some((other) => {
      if (other.user_id !== row.user_id || other.session_id !== row.session_id) return false;
      if (!allowedSessions.has(other.session_id) || other.id === row.subscription_id) return false;
      const otherMs = Date.parse(other.created_at);
      return !Number.isNaN(otherMs) && otherMs < atMs;
    });
    result.set(row.id, !borrowed);
  }
  return result;
}

export type IntakeRepairSnapshot = {
  shop: ShopIntakeState;
  filledSessions: Set<string>;
};

export async function repairOrdersAwaitingIntake(
  supabaseAdmin: any,
  rows: {
    id: string;
    user_id?: string | null;
    session_id?: string | null;
    subscription_id?: string | null;
    provider_id?: string | null;
    status?: string | null;
  }[],
): Promise<IntakeRepairSnapshot> {
  if (rows.length === 0) {
    return { shop: { shopIds: new Set(), byRequest: new Map() }, filledSessions: new Set() };
  }
  const sessionIds = rows.map((row) => row.session_id).filter(Boolean) as string[];
  const [shop, filledSessions] = await Promise.all([
    loadShopIntakeState(
      supabaseAdmin,
      rows.map((row) => row.id),
    ),
    filledSessionIdSet(supabaseAdmin, sessionIds),
  ]);
  const onboardingRows = rows.filter((row) => !shop.shopIds.has(row.id));
  const ownedOnboarding = await onboardingOwnershipByRequest(
    supabaseAdmin,
    onboardingRows,
    filledSessions,
  );
  const now = new Date().toISOString();
  const shopAttach = new Map<string, string[]>();
  const shopSubAttach = new Map<string, string[]>();
  const shopDetach = new Map<string, string[]>();
  const shopSubDetach = new Map<string, string[]>();
  const clearIds: string[] = [];

  for (const row of rows) {
    if (shop.shopIds.has(row.id)) {
      const decision = shop.byRequest.get(row.id);
      const finished = decision?.finishedSessionId ?? null;
      if (finished) {
        if (row.session_id !== finished) {
          row.session_id = finished;
          const ids = shopAttach.get(finished) ?? [];
          ids.push(row.id);
          shopAttach.set(finished, ids);
        }
        if (row.subscription_id) {
          const subs = shopSubAttach.get(finished) ?? [];
          subs.push(row.subscription_id);
          shopSubAttach.set(finished, subs);
        }
      } else if (decision?.borrowedSessionId && row.session_id === decision.borrowedSessionId) {
        row.session_id = null;
        const ids = shopDetach.get(decision.borrowedSessionId) ?? [];
        ids.push(row.id);
        shopDetach.set(decision.borrowedSessionId, ids);
      }
      if (!finished && decision?.borrowedSubscriptionSessionId && row.subscription_id) {
        const subs = shopSubDetach.get(decision.borrowedSubscriptionSessionId) ?? [];
        subs.push(row.subscription_id);
        shopSubDetach.set(decision.borrowedSubscriptionSessionId, subs);
      }
      if (
        row.provider_id &&
        row.status &&
        WAITING_FOR_INTAKE.has(row.status) &&
        !shopIntakeReady(decision)
      ) {
        row.provider_id = null;
        clearIds.push(row.id);
      }
      continue;
    }

    // Onboarding: only this signup's own session counts (same rule as shop).
    // A consultation form submitted for this same checkout also counts.
    const owned = ownedOnboarding.get(row.id) ?? false;
    const decision = shop.byRequest.get(row.id);
    const ready =
      Boolean(row.session_id && filledSessions.has(row.session_id) && owned) ||
      shopIntakeReady(decision);
    if (row.session_id && !owned) {
      const ids = shopDetach.get(row.session_id) ?? [];
      ids.push(row.id);
      shopDetach.set(row.session_id, ids);
      if (row.subscription_id) {
        const subs = shopSubDetach.get(row.session_id) ?? [];
        subs.push(row.subscription_id);
        shopSubDetach.set(row.session_id, subs);
      }
      row.session_id = null;
    }
    if (row.provider_id && row.status && WAITING_FOR_INTAKE.has(row.status) && !ready) {
      row.provider_id = null;
      clearIds.push(row.id);
    }
  }

  await Promise.all([
    ...Array.from(shopAttach, async ([sessionId, ids]) => {
      const { error } = await supabaseAdmin
        .from("medication_requests")
        .update({ session_id: sessionId, updated_at: now })
        .in("id", ids);
      if (error) console.warn("[intake] save shop session on order failed:", error.message);
    }),
    ...Array.from(shopSubAttach, async ([sessionId, ids]) => {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({ session_id: sessionId })
        .in("id", Array.from(new Set(ids)));
      if (error) console.warn("[intake] save shop session on subscription failed:", error.message);
    }),
    ...Array.from(shopDetach, async ([sessionId, ids]) => {
      const { error } = await supabaseAdmin
        .from("medication_requests")
        .update({ session_id: null, updated_at: now })
        .in("id", ids)
        .eq("session_id", sessionId);
      if (error) console.warn("[intake] clear borrowed shop session failed:", error.message);
    }),
    ...Array.from(shopSubDetach, async ([sessionId, ids]) => {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({ session_id: null })
        .in("id", Array.from(new Set(ids)))
        .eq("session_id", sessionId);
      if (error) console.warn("[intake] clear borrowed shop subscription session failed:", error.message);
    }),
  ]);
  if (clearIds.length) {
    const { error } = await supabaseAdmin
      .from("medication_requests")
      .update({ provider_id: null, updated_at: now })
      .in("id", clearIds);
    if (error) console.warn("[intake] unassign before intake failed:", error.message);
    else {
      const { error: eventError } = await supabaseAdmin.from("medication_request_events").insert(
        clearIds.map((id) => ({
          request_id: id,
          status: "provider_assigned",
          actor_role: "system",
          note: "Provider removed because the intake form is not finished.",
        })),
      );
      if (eventError) console.warn("[intake] unassign note failed:", eventError.message);
    }
  }
  return { shop, filledSessions };
}

/**
 * True when the session on this order is this signup's own finished form —
 * not an older subscription's intake copied onto a later onboarding order.
 */
export async function onboardingSessionOwned(
  supabaseAdmin: any,
  opts: {
    sessionId?: string | null;
    userId?: string | null;
    subscriptionId?: string | null;
  },
): Promise<boolean> {
  const owned = await onboardingOwnershipByRequest(supabaseAdmin, [
    {
      id: "_",
      session_id: opts.sessionId,
      user_id: opts.userId,
      subscription_id: opts.subscriptionId,
    },
  ]);
  return owned.get("_") ?? false;
}

/** True when this order's linked intake session has answers (never borrows an older signup). */
export async function orderHasIntake(
  supabaseAdmin: any,
  sessionId: string | null | undefined,
  userId?: string | null | undefined,
  subscriptionId?: string | null | undefined,
): Promise<boolean> {
  if (subscriptionId || userId) {
    return onboardingSessionOwned(supabaseAdmin, { sessionId, userId, subscriptionId });
  }
  return sessionHasIntake(supabaseAdmin, sessionId);
}

/** Session linked to this order only — do not fall back to an earlier patient intake. */
export async function intakeSessionForOrder(
  supabaseAdmin: any,
  sessionId: string | null | undefined,
  userId?: string | null | undefined,
  subscriptionId?: string | null | undefined,
): Promise<string | null> {
  if (
    sessionId &&
    (await orderHasIntake(supabaseAdmin, sessionId, userId, subscriptionId))
  ) {
    return sessionId;
  }
  return null;
}

export async function loadClinicalIntake(
  supabaseAdmin: any,
  sessionId: string | null | undefined,
  session?: {
    height_cm?: number | null;
    weight_kg?: number | null;
  } | null,
): Promise<ClinicalIntake> {
  if (!sessionId) return EMPTY_INTAKE;

  const [{ data: cats }, { data: elig }, { data: resp }] = await Promise.all([
    supabaseAdmin
      .from("intake_session_categories")
      .select("medication_categories(name)")
      .eq("session_id", sessionId),
    supabaseAdmin
      .from("intake_session_eligibility_results")
      .select("result, reason, evaluated_at, medicines(name)")
      .eq("session_id", sessionId)
      .order("evaluated_at", { ascending: false }),
    supabaseAdmin
      .from("intake_session_questionnaire_responses")
      .select(
        "id, answer_text, answer_number, answer_boolean, answer_option_ids, questionnaire_questions(prompt)",
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
  ]);

  const optionIds = Array.from(
    new Set(((resp ?? []) as any[]).flatMap((row) => row.answer_option_ids ?? [])),
  );
  const { data: opts } = optionIds.length
    ? await supabaseAdmin
        .from("questionnaire_question_options")
        .select("id, label, is_disqualifying")
        .in("id", optionIds)
    : { data: [] as any[] };
  const optMap = new Map<string, { label: string; is_disqualifying?: boolean }>(
    (opts ?? []).map((o: any) => [
      o.id as string,
      { label: String(o.label ?? ""), is_disqualifying: Boolean(o.is_disqualifying) },
    ]),
  );

  const answers: ClinicalAnswer[] = ((resp ?? []) as any[]).map((row) => {
    const value = answerValue(row, optMap);
    const prompt = row.questionnaire_questions?.prompt ?? "Question";
    return {
      id: row.id,
      prompt,
      answer: value.text,
      group: groupFor(prompt),
      redFlag: value.redFlag,
    };
  });

  const eligibility = ((elig ?? []) as any[]).map((row) => ({
    medicine_name: row.medicines?.name ?? "—",
    result: String(row.result ?? "—"),
    reason: (row.reason as string | null) ?? null,
  }));

  const redFlags: { label: string; detail: string }[] = [];
  for (const answer of answers) {
    if (answer.redFlag) redFlags.push({ label: answer.prompt, detail: answer.answer });
  }
  for (const row of eligibility) {
    if (row.result && row.result !== "eligible") {
      redFlags.push({
        label: `${row.medicine_name}: ${row.result}`,
        detail: row.reason ?? "Eligibility check flagged this medicine.",
      });
    }
  }

  const byGroup = (group: IntakeGroup) => answers.filter((a) => a.group === group);
  const height = session?.height_cm ?? null;
  const weight = session?.weight_kg ?? null;

  return {
    filled: answers.length > 0,
    goals: ((cats ?? []) as any[])
      .map((c) => c.medication_categories?.name)
      .filter(Boolean),
    height_cm: height,
    weight_kg: weight,
    bmi: bmiFrom(height, weight),
    allergies: byGroup("allergies"),
    medications: byGroup("medications"),
    history: byGroup("history"),
    other: byGroup("other"),
    red_flags: redFlags,
    eligibility,
  };
}

export async function loadPastOrders(
  supabaseAdmin: any,
  opts: {
    requestId: string;
    userId?: string | null;
    sessionId?: string | null;
    excludeIds?: string[];
  },
): Promise<PastOrder[]> {
  if (!opts.userId && !opts.sessionId) return [];
  const hidden = new Set([opts.requestId, ...(opts.excludeIds ?? [])]);
  let q = supabaseAdmin
    .from("medication_requests")
    .select("id, medicine_id, kind, status, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  q = opts.userId ? q.eq("user_id", opts.userId) : q.eq("session_id", opts.sessionId);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  const list = ((rows ?? []) as any[]).filter((row) => !hidden.has(row.id)).slice(0, 20);
  if (list.length === 0) return [];

  const medIds = Array.from(new Set(list.map((row) => row.medicine_id).filter(Boolean)));
  const ids = list.map((row) => row.id);
  const [{ data: meds }, { data: notes }] = await Promise.all([
    medIds.length
      ? supabaseAdmin.from("medicines").select("id, name").in("id", medIds)
      : Promise.resolve({ data: [] as any[] }),
    supabaseAdmin
      .from("medication_request_notes")
      .select("id, request_id, body, created_at")
      .in("request_id", ids)
      .order("created_at", { ascending: true }),
  ]);
  const medMap = new Map((meds ?? []).map((m: any) => [m.id, m.name]));
  const notesByRequest = new Map<string, PastOrder["notes"]>();
  for (const note of (notes ?? []) as any[]) {
    const bucket = notesByRequest.get(note.request_id) ?? [];
    bucket.push({ id: note.id, body: note.body, created_at: note.created_at });
    notesByRequest.set(note.request_id, bucket);
  }

  return list.map((row) => ({
    id: row.id,
    medicine_name: String(medMap.get(row.medicine_id) ?? "—"),
    kind: row.kind,
    status: row.status,
    created_at: row.created_at,
    notes: notesByRequest.get(row.id) ?? [],
  }));
}
