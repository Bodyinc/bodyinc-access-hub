import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export function TopMedicines({
  rows,
  days,
}: {
  rows: Array<{ id: string; name: string; count: number }>;
  days: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card className="rounded-2xl border border-[#D5DEDD] bg-white p-5 shadow-none">
      <h3 className="text-[16px] font-semibold text-[#3B4759]">Top medications</h3>
      <p className="text-[13px] text-[#3B4759]/60">By order volume in the last {days} days.</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#3B4759]/50">Nothing ordered yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="truncate pr-3 font-medium text-[#3B4759]">{r.name}</span>
                <span className="font-semibold text-[#3B4759]/70">{r.count}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#E8EEED]">
                <div
                  className="h-full rounded-full bg-[#E3E084]"
                  style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export function ActivityFeed({
  rows,
}: {
  rows: Array<{
    id: string;
    action: string;
    entity: string;
    created_at: string;
    admin_name: string | null;
  }>;
}) {
  return (
    <Card className="rounded-2xl border border-[#D5DEDD] bg-white p-5 shadow-none">
      <h3 className="text-[16px] font-semibold text-[#3B4759]">Recent admin activity</h3>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#3B4759]/50">No activity yet.</p>
        ) : (
          rows.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#6A9B9C]" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#3B4759]">
                  {a.admin_name ?? "System"} · <span className="font-mono">{a.action}</span>
                </p>
                <p className="text-[12px] text-[#3B4759]/55">
                  {a.entity} · {formatDateTime(a.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
