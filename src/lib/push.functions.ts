import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPushConfigured, publicVapidKey, sendPushToUser } from "@/lib/push/send";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const getPushStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const configured = isPushConfigured();
    const vapidPublicKey = publicVapidKey();
    const { data, error } = await context.supabase
      .from("provider_push_subscriptions")
      .select("id, endpoint")
      .eq("user_id", context.userId)
      .limit(20);
    if (error) throw new Error(error.message);
    return {
      configured: configured && Boolean(vapidPublicKey),
      vapidPublicKey,
      subscriptionCount: data?.length ?? 0,
      endpoints: (data ?? []).map((row: { endpoint: string }) => row.endpoint),
    };
  });

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => subscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (!isPushConfigured()) {
      return { ok: false as const, error: "Push is not configured on the server." };
    }
    const now = new Date().toISOString();
    const { error } = await context.supabase.from("provider_push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth_key: data.keys.auth,
        updated_at: now,
      },
      { onConflict: "user_id,endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ endpoint: z.string().url().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("provider_push_subscriptions")
      .delete()
      .eq("user_id", context.userId);
    if (data.endpoint) q = q.eq("endpoint", data.endpoint);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isPushConfigured()) {
      return { ok: false as const, error: "Push is not configured on the server." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await sendPushToUser(supabaseAdmin, context.userId, {
      title: "Body Inc test notification",
      body: "Push alerts are working for your provider account.",
      url: "/provider/notifications",
    });
    if (result.sent === 0) {
      return {
        ok: false as const,
        error:
          result.removed > 0
            ? "Your push subscription expired. Enable alerts again."
            : "No push subscription found for this device. Enable alerts first.",
      };
    }
    return { ok: true as const, sent: result.sent };
  });
