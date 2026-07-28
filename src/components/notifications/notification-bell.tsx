import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyNotifications,
  markNotificationsRead,
  type AppNotification,
} from "@/lib/notifications.functions";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchNotifications = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationsRead);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications({ data: undefined as never }),
    refetchInterval: 60_000,
  });

  const mark = useMutation({
    mutationFn: (vars: { id?: string; all?: boolean }) => markRead({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Live updates: any new row for me invalidates the list.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId || cancelled) return;
      channel = supabase
        .channel("notifications-bell")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const items: AppNotification[] = data?.items ?? [];
  const unread = data?.unread ?? 0;

  function open(n: AppNotification) {
    if (!n.read_at) mark.mutate({ id: n.id });
    if (n.link) navigate({ to: n.link });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className="relative flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#D5DEDD] bg-white text-[#3B4759] transition-colors hover:bg-[#E8EEED]"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B8684B] px-1 text-[11px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[340px] border-[#D5DEDD] bg-white p-0 text-[#3B4759]"
      >
        <div className="flex items-center justify-between border-b border-[#D5DEDD] px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => mark.mutate({ all: true })}
              className="text-xs font-medium text-[#6A9B9C] hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-[#3B4759]/60">
              You&apos;re all caught up.
            </p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => open(n)}
                className={`flex w-full items-start gap-2 border-b border-[#E8EEED] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[#E8EEED] ${
                  n.read_at ? "" : "bg-[#E8EEED]/50"
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.read_at ? "bg-transparent" : "bg-[#6A9B9C]"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{n.title}</span>
                  {n.body && (
                    <span className="mt-0.5 block text-xs text-[#3B4759]/70">{n.body}</span>
                  )}
                  <span className="mt-1 block text-[11px] text-[#3B4759]/50">
                    {timeAgo(n.created_at)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}