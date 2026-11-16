import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const webpush = require("web-push") as {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload?: string | Buffer | null,
  ) => Promise<unknown>;
};

export type PushPayload = {
  title: string;
  body?: string | null;
  url?: string | null;
};

type PushRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

function vapidConfig() {
  const publicKey =
    process.env.VAPID_PUBLIC_KEY?.trim() || process.env.VITE_VAPID_PUBLIC_KEY?.trim() || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:ithelp@bodyinc.com";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function isPushConfigured(): boolean {
  return vapidConfig() !== null;
}

export function publicVapidKey(): string | null {
  return (
    process.env.VITE_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    null
  );
}

/** Send a Web Push to every registered device for this provider user. */
export async function sendPushToUser(
  supabaseAdmin: any,
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  const vapid = vapidConfig();
  if (!vapid) {
    console.warn("[push] VAPID keys not configured; skipping send");
    return { sent: 0, removed: 0 };
  }

  const title = payload.title?.trim();
  if (!title) return { sent: 0, removed: 0 };

  const { data, error } = await supabaseAdmin
    .from("provider_push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", userId);
  if (error) {
    console.error("[push] failed to load subscriptions:", error.message);
    return { sent: 0, removed: 0 };
  }

  const rows = (data ?? []) as PushRow[];
  if (!rows.length) return { sent: 0, removed: 0 };

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const body = JSON.stringify({
    title,
    body: payload.body?.trim() || "",
    url: payload.url?.trim() || "/provider/notifications",
  });

  let sent = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
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

  return { sent, removed: expiredIds.length };
}
