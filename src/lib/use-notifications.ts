import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyNotifications,
  markNotificationsRead,
  type AppNotification,
} from "@/lib/notifications.functions";

export const notificationsQueryKey = ["notifications"] as const;

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

/**
 * Shared notifications query + a single realtime subscription.
 * Both the sidebar badge and the notifications page use this, so they
 * share one cache entry and one Supabase channel.
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const fetchNotifications = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationsRead);

  const { data, isLoading } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => fetchNotifications({ data: undefined as never }),
    refetchInterval: 60_000,
  });

  const mark = useMutation({
    mutationFn: (vars: { id?: string; all?: boolean }) => markRead({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId || cancelled) return;
      channel = supabase
        .channel("notifications-feed")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const items: AppNotification[] = data?.items ?? [];

  return { items, unread: data?.unread ?? 0, isLoading, mark };
}
