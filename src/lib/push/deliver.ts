import { sendPushToUser, type PushSendResult } from "@/lib/push/send";

const PUSH_CLAIM = "push_delivered";
const PUSH_PERIOD = "once";
const RETRY_WINDOW_MS = 10 * 60 * 1000;
const SWEEP_GAP_MS = 60 * 1000;

type Claim = "claimed" | "duplicate" | "unavailable";

type PushRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
};

let lastSweep = 0;

async function claimPush(db: any, notificationId: string): Promise<Claim> {
  const { error } = await db.from("email_reminders").insert({
    reminder_type: PUSH_CLAIM,
    target_id: notificationId,
    period_key: PUSH_PERIOD,
  });
  if (!error) return "claimed";
  if (error.code === "23505") return "duplicate";
  console.warn("[push] delivery claim unavailable:", error.message);
  return "unavailable";
}

async function releasePush(db: any, notificationId: string) {
  const { error } = await db
    .from("email_reminders")
    .delete()
    .eq("reminder_type", PUSH_CLAIM)
    .eq("target_id", notificationId)
    .eq("period_key", PUSH_PERIOD);
  if (error) console.warn("[push] failed to release delivery claim:", error.message);
}

/**
 * One phone alert per notification. The insert webhook may send even when the
 * claim table is unavailable. The backup sweep only sends after it wins the claim,
 * so a lock problem cannot fan out extra alerts.
 */
export async function deliverNotificationPush(
  db: any,
  row: PushRow,
  opts?: { sendWithoutClaim?: boolean },
): Promise<PushSendResult & { skipped?: boolean }> {
  const claim = await claimPush(db, row.id);
  if (claim === "duplicate") return { sent: 0, removed: 0, pending: false, skipped: true };
  if (claim === "unavailable" && !opts?.sendWithoutClaim) {
    return { sent: 0, removed: 0, pending: false, skipped: true };
  }

  const payload = {
    title: row.title,
    body: row.body,
    url: row.link || "/provider/notifications",
    tag: row.id,
  };
  let result: PushSendResult;
  try {
    result = await sendPushToUser(db, row.user_id, payload);
    if (result.pending) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      result = await sendPushToUser(db, row.user_id, payload);
    }
  } catch (err) {
    if (claim === "claimed") await releasePush(db, row.id);
    throw err;
  }

  if (claim === "claimed" && result.pending) await releasePush(db, row.id);
  return result;
}

/**
 * Backup for the insert webhook. Runs at most once a minute per server,
 * and only for unread alerts from the last 10 minutes. Already-delivered
 * alerts are skipped by the claim, so this does not send a second push.
 */
export async function retryUnsentPushes(): Promise<void> {
  const now = Date.now();
  if (now - lastSweep < SWEEP_GAP_MS) return;
  lastSweep = now;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(now - RETRY_WINDOW_MS).toISOString();
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id, user_id, title, body, link")
      .is("read_at", null)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.warn("[push] retry lookup failed:", error.message);
      return;
    }
    for (const row of (data ?? []) as PushRow[]) {
      try {
        await deliverNotificationPush(supabaseAdmin, row);
      } catch (err) {
        console.warn("[push] retry failed:", err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.warn("[push] retry skipped:", err instanceof Error ? err.message : err);
  }
}
