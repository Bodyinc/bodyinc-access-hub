import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active" || status === "trialing") return "default";
  if (status === "past_due") return "destructive";
  if (status === "canceled") return "outline";
  return "secondary";
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
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search by patient or plan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
      </div>

      <Card>
        <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next billing</TableHead>
              <TableHead>Cancellation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No subscriptions found.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.customer_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.customer_email ?? "—"}</div>
                </TableCell>
                <TableCell>{r.plan_name}</TableCell>
                <TableCell>{formatCurrency(r.amount)}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                    {r.cancel_at_period_end ? (
                      <span className="text-xs text-amber-600">Cancels at period end</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(r.current_period_end)}
                </TableCell>
                <TableCell className="max-w-[220px]">
                  {r.cancellation_reasons?.length ? (
                    <div className="text-xs">
                      <span className="text-foreground">
                        {r.cancellation_reasons
                          .map((id: string) => CANCELLATION_LABELS[id] ?? id)
                          .join(", ")}
                      </span>
                      {r.cancellation_note ? (
                        <span className="block text-muted-foreground">“{r.cancellation_note}”</span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
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
