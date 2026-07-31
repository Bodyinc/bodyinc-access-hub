import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { listRefunds } from "@/lib/billing.functions";
import { adminInput, adminPageSubtitle, adminPageTitle } from "@/lib/admin-ui";
import { formatDate, formatDateTime, formatDollars } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/refunds/")({
  head: () => ({
    meta: [
      { title: "Refunds processed · Body Inc Admin" },
      {
        name: "description",
        content: "Track processed refunds, amounts refunded and pending approvals.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RefundsProcessedPage,
});

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 0, label: "All time" },
] as const;

function RefundsProcessedPage() {
  const [search, setSearch] = useState("");
  const [days, setDays] = useState<number>(30);

  const list = useServerFn(listRefunds);
  const query = useQuery({ queryKey: ["admin-refunds"], queryFn: () => list({ data: {} }) });

  const all = useMemo(() => ((query.data as any[]) ?? []), [query.data]);

  const since = useMemo(() => {
    if (!days) return null;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }, [days]);

  // Processed = approved and actually refunded through Stripe.
  const processed = useMemo(() => {
    return all.filter((r) => {
      if (r.status !== "approved") return false;
      if (!since) return true;
      const when = r.reviewed_at ?? r.created_at;
      return when ? new Date(when) >= since : false;
    });
  }, [all, since]);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return processed;
    return processed.filter(
      (r) =>
        (r.customer_name ?? "").toLowerCase().includes(s) ||
        (r.customer_email ?? "").toLowerCase().includes(s) ||
        (r.reason ?? "").toLowerCase().includes(s) ||
        (r.stripe_refund_id ?? "").toLowerCase().includes(s),
    );
  }, [processed, search]);

  const stats = useMemo(() => {
    const sum = (l: any[]) => l.reduce((t, r) => t + Number(r.amount ?? 0), 0);
    const pending = all.filter((r) => r.status === "pending");
    const amount = sum(processed);
    return {
      processedCount: processed.length,
      processedAmount: amount,
      average: processed.length ? amount / processed.length : 0,
      pendingCount: pending.length,
      pendingAmount: sum(pending),
    };
  }, [all, processed]);

  function exportCsv() {
    const header = [
      "Patient",
      "Email",
      "Amount",
      "Reason",
      "Stripe refund ID",
      "Requested",
      "Processed",
    ];
    const body = rows.map((r) => [
      r.customer_name ?? "",
      r.customer_email ?? "",
      Number(r.amount ?? 0).toFixed(2),
      r.reason ?? "",
      r.stripe_refund_id ?? "",
      r.created_at ?? "",
      r.reviewed_at ?? "",
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `refunds-processed-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const cards = [
    { label: "Refunds processed", value: String(stats.processedCount), sub: "In selected period" },
    {
      label: "Amount refunded",
      value: formatDollars(stats.processedAmount),
      sub: "In selected period",
    },
    { label: "Average refund", value: formatDollars(stats.average), sub: "Per processed refund" },
    {
      label: "Awaiting approval",
      value: String(stats.pendingCount),
      sub: formatDollars(stats.pendingAmount),
      hot: stats.pendingCount > 0,
    },
  ];

  return (
    <div className="admin-page-shell space-y-4 sm:space-y-5 font-['DM_Sans',sans-serif]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h2 className={adminPageTitle}>Refunds processed</h2>
          <p className={adminPageSubtitle}>
            Every refund that has been approved and issued through Stripe.
          </p>
        </div>
        <Link
          to="/admin/billing"
          className="text-[14px] font-semibold text-[#6A9B9C] hover:text-[#5B8788]"
        >
          Manage refund requests →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-4 ${
              card.hot ? "border-[#B8684B]/40 bg-[#E8EEED]" : "border-[#D5DEDD] bg-white"
            }`}
          >
            <div className="text-[12px] font-semibold text-[#3B4759]/70">{card.label}</div>
            <div
              className={`mt-2 text-[24px] leading-none font-semibold ${
                card.hot ? "text-[#B8684B]" : "text-[#3B4759]"
              }`}
            >
              {card.value}
            </div>
            <div className="mt-1 text-[12px] font-medium text-[#3B4759]/60">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full min-w-0 sm:max-w-[390px]">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#6A9B9C]/60" />
            <Input
              placeholder="Search by patient, reason or refund ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${adminInput} pl-10`}
            />
          </div>
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[#D5DEDD] bg-[#F2F7F6] p-1">
            {RANGES.map((range) => (
              <button
                key={range.value}
                type="button"
                onClick={() => setDays(range.value)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-all ${
                  days === range.value
                    ? "bg-white text-[#3B4759] shadow-sm"
                    : "text-[#3B4759]/70 hover:text-[#3B4759]"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="rounded-lg bg-[#6A9B9C] font-semibold text-white hover:bg-[#5B8788]"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
          <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
        </div>
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-scroll">
          <Table className="min-w-[820px] border-collapse">
            <TableHeader className="bg-white">
              <TableRow className="border-b border-[#D5DEDD] hover:bg-transparent">
                {["Patient", "Amount", "Reason", "Stripe refund", "Requested", "Processed"].map(
                  (h, i, arr) => (
                    <TableHead
                      key={h}
                      className={`h-14 px-6 text-[14px] font-semibold text-[#3B4759] ${
                        i < arr.length - 1 ? "border-r border-[#D5DEDD]" : ""
                      }`}
                    >
                      {h}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-[15px] text-[#3B4759]/70">
                    Loading rows...
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-[15px] text-[#3B4759]/70">
                    No refunds have been processed in this period.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-b border-[#D5DEDD] transition-colors hover:bg-[#F2F7F6]"
                >
                  <TableCell className="border-r border-[#D5DEDD] px-6 py-4">
                    <div className="text-[14px] font-semibold text-[#3B4759]">
                      {r.customer_name ?? "—"}
                    </div>
                    <div className="text-[12px] font-medium text-[#3B4759]/70">
                      {r.customer_email ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="border-r border-[#D5DEDD] px-6 py-4 text-[14px] font-semibold text-[#3B4759]">
                    {formatDollars(r.amount)}
                  </TableCell>
                  <TableCell className="max-w-[220px] border-r border-[#D5DEDD] px-6 py-4 text-[14px] font-medium text-[#3B4759]/80">
                    {r.reason || "—"}
                  </TableCell>
                  <TableCell className="border-r border-[#D5DEDD] px-6 py-4">
                    {r.stripe_refund_id ? (
                      <Badge className="rounded-md border border-[#D5DEDD] bg-[#F2F7F6] px-3 py-1 text-[12px] font-bold text-[#3B4759]/80 shadow-none">
                        {r.stripe_refund_id}
                      </Badge>
                    ) : (
                      <span className="text-[#3B4759]/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="border-r border-[#D5DEDD] px-6 py-4 text-[14px] font-medium text-[#3B4759]/80">
                    {formatDate(r.created_at)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-[14px] font-medium text-[#3B4759]/80">
                    {formatDateTime(r.reviewed_at)}
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