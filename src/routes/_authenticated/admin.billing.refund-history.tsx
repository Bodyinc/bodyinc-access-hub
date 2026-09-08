import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Eye, Search } from "lucide-react";
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
import { PageHeader } from "@/components/admin/page-header";
import { RefreshButton } from "@/components/admin/refresh-button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listRefundHistory } from "@/lib/billing.functions";
import { adminInput } from "@/lib/admin-ui";
import { formatDateTime, formatDollars, formatRecordId } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/billing/refund-history")({
  head: () => ({
    meta: [
      { title: "Refund history · Body Inc Admin" },
      {
        name: "description",
        content: "Complete history of admin-issued and automatic order refunds.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RefundHistoryPage,
});

const STATUSES = ["all", "approved", "pending", "rejected"] as const;
const RANGES: Array<{ label: string; days?: number }> = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All time" },
];

const filterChip = (active: boolean) =>
  `h-[34px] rounded-full border px-4 text-[13px] font-semibold transition-colors ${
    active
      ? "border-transparent bg-[#6A9B9C] text-white"
      : "border-[#D5DEDD] bg-white text-[#3B4759]/70 hover:bg-[#F2F7F6]"
  }`;

function RefundHistoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [days, setDays] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 350);

  const list = useServerFn(listRefundHistory);
  const query = useQuery({
    queryKey: ["admin-refund-history", debounced, status, days, page],
    queryFn: () =>
      list({ data: { search: debounced || undefined, status, days, page, limit: 25 } }),
    placeholderData: keepPreviousData,
  });

  const rows = (query.data?.data as any[]) ?? [];
  const totalPages = query.data?.total_pages ?? 0;

  const csvHref = useMemo(() => {
    if (!rows.length) return null;
    const head = [
      "Refund ID",
      "Patient",
      "Email",
      "Amount",
      "Reason",
      "Status",
      "Admin note",
      "Reviewed by",
      "Requested",
      "Resolved",
      "Stripe refund",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = rows.map((r) =>
      [
        formatRecordId(r.id),
        r.customer_name,
        r.customer_email,
        r.amount,
        r.reason,
        r.status,
        r.admin_note,
        r.reviewed_by_name,
        r.created_at,
        r.reviewed_at,
        r.stripe_refund_id,
      ]
        .map(esc)
        .join(","),
    );
    return `data:text/csv;charset=utf-8,${encodeURIComponent([head.join(","), ...body].join("\n"))}`;
  }, [rows]);

  function reset(fn: () => void) {
    fn();
    setPage(1);
  }

  return (
    <div className="admin-page-shell font-['DM_Sans',sans-serif]">
      <PageHeader
        backTo="/admin/billing"
        backLabel="Billing"
        title="Refund history"
        subtitle="Every refund processed by admins or automatic order rejection, with status and who resolved it."
        crumbs={[{ label: "Billing", to: "/admin/billing" }]}
        actions={
          <>
            {csvHref && (
              <Button
                asChild
                variant="outline"
                className="h-[37px] gap-1.5 rounded-[20px] border-[#E8EEED] bg-white px-5 text-[14px] font-medium text-[#152A51] shadow-none hover:bg-[#F8F9FB]"
              >
                <a href={csvHref} download="refund-history.csv">
                  <Download className="!h-3.5 !w-3.5" />
                  Export CSV
                </a>
              </Button>
            )}
            <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
          </>
        }
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 w-full lg:max-w-[390px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6A9B9C]/60" />
            <Input
              placeholder="Search by refund ID, patient, or reason…"
              value={search}
              onChange={(e) => reset(() => setSearch(e.target.value))}
              className={`${adminInput} pl-10`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => reset(() => setStatus(s))}
                className={filterChip(status === s)}
              >
                {s === "all" ? "All statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => reset(() => setDays(r.days))}
                className={filterChip(days === r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-table-wrap">
          <div className="admin-table-scroll">
            <Table className="min-w-[1080px] border-collapse">
              <TableHeader className="bg-white">
                <TableRow className="border-b border-[#D5DEDD] hover:bg-transparent">
                  {[
                    "Refund ID",
                    "Patient",
                    "Amount",
                    "Reason",
                    "Status",
                    "Reviewed by",
                    "Requested",
                    "Resolved",
                    "Invoice",
                  ].map((h) => (
                    <TableHead
                      key={h}
                      className="h-14 border-r border-[#D5DEDD] px-6 text-[14px] font-semibold text-[#3B4759] last:border-r-0"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-[15px] text-[#3B4759]/70">
                      Loading rows...
                    </TableCell>
                  </TableRow>
                )}
                {!query.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-[15px] text-[#3B4759]/70">
                      No refunds match these filters.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="border-b border-[#D5DEDD] transition-colors hover:bg-[#F2F7F6]"
                  >
                    <TableCell className="border-r border-[#D5DEDD] px-6 py-4 text-[14px] font-semibold text-[#3B4759]">
                      {formatRecordId(r.id)}
                    </TableCell>
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
                    <TableCell className="max-w-[240px] border-r border-[#D5DEDD] px-6 py-4">
                      <span className="text-[14px] font-medium text-[#3B4759]/80">
                        {r.reason || "—"}
                      </span>
                      {r.admin_note ? (
                        <span className="mt-1 block text-[12px] font-medium text-[#3B4759]/70">
                          Note: {r.admin_note}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="border-r border-[#D5DEDD] px-6 py-4">
                      <Badge
                        className={`rounded-md border px-3 py-1 text-[12px] font-bold shadow-none ${
                          r.status === "approved"
                            ? "border-transparent bg-[#6A9B9C] text-white"
                            : r.status === "rejected"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-[#D5DEDD] bg-[#F2F7F6] text-[#3B4759]/70"
                        }`}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="border-r border-[#D5DEDD] px-6 py-4 text-[14px] font-medium text-[#3B4759]/80">
                      {r.reviewed_by_name ?? "—"}
                    </TableCell>
                    <TableCell className="border-r border-[#D5DEDD] px-6 py-4 text-[14px] font-medium text-[#3B4759]/70">
                      {formatDateTime(r.created_at)}
                    </TableCell>
                    <TableCell className="border-r border-[#D5DEDD] px-6 py-4 text-[14px] font-medium text-[#3B4759]/70">
                      {r.reviewed_at ? formatDateTime(r.reviewed_at) : "—"}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {r.invoice_url ? (
                          <a
                            href={r.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#3B4759]/70 transition-colors hover:text-[#3B4759]"
                            aria-label="View invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        ) : null}
                        {r.invoice_pdf_url ? (
                          <a
                            href={r.invoice_pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#3B4759]/70 transition-colors hover:text-[#3B4759]"
                            aria-label="Download invoice PDF"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : null}
                        {!r.invoice_url && !r.invoice_pdf_url ? (
                          <span className="text-[#3B4759]/50">—</span>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-[#3B4759]/70">
            {query.data?.total ?? 0} refund request(s)
            {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
          </span>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border-[#D5DEDD] text-[#3B4759]/80"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border-[#D5DEDD] text-[#3B4759]/80"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
