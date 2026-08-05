import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useNotifications, timeAgo } from "@/lib/use-notifications";
import type { AppNotification } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/provider/notifications")({
  head: () => ({
    meta: [{ title: "Notifications — Body Inc" }, { name: "robots", content: "noindex" }],
  }),
  component: ProviderNotificationsPage,
});

function ProviderNotificationsPage() {
  const navigate = useNavigate();
  const { items, unread, isLoading, mark } = useNotifications();

  function open(n: AppNotification) {
    if (!n.read_at) mark.mutate({ id: n.id });
    if (n.link) navigate({ to: n.link });
  }

  return (
    <div className="w-full min-w-0 max-w-none">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#3B4759]">Notifications</h1>
          <p className="text-sm text-[#3B4759]/60">
            {unread > 0 ? `${unread} unread` : "No unread notifications"}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => mark.mutate({ all: true })}
            className="rounded-[6px] border border-[#D5DEDD] bg-white px-3 py-1.5 text-sm font-medium text-[#6A9B9C] transition-colors hover:bg-[#E8EEED]"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[8px] border border-[#D5DEDD] bg-white">
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-[#3B4759]/60">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[#3B4759]/60">
            You&apos;re all caught up.
          </p>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => open(n)}
              className={`flex w-full items-start gap-3 border-b border-[#E8EEED] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#E8EEED] ${
                n.read_at ? "" : "bg-[#E8EEED]/50"
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  n.read_at ? "bg-transparent" : "bg-[#6A9B9C]"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[#3B4759]">{n.title}</span>
                {n.body && <span className="mt-0.5 block text-xs text-[#3B4759]/70">{n.body}</span>}
                <span className="mt-1 block text-[11px] text-[#3B4759]/50">
                  {timeAgo(n.created_at)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
