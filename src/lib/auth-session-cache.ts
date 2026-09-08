import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// supabase.auth.getSession() takes a navigator lock and was being called on every
// route guard and every server-function click. Keep the current session in memory
// and refresh it from onAuthStateChange so clicks stay off that lock.

let session: Session | null | undefined;
let inflight: Promise<Session | null> | null = null;
let listening = false;

function listen(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  supabase.auth.onAuthStateChange((_event, next) => {
    session = next;
  });
}

export function getCachedAccessToken(): string | undefined {
  return session?.access_token;
}

export async function ensureSession(): Promise<Session | null> {
  listen();
  if (session !== undefined) return session;
  inflight ??= supabase.auth.getSession().then(({ data }) => {
    session = data.session;
    inflight = null;
    return session;
  });
  return inflight;
}
