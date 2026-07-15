import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listActivityLog } from "@/lib/activity-log.functions";

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function summarize(before: unknown, after: unknown) {
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = Object.keys(a);
  if (keys.length === 0) return "—";
  const b = (before ?? {}) as Record<string, unknown>;
  return keys
    .map((k) => `${k}: ${JSON.stringify(b[k]) ?? "—"} → ${JSON.stringify(a[k])}`)
    .join(", ");
}

export function ActivityLogTab() {
  const listFn = useServerFn(listActivityLog);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin-activity-log", { search: debounced, page }],
    queryFn: () => listFn({ data: { search: debounced || undefined, page, limit: 20 } }),
  });

  const rows = query.data?.data ?? [];
  const totalPages = query.data?.total_pages ?? 0;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#6B5AE0]/50" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by action or entity"
          className="h-10 rounded-xl border-[#E2DCFA] bg-white pl-9 text-[14px] font-semibold text-[#2A00A2] placeholder:text-[#6B5AE0]/40 focus-visible:ring-[#4A3AFF]"
        />
      </div>

      <Card className="w-full overflow-hidden rounded-2xl border border-[#EAE6FA] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader className="bg-[#FDFDFF]">
              <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
                <TableHead className="h-11 text-[13px] font-bold text-[#2A00A2]">When</TableHead>
                <TableHead className="h-11 text-[13px] font-bold text-[#2A00A2]">Admin</TableHead>
                <TableHead className="h-11 text-[13px] font-bold text-[#2A00A2]">Action</TableHead>
                <TableHead className="h-11 text-[13px] font-bold text-[#2A00A2]">Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-[14px] font-semibold text-[#6B5AE0]/60"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {query.isError && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-[14px] font-semibold text-[#FF4D6D]"
                  >
                    {(query.error as Error).message}
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-[14px] font-semibold text-[#6B5AE0]/60"
                  >
                    No activity yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="border-b border-[#EAE6FA]/50 hover:bg-[#F5F3FF]/40">
                  <TableCell className="whitespace-nowrap text-[13px] text-[#2A00A2]/80">
                    {formatDateTime(r.created_at)}
                  </TableCell>
                  <TableCell className="text-[13px]">
                    <p className="font-semibold text-[#2A00A2]">{r.admin_name ?? "—"}</p>
                    <p className="text-xs text-[#6B5AE0]/70">{r.admin_email ?? ""}</p>
                  </TableCell>
                  <TableCell className="font-mono text-[12px] text-[#2A00A2]">{r.action}</TableCell>
                  <TableCell className="max-w-[420px] text-[12px] text-[#6B5AE0]/80">
                    {summarize(r.before, r.after)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || query.isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 rounded-xl border-[#E2DCFA] text-[#2A00A2]"
          >
            Previous
          </Button>
          <span className="text-[13px] font-semibold text-[#6B5AE0]/70">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || query.isFetching}
            onClick={() => setPage((p) => p + 1)}
            className="h-8 rounded-xl border-[#E2DCFA] text-[#2A00A2]"
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
