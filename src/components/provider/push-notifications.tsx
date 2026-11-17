import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  getPushStatus,
  removePushSubscription,
  savePushSubscription,
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
  keys?: {
    hasPublicKey: boolean;
    hasPrivateKey: boolean;
    hasSubject: boolean;
  };
  dbOk?: boolean;
  reason?: string | null;
};

export function PushNotificationsCard() {
  const fetchStatus = useServerFn(getPushStatus);
  const saveSub = useServerFn(savePushSubscription);
  const removeSub = useServerFn(removePushSubscription);

  const [status, setStatus] = useState<Status | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(true);

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    const next = (await fetchStatus({ data: undefined as never })) as Status;
    setStatus(next);
    if (!("PushManager" in window) || !("Notification" in window)) {
      setSupported(false);
      setEnabled(false);
      setLoading(false);
      return next;
    }
    const reg = await getRegistration();
    const local = reg ? await reg.pushManager.getSubscription() : null;
    setEnabled(Boolean(local && next.endpoints.includes(local.endpoint)));
    setLoading(false);
    return next;
  }

  useEffect(() => {
    void refresh().catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[push] status load failed:", err);
      setLoadError(message.slice(0, 240));
      setLoading(false);
    });
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const current = status ?? (await refresh());
      if (!current?.configured || !current.vapidPublicKey) {
        toast.error(current?.reason || "Push alerts are not configured on the server yet.");
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

  const configured = Boolean(status?.configured);

  let detail: string;
  if (!supported) {
    detail = "This browser does not support Web Push.";
  } else if (loading) {
    detail = "Checking push setup…";
  } else if (loadError) {
    detail = "Could not load push status. Refresh and try again.";
  } else if (!configured) {
    detail = "Not configured on the server yet (missing VAPID keys).";
  } else if (enabled) {
    detail = "On for this device. Alerts can show even when this tab is closed.";
  } else {
    detail = "Off for this device. Turn on to get alerts when this tab is closed.";
  }

  return (
    <div className="rounded-[8px] border border-[#D5DEDD] bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#3B4759]">Push notifications</p>
          <p className="text-xs text-[#3B4759]/70">{detail}</p>
        </div>
        <Switch
          checked={enabled}
          disabled={busy || loading || !supported || !configured}
          onCheckedChange={(value) => void onToggle(value)}
          aria-label="Toggle push notifications"
        />
      </div>
    </div>
  );
}
