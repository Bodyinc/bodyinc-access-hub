export type VapidDiagnostics = {
  hasPublicKey: boolean;
  hasPrivateKey: boolean;
  hasSubject: boolean;
};

/** Dynamic lookup so Vite/Nitro cannot replace these with empty build-time values. */
function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

export function vapidConfig() {
  const publicKey = env("VAPID_PUBLIC_KEY") || env("VITE_VAPID_PUBLIC_KEY");
  const privateKey = env("VAPID_PRIVATE_KEY");
  const subject = env("VAPID_SUBJECT") || "mailto:ithelp@bodyinc.com";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function vapidDiagnostics(): VapidDiagnostics {
  return {
    hasPublicKey: Boolean(env("VAPID_PUBLIC_KEY") || env("VITE_VAPID_PUBLIC_KEY")),
    hasPrivateKey: Boolean(env("VAPID_PRIVATE_KEY")),
    hasSubject: Boolean(env("VAPID_SUBJECT")),
  };
}

export function isPushConfigured(): boolean {
  return vapidConfig() !== null;
}

export function publicVapidKey(): string | null {
  return env("VITE_VAPID_PUBLIC_KEY") || env("VAPID_PUBLIC_KEY") || null;
}
