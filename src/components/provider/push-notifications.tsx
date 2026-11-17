import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  getPushStatus,
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
} from "@/lib/push.functions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

type Status = {
  configured: boolean;
  vapidPublicKey: string | null;
  subscriptionCount: number;
  endpoints: string[];
};

export function PushNotificationsCard() {
  const fetchStatus = useServerFn(getPushStatus);
  const saveSub = useServerFn(savePushSubscription);
  const removeSub = useServerFn(removePushSubscription);
  const testPush = useServerFn(sendTestPush);

  const [status, setStatus] = useState<Status | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  async function refresh() {
    const next = (await fetchStatus({ data: undefined as never })) as Status;
    setStatus(next);
    if (!("PushManager" in window) || !("Notification" in window)) {
      setSupported(false);
      setEnabled(false);
      return next;
    }
    const reg = await getRegistration();
    const local = reg ? await reg.pushManager.getSubscription() : null;
    setEnabled(Boolean(local && next.endpoints.includes(local.endpoint)));
    return next;
  }

  useEffect(() => {
    void refresh().catch((err) => {
      console.warn("[push] status load failed:", err);
    });
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const current = status ?? (await refresh());
      if (!current?.configured || !current.vapidPublicKey) {
        toast.error("Push alerts are not configured on the server yet.");
        return;
      }
      if (!("Notification" in window) || !("PushManager" in window)) {
        toast.error("This browser does not support push notifications.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission was denied.");
        return;
      }
      const reg = await getRegistration();
      if (!reg) {
        toast.error("App service worker is not ready yet. Refresh and try again.");
        return;
      }
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            current.vapidPublicKey,
          ) as BufferSource,
        });
      }
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        toast.error("Could not read the push subscription keys.");
        return;
      }
      const saved = await saveSub({
        data: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        },
      });
      if (!saved.ok) {
        toast.error(saved.error || "Could not save push subscription.");
        return;
      }
      setEnabled(true);
      await refresh();
      toast.success("Push alerts enabled for this device.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not enable push alerts.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await getRegistration();
      const local = reg ? await reg.pushManager.getSubscription() : null;
      if (local) {
        await removeSub({ data: { endpoint: local.endpoint } });
        await local.unsubscribe();
      } else {
        await removeSub({ data: {} });
      }
      setEnabled(false);
      await refresh();
      toast.success("Push alerts turned off for this device.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not disable push alerts.");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(next: boolean) {
    if (next) await enable();
    else await disable();
  }

  async function onTest() {
    setBusy(true);
    try {
      const result = await testPush({ data: undefined as never });
      if (!result.ok) {
        toast.error(result.error || "Test push failed.");
        return;
      }
      toast.success("Test notification sent.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Test push failed.");
    } finally {
      setBusy(false);
    }
  }

  const configured = Boolean(status?.configured);
  const showBanner = supported && configured && !enabled;

  return (
    <div className="space-y-3">
      {showBanner ? (
        <div className="flex flex-col gap-3 rounded-[8px] border border-[#D5DEDD] bg-[#F8FBFA] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#3B4759]">Enable lock-screen alerts</p>
            <p className="text-xs text-[#3B4759]/70">
              Get notified about assigned patients even when this tab is closed.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void enable()}
            className="rounded-[6px] bg-[#6A9B9C] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#5A8B8C] disabled:opacity-60"
          >
            Enable alerts
          </button>
        </div>
      ) : null}

      <div className="rounded-[8px] border border-[#D5DEDD] bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#3B4759]">Push notifications</p>
            <p className="text-xs text-[#3B4759]/70">
              {!supported
                ? "This browser does not support Web Push."
                : !configured
                  ? "Not configured on the server yet (missing VAPID keys)."
                  : enabled
                    ? "On for this device."
                    : "Off for this device."}
            </p>
          </div>
          <Switch
            checked={enabled}
            disabled={busy || !supported || !configured}
            onCheckedChange={(value) => void onToggle(value)}
            aria-label="Toggle push notifications"
          />
        </div>
        {enabled ? (
          <div className="mt-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onTest()}
              className="rounded-[6px] border border-[#D5DEDD] bg-white px-3 py-1.5 text-sm font-medium text-[#6A9B9C] transition-colors hover:bg-[#E8EEED] disabled:opacity-60"
            >
              Send a test notification
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
