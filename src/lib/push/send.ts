import { sendNotification, setVapidDetails } from "web-push";
import { vapidConfig } from "@/lib/push/config";

export type PushPayload = {
  title: string;
  body?: string | null;
  url?: string | null;
  /** Same tag replaces an existing alert instead of stacking a second one. */
  tag?: string | null;
};

export type PushSendResult = {
  sent: number;
  removed: number;
  /** True when a later attempt could still deliver. No devices is not pending. */
  pending: boolean;
};

type PushRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

export {
  isPushConfigured,
  publicVapidKey,
  vapidDiagnostics,
  vapidConfig,
} from "@/lib/push/config";
export type { VapidDiagnostics } from "@/lib/push/config";

/** Send a Web Push to every registered device for this provider user. */
export async function sendPushToUser(
  supabaseAdmin: any,
  userId: string,
  payload: PushPayload,
): Promise<PushSendResult> {
  const vapid = vapidConfig();
  if (!vapid) {
    console.warn("[push] VAPID keys not configured; skipping send");
    return { sent: 0, removed: 0, pending: true };
  }

  const title = payload.title?.trim();
  if (!title) return { sent: 0, removed: 0, pending: false };

  const { data, error } = await supabaseAdmin
    .from("provider_push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", userId);
  if (error) {
    console.error("[push] failed to load subscriptions:", error.message);
    return { sent: 0, removed: 0, pending: true };
  }

  const rows = (data ?? []) as PushRow[];
  if (!rows.length) return { sent: 0, removed: 0, pending: false };

  setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const body = JSON.stringify({
    title,
    body: payload.body?.trim() || "",
    url: payload.url?.trim() || "/provider/notifications",
    tag: payload.tag?.trim() || undefined,
  });

  let sent = 0;
  let retryable = false;
  const expiredIds: string[] = [];

  await Promise.all(
    rows.map(async (row) => {
      try {
        await sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth_key },
          },
          body,
        );
        sent += 1;
      } catch (err: any) {
        const status = err?.statusCode ?? err?.status;
        if (status === 404 || status === 410) {
          expiredIds.push(row.id);
          return;
        }
        retryable = true;
        console.error("[push] send failed:", err?.message ?? err);
      }
    }),
  );

  if (expiredIds.length) {
    const { error: delErr } = await supabaseAdmin
      .from("provider_push_subscriptions")
      .delete()
      .in("id", expiredIds);
    if (delErr) console.error("[push] failed to drop expired endpoints:", delErr.message);
  }

  return { sent, removed: expiredIds.length, pending: sent === 0 && retryable };
}
