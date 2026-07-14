import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listIntakeSessions } from "@/lib/intake-sessions.functions";
import { RefreshButton } from "@/components/admin/refresh-button";

export const Route = createFileRoute("/_authenticated/admin/intake-sessions/")({
  component: IntakeSessionsListPage,
});

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IntakeSessionsListPage() {
  const navigate = useNavigate();
  const list = useServerFn(listIntakeSessions);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState<string>("all");
  const [claimed, setClaimed] = useState<"all" | "claimed" | "unclaimed">("all");

  const q = useQuery({
    queryKey: ["admin-intake-sessions", { search: debounced, status, claimed }],
    queryFn: () => list({ data: { search: debounced || undefined, status, claimed } }),
  });

  return (
    // FIX: Replaced constrained layout wrappers with left-aligned, zero-margin canvas block matching your design system
    <div className="w-full text-left m-0 p-0 space-y-5 max-w-none">
      
      {/* Title & Description Banner */}
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="space-y-0.5">
          <h2 className="text-[26px] font-bold text-[#2A00A2] tracking-tight">Intake Sessions</h2>
          <p className="text-sm text-[#6B5AE0]/70 font-medium">
            Patient intake responses, eligibility results, and selected plans.
          </p>
        </div>
        <RefreshButton onClick={() => q.refetch()} loading={q.isFetching} />
      </div>

      {/* Action Filters Panel */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#6B5AE0]/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="pl-9 h-10 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px] placeholder:text-[#6B5AE0]/40 bg-white"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44 h-10 rounded-xl border-[#E2DCFA] bg-white text-[#2A00A2] font-semibold text-[14px] shadow-none">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[#E2DCFA]">
            <SelectItem value="all" className="font-medium text-[#2A00A2]">All statuses</SelectItem>
            <SelectItem value="in_progress" className="font-medium text-[#2A00A2]">In progress</SelectItem>
            <SelectItem value="payment_pending" className="font-medium text-[#2A00A2]">Payment pending</SelectItem>
            <SelectItem value="completed" className="font-medium text-[#2A00A2]">Completed</SelectItem>
            <SelectItem value="abandoned" className="font-medium text-[#2A00A2]">Abandoned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={claimed} onValueChange={(v) => setClaimed(v as any)}>
          <SelectTrigger className="w-40 h-10 rounded-xl border-[#E2DCFA] bg-white text-[#2A00A2] font-semibold text-[14px] shadow-none">
            <SelectValue placeholder="All sessions" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[#E2DCFA]">
            <SelectItem value="all" className="font-medium text-[#2A00A2]">All sessions</SelectItem>
            <SelectItem value="claimed" className="font-medium text-[#2A00A2]">Claimed</SelectItem>
            <SelectItem value="unclaimed" className="font-medium text-[#2A00A2]">Unclaimed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Table Matrix */}
      <Card className="w-full overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl max-w-none m-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader className="bg-[#FDFDFF]">
              <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Name</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Email</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">State</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Sex</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Plan</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Status</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && (
                <TableRow className="border-b border-[#EAE6FA]/50">
                  <TableCell colSpan={7} className="py-12 text-center text-[#6B5AE0]/60 font-semibold text-[14px]">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {q.isError && (
                <TableRow className="border-b border-[#EAE6FA]/50">
                  <TableCell colSpan={7} className="py-12 text-center text-[#6B5AE0] font-semibold text-[14px]">
                    {(q.error as Error).message}
                  </TableCell>
                </TableRow>
              )}
              {!q.isLoading && q.data?.length === 0 && (
                <TableRow className="border-b border-[#EAE6FA]/50">
                  <TableCell colSpan={7} className="py-12 text-center text-[#6B5AE0]/60 font-semibold text-[14px]">
                    No sessions found.
                  </TableCell>
                </TableRow>
              )}
              {q.data?.map((s: any) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer border-b border-[#EAE6FA]/50 hover:bg-[#F5F3FF]/40 transition-colors"
                  onClick={() =>
                    navigate({ to: "/admin/intake-sessions/$sessionId", params: { sessionId: s.id } })
                  }
                >
                  <TableCell className="font-bold text-[#2A00A2] text-[14px]">
                    {s.full_name || "—"}
                  </TableCell>
                  <TableCell className="text-[#6B5AE0] font-semibold text-[14px]">
                    {s.email || "—"}
                  </TableCell>
                  <TableCell className="text-[#2A00A2] font-semibold text-[14px]">
                    {s.state_code || "—"}
                  </TableCell>
                  <TableCell className="capitalize text-[#6B5AE0] font-medium text-[14px]">
                    {s.sex || "—"}
                  </TableCell>
                  <TableCell className="text-[#2A00A2] font-semibold text-[14px]">
                    {s.plan_name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`font-bold text-[12px] px-2.5 py-0.5 rounded-lg shadow-none normal-case tracking-normal border border-transparent ${
                        s.status === "completed"
                          ? "bg-[#E8F5E9] text-[#6B5AE0] hover:bg-[#E8F5E9]"
                          : s.status === "payment_pending"
                          ? "bg-[#FFF3E0] text-[#6B5AE0] hover:bg-[#FFF3E0]"
                          : s.status === "abandoned"
                          ? "bg-[#FFEBEE] text-[#6B5AE0] hover:bg-[#FFEBEE]"
                          : "bg-[#F3E5F5] text-[#6B5AE0] hover:bg-[#F3E5F5]"
                      }`}
                    >
                      {s.status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#6B5AE0] font-medium text-[14px]">
                    {formatDate(s.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}