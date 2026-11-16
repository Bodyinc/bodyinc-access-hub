import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z
  .object({
    id: z.string().uuid().optional(),
    record: z.object({ id: z.string().uuid() }).optional(),
  })
  .passthrough();

/** Called from the notifications INSERT trigger (pg_net). Delivers Web Push only. */
export const Route = createFileRoute("/api/internal/notification-push")({
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
        if (!id) return Response.json({ ok: false, error: "Missing notification id." }, { status: 400 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { sendPushToUser } = await import("@/lib/push/send");

          const { data: row, error } = await supabaseAdmin
            .from("notifications")
            .select("id, user_id, title, body, link")
            .eq("id", id)
            .maybeSingle();
          if (error) throw new Error(error.message);
          if (!row) return Response.json({ ok: false, error: "Notification not found." }, { status: 404 });

          const result = await sendPushToUser(supabaseAdmin, row.user_id, {
            title: row.title,
            body: row.body,
            url: row.link || "/provider/notifications",
          });
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[push] notification-push webhook failed:", e);
          return Response.json({ ok: false, error: "Failed to send push." }, { status: 500 });
        }
      },
    },
  },
});
