import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
import { listRequests } from "@/lib/requests.functions";
import { RefreshButton } from "@/components/admin/refresh-button";
import {
  requestStatusLabel,
  requestStatusTone,
  REQUEST_STATUS_BADGE,
} from "@/lib/request-status";
import { adminPageTitle, adminPageSubtitle, adminInput, adminSelect } from "@/lib/admin-ui";

const STATUS_FILTERS = [
  { value: "open", label: "Open" },
  { value: "all", label: "All" },
  { value: "pending_review", label: "Under review" },
  { value: "awaiting_additional_payment", label: "Awaiting payment" },
  { value: "approved", label: "Approved" },
  { value: "prescribed", label: "Prescribed" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
  { value: "rejected", label: "Rejected" },
];

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

export function RequestList({
  title,
  subtitle,
  showProvider,
  onOpen,
}: {
  title: string;
  subtitle: string;
  showProvider: boolean;
  onOpen: (id: string) => void;
}) {
  const list = useServerFn(listRequests);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState<string>("open");

  const query = useQuery({
    queryKey: ["requests", { search: debounced, status }],
    queryFn: () => list({ data: { search: debounced || undefined, status } }),
  });

  const rows = (query.data as any[]) ?? [];

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h1 className={adminPageTitle}>{title}</h1>
          <p className={adminPageSubtitle}>{subtitle}</p>
        </div>
        <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2E00AB]/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient, email, or medicine…"
            className={`${adminInput} pl-10`}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className={`${adminSelect} sm:w-56`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="font-['DM_Sans',sans-serif]">
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-[16px] text-[#2E00AB]">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="admin-card w-full min-w-0 overflow-hidden rounded-xl border border-[#EAE6FA] bg-white">
        <div className="admin-table-scroll">
          <Table className="min-w-[720px]">
            <TableHeader className="bg-[#FDFDFF]">
              <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
                <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">Patient</TableHead>
                <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">Medication</TableHead>
                {showProvider ? (
                  <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">Provider</TableHead>
                ) : null}
                <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">Status</TableHead>
                <TableHead className="h-11 text-[13px] font-semibold text-[#2E00AB]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                <TableRow>
                  <TableCell colSpan={showProvider ? 5 : 4} className="py-12 text-center text-[14px] font-medium text-[#2E00AB]/60">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showProvider ? 5 : 4} className="py-12 text-center text-[14px] font-medium text-[#2E00AB]/60">
                    No orders.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.id}
                    onClick={() => onOpen(r.id)}
                    className="cursor-pointer border-b border-[#EAE6FA] transition-colors hover:bg-[#F5F3FF]/40"
                  >
                    <TableCell className="text-[14px] font-medium text-[#2E00AB]">
                      <div>{r.customer_name ?? (r.is_guest ? "Guest" : "—")}</div>
                      <div className="text-[12px] text-[#2E00AB]/60">{r.customer_email ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-[14px] font-medium text-[#2E00AB]">
                      {r.medicine_name}
                      {r.kind === "followup" ? (
                        <span className="ml-2 text-[12px] text-[#2E00AB]/50">renewal</span>
                      ) : null}
                    </TableCell>
                    {showProvider ? (
                      <TableCell className="text-[14px] font-medium text-[#2E00AB]/80">
                        {r.provider_name ?? "Unassigned"}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <Badge
                        className={`rounded-lg border border-transparent px-2.5 py-0.5 text-[12px] font-semibold normal-case tracking-normal shadow-none ${
                          REQUEST_STATUS_BADGE[requestStatusTone(r.status)]
                        }`}
                      >
                        {requestStatusLabel(r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[14px] font-medium text-[#2E00AB]/70">
                      {formatDate(r.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
