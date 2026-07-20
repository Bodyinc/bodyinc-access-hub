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
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-[390px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B5AE0]/60" />
          <Input
            placeholder="Search by patient or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 h-11 w-full border-[#EAE6FA] bg-[#FDFDFF] text-foreground placeholder:text-[#6B5AE0]/40 rounded-xl focus-visible:ring-[#2A00A2] text-[14px] font-medium"
          />
        </div>
        <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
      </div>

      {/* Styled Table Wrapper Container */}
      <div className="border border-[#EAE6FA] rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table className="border-collapse min-w-[720px]">
            <TableHeader className="bg-white">
              <TableRow className="hover:bg-transparent border-b border-[#EAE6FA]">
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Patient</TableHead>
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Plan</TableHead>
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Amount</TableHead>
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Status</TableHead>
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Next billing</TableHead>
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6">Cancellation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-[15px] text-[#6B5AE0]/70">
                    Loading rows...
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-[15px] text-[#6B5AE0]/70">
                    No subscriptions found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="border-b border-[#EAE6FA] hover:bg-[#F9F8FF] transition-colors">
                  {/* Patient Info */}
                  <TableCell className="px-6 py-4 border-r border-[#EAE6FA]/60">
                    <div className="font-bold text-[14px] text-[#2A00A2]">{r.customer_name ?? "—"}</div>
                    <div className="text-[12px] font-medium text-[#6B5AE0]/70">{r.customer_email ?? "—"}</div>
                  </TableCell>

                  {/* Plan Name */}
                  <TableCell className="px-6 py-4 text-[14px] font-medium text-[#5D22E8] border-r border-[#EAE6FA]/60">
                    {r.plan_name}
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="px-6 py-4 text-[14px] font-bold text-[#2A00A2] border-r border-[#EAE6FA]/60">
                    {formatCurrency(r.amount)}
                  </TableCell>

                  {/* Status Badges */}
                  <TableCell className="px-6 py-4 border-r border-[#EAE6FA]/60">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge 
                        className={`rounded-md px-3 py-1 text-[12px] font-bold shadow-none border ${
                          r.status === "active" || r.status === "trialing"
                            ? "bg-[#2A00A2] border-transparent text-white" 
                            : "bg-white border-[#EAE6FA] text-[#2A00A2]"
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
                  <TableCell className="px-6 py-4 text-[14px] font-medium text-[#6B5AE0] border-r border-[#EAE6FA]/60">
                    {formatDate(r.current_period_end)}
                  </TableCell>

                  {/* Cancellation Reason Column */}
                  <TableCell className="px-6 py-4 max-w-[220px]">
                    {r.cancellation_reasons?.length ? (
                      <div className="text-[13px] font-medium text-[#6B5AE0]">
                        <span>
                          {r.cancellation_reasons
                            .map((id: string) => CANCELLATION_LABELS[id] ?? id)
                            .join(", ")}
                        </span>
                        {r.cancellation_note ? (
                          <span className="block text-[12px] italic text-[#6B5AE0]/70 mt-0.5">“{r.cancellation_note}”</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[#6B5AE0]/50">—</span>
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