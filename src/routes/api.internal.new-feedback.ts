import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z
  .object({
    id: z.string().uuid().optional(),
    record: z.object({ id: z.string().uuid() }).optional(),
  })
  .passthrough();

export const Route = createFileRoute("/api/internal/new-feedback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ ok: false, error: "Invalid payload." }, { status: 400 });
        }
        const id = parsed.id ?? parsed.record?.id;
        if (!id) return Response.json({ ok: false, error: "Missing feedback id." }, { status: 400 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { notifyNewFeedbackIfNeeded } = await import("@/lib/email.notifications");
          const ok = await notifyNewFeedbackIfNeeded(supabaseAdmin, id);
          if (!ok) return Response.json({ ok: false, error: "Feedback not found." }, { status: 404 });
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[feedback] new-feedback webhook failed:", e);
          return Response.json({ ok: false, error: "Failed to notify." }, { status: 500 });
        }
      },
    },
  },
});
