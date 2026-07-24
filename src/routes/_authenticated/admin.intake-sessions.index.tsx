import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
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
import { adminPageTitle, adminPageSubtitle, adminInput, adminSelect } from "@/lib/admin-ui";

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
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h2 className={adminPageTitle}>Intake Sessions</h2>
          <p className={adminPageSubtitle}>
            Patient intake responses, eligibility results, and selected plans.
          </p>
        </div>
        <RefreshButton onClick={() => q.refetch()} loading={q.isFetching} />
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2E00AB]/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone"
            className={`${adminInput} pl-9`}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className={`${adminSelect} sm:w-44`}>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="payment_pending">Payment pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={claimed} onValueChange={(v) => setClaimed(v as any)}>
          <SelectTrigger className={`${adminSelect} sm:w-40`}>
            <SelectValue placeholder="All sessions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sessions</SelectItem>
            <SelectItem value="claimed">Claimed</SelectItem>
            <SelectItem value="unclaimed">Unclaimed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="admin-table-wrap m-0 w-full">
        <div className="admin-table-scroll">
          <Table className="min-w-[720px]">
            <TableHeader className="bg-[#FDFDFF]">
              <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
                <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">Name</TableHead>
                <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">Email</TableHead>
                <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">State</TableHead>
                <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">Sex</TableHead>
                <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">Plan</TableHead>
                <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">Status</TableHead>
                <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">Created</TableHead>
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
                  className="cursor-pointer border-b border-[#EAE6FA] hover:bg-[#F5F3FF]/40 transition-colors"
                  onClick={() =>
                    navigate({ to: "/admin/intake-sessions/$sessionId", params: { sessionId: s.id } })
                  }
                >
                  <TableCell className="font-semibold text-[#2E00AB] text-[14px]">
                    {s.full_name || "—"}
                  </TableCell>
                  <TableCell className="text-[#2E00AB]/70 font-medium text-[14px]">
                    {s.email || "—"}
                  </TableCell>
                  <TableCell className="text-[#2E00AB] font-medium text-[14px]">
                    {s.state_code || "—"}
                  </TableCell>
                  <TableCell className="capitalize text-[#2E00AB]/70 font-medium text-[14px]">
                    {s.sex || "—"}
                  </TableCell>
                  <TableCell className="text-[#2E00AB] font-medium text-[14px]">
                    {s.plan_name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`font-bold text-[12px] px-2.5 py-0.5 rounded-lg shadow-none normal-case tracking-normal border border-transparent ${
                        s.status === "completed"
                          ? "bg-[#F3E5F5] text-[#6B5AE0] hover:bg-[#F3E5F5]"
                          : s.status === "payment_pending"
                          ? "bg-[#F3E5F5] text-[#6B5AE0] hover:bg-[#F3E5F5]"
                          : s.status === "abandoned"
                          ? "bg-[#F3E5F5] text-[#6B5AE0] hover:bg-[#F3E5F5]"
                          : "bg-[#F3E5F5] text-[#6B5AE0] hover:bg-[#F3E5F5]"
                      }`}
                    >
                      {s.status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#2E00AB]/70 font-medium text-[14px]">
                    {formatDate(s.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}