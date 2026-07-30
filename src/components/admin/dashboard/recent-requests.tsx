import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import {
  REQUEST_STATUS_BADGE,
  requestStatusLabel,
  requestStatusTone,
} from "@/lib/request-status";

export type RecentRequest = {
  id: string;
  status: string;
  created_at: string;
  medicine: string;
  patient: string;
  provider: string | null;
};

export function RecentRequests({ rows }: { rows: RecentRequest[] }) {
  return (
    <Card className="rounded-2xl border border-[#D5DEDD] bg-white p-5 shadow-none">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-[#3B4759]">Latest orders</h3>
          <p className="text-[13px] text-[#3B4759]/60">The eight most recent medication orders.</p>
        </div>
        <Link
          to="/admin/requests"
          className="text-[13px] font-semibold text-[#6A9B9C] hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 divide-y divide-[#D5DEDD]/60">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[#3B4759]/50">No orders yet.</p>
        ) : (
          rows.map((r) => (
            <Link
              key={r.id}
              to="/admin/requests/$requestId"
              params={{ requestId: r.id }}
              className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-[#F8FBFA]"
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-[#3B4759]">{r.patient}</p>
                <p className="truncate text-[12px] text-[#3B4759]/60">
                  {r.medicine} · {r.provider ?? "Unassigned"} · {formatDateTime(r.created_at)}
                </p>
              </div>
              <Badge
                className={`shrink-0 rounded-full border-0 px-3 py-1 text-[11px] font-semibold ${REQUEST_STATUS_BADGE[requestStatusTone(r.status)]}`}
              >
                {requestStatusLabel(r.status)}
              </Badge>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}