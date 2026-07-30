import { Card } from "@/components/ui/card";
import { requestStatusLabel } from "@/lib/request-status";

export function StatusBreakdown({ rows }: { rows: Array<{ status: string; count: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card className="rounded-2xl border border-[#D5DEDD] bg-white p-5 shadow-none">
      <h3 className="text-[16px] font-semibold text-[#3B4759]">Orders by status</h3>
      <p className="text-[13px] text-[#3B4759]/60">All orders currently in the system.</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#3B4759]/50">No orders yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.status}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-[#3B4759]">{requestStatusLabel(r.status)}</span>
                <span className="font-semibold text-[#3B4759]/70">{r.count}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#E8EEED]">
                <div
                  className="h-full rounded-full bg-[#6A9B9C]"
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