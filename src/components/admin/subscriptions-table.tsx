import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshButton } from "@/components/admin/refresh-button";
import { listSubscriptions } from "@/lib/billing.functions";
import { Search } from "lucide-react";
import { adminInput } from "@/lib/admin-ui";

const CANCELLATION_LABELS: Record<string, string> = {
  achieved_goals: "Achieved goals",
  no_results: "No results",
  too_expensive: "Too expensive",
  pausing: "Pausing treatment",
  switching_provider: "Switching provider",
  wrong_medication: "Wrong medication",
  other: "Other",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function SubscriptionsTable() {
  const [search, setSearch] = useState("");
  const list = useServerFn(listSubscriptions);
  const query = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => list({ data: {} }),
  });

  const rows = useMemo(() => {
    const all = (query.data as any[]) ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return all;
    return all.filter(
      (r) =>
        (r.customer_name ?? "").toLowerCase().includes(s) ||
        (r.customer_email ?? "").toLowerCase().includes(s) ||
        (r.plan_name ?? "").toLowerCase().includes(s),
    );
  }, [query.data, search]);

  return (
    <div className="space-y-4">
      {/* Search and Refresh Bar styled to Figma mockup */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 w-full sm:max-w-[390px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2E00AB]/60" />
          <Input
            placeholder="Search by patient or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${adminInput} pl-10`}
          />
        </div>
        <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-scroll">
          <Table className="border-collapse min-w-[720px]">
            <TableHeader className="bg-white">
              <TableRow className="hover:bg-transparent border-b border-[#EAE6FA]">
                <TableHead className="h-14 text-[#2E00AB] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Patient</TableHead>
                <TableHead className="h-14 text-[#2E00AB] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Plan</TableHead>
                <TableHead className="h-14 text-[#2E00AB] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Amount</TableHead>
                <TableHead className="h-14 text-[#2E00AB] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Status</TableHead>
                <TableHead className="h-14 text-[#2E00AB] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Next billing</TableHead>
                <TableHead className="h-14 text-[#2E00AB] font-semibold text-[14px] px-6">Cancellation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-[15px] text-[#2E00AB]/70">
                    Loading rows...
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-[15px] text-[#2E00AB]/70">
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="border-b border-[#EAE6FA] hover:bg-[#F9F8FF] transition-colors">
                  <TableCell className="px-6 py-4 border-r border-[#EAE6FA]">
                    <div className="font-semibold text-[14px] text-[#2E00AB]">{r.customer_name ?? "—"}</div>
                    <div className="text-[12px] font-medium text-[#2E00AB]/70">{r.customer_email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-[14px] font-medium text-[#2E00AB]/80 border-r border-[#EAE6FA]">
                    {r.plan_name}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-[14px] font-semibold text-[#2E00AB] border-r border-[#EAE6FA]">
                    {formatCurrency(r.amount)}
                  </TableCell>
                  <TableCell className="px-6 py-4 border-r border-[#EAE6FA]">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge
                        className={`rounded-md px-3 py-1 text-[12px] font-bold shadow-none border ${
                          r.status === "active" || r.status === "trialing"
                            ? "bg-[#2E00AB] border-transparent text-white"
                            : "bg-white border-[#EAE6FA] text-[#2E00AB]"
                        }`}
                      >
                        {r.status}
                      </Badge>
                      {r.cancel_at_period_end ? (
                        <span className="text-[11px] font-semibold text-amber-600">Cancels at period end</span>
                      ) : null}
                    </div>
                  </TableCell>

                  {/* Next billing date */}
                  <TableCell className="px-6 py-4 text-[14px] font-medium text-[#2E00AB] border-r border-[#EAE6FA]">
                    {formatDate(r.current_period_end)}
                  </TableCell>

                  {/* Cancellation Reason Column */}
                  <TableCell className="px-6 py-4 max-w-[220px]">
                    {r.cancellation_reasons?.length ? (
                      <div className="text-[13px] font-medium text-[#2E00AB]">
                        <span>
                          {r.cancellation_reasons
                            .map((id: string) => CANCELLATION_LABELS[id] ?? id)
                            .join(", ")}
                        </span>
                        {r.cancellation_note ? (
                          <span className="block text-[12px] italic text-[#2E00AB]/70 mt-0.5">“{r.cancellation_note}”</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[#2E00AB]/50">—</span>
                    )}
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