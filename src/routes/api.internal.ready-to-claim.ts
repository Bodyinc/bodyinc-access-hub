import { createFileRoute } from "@tanstack/react-router";

/**
 * Called from Supabase pg_net when intake becomes finished (or an order becomes
 * claimable). Email + in-app (+ push webhook) go to licensed providers.
 */
export const Route = createFileRoute("/api/internal/ready-to-claim")({
  server: {
    handlers: {
      GET: () => run(),
      POST: () => run(),
    },
  },
});

async function run(): Promise<Response> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyProvidersPatientReadyToClaim } = await import("@/lib/email.notifications");
    await notifyProvidersPatientReadyToClaim(supabaseAdmin);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[notify] ready-to-claim webhook failed:", error);
    return Response.json({ ok: false, error: "Ready-to-claim notify failed." }, { status: 500 });
  }
}
