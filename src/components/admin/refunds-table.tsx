import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshButton } from "@/components/admin/refresh-button";
import { issueAdminRefund, listRefundablePayments } from "@/lib/billing.functions";
import { adminInput } from "@/lib/admin-ui";
import { formatDate, formatDollars, normalizeIdSearch } from "@/lib/format";

export function RefundsTable() {
  const [search, setSearch] = useState("");
  const [issuing, setIssuing] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const qc = useQueryClient();
  const list = useServerFn(listRefundablePayments);
  const issue = useServerFn(issueAdminRefund);
  const query = useQuery({
    queryKey: ["admin-refundable-payments"],
    queryFn: () => list({ data: {} }),
  });

  const rows = useMemo(() => {
    const all = (query.data as any[]) ?? [];
    const s = normalizeIdSearch(search).toLowerCase();
    if (!s) return all;
    const idTerm = s.replace(/-/g, "");
    return all.filter(
      (r) =>
        (r.customer_name ?? "").toLowerCase().includes(s) ||
        (r.customer_email ?? "").toLowerCase().includes(s) ||
        (r.description ?? "").toLowerCase().includes(s) ||
        String(r.id).toLowerCase().replace(/-/g, "").startsWith(idTerm),
    );
  }, [query.data, search]);

  async function onIssue() {
    if (!issuing) return;
    setBusyId(issuing.id);
    try {
      await issue({
        data: { paymentId: issuing.id, reason: reason.trim() || undefined },
      });
      toast.success("Refund issued via Stripe and recorded in Refund History.");
      setIssuing(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin-refundable-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-refund-history"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#3B4759]/70">
        Patients cannot request refunds in the portal. Issue a refund here when appropriate; completed
        refunds appear in{" "}
        <Link to="/admin/billing/refund-history" className="font-semibold text-[#3B4759] underline">
          Refund History
        </Link>
        .
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 w-full sm:max-w-[390px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6A9B9C]/60" />
          <Input
            placeholder="Search by payment ID, patient, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${adminInput} pl-10`}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            className="h-[37px] rounded-[20px] border border-[#E8EEED] bg-white px-5 text-[14px] font-medium text-[#152A51] shadow-none hover:bg-[#F8F9FB] hover:text-[#152A51]"
          >
            <Link to="/admin/billing/refund-history">View full history</Link>
          </Button>
          <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
        </div>
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-scroll">
          <Table className="border-collapse min-w-[820px]">
            <TableHeader className="bg-white">
              <TableRow className="hover:bg-transparent border-b border-[#D5DEDD]">
                <TableHead className="h-14 text-[#3B4759] font-semibold text-[14px] px-6 border-r border-[#D5DEDD]">
                  Patient
                </TableHead>
                <TableHead className="h-14 text-[#3B4759] font-semibold text-[14px] px-6 border-r border-[#D5DEDD]">
                  Description
                </TableHead>
                <TableHead className="h-14 text-[#3B4759] font-semibold text-[14px] px-6 border-r border-[#D5DEDD]">
                  Amount
                </TableHead>
                <TableHead className="h-14 text-[#3B4759] font-semibold text-[14px] px-6 border-r border-[#D5DEDD]">
                  Invoice
                </TableHead>
                <TableHead className="h-14 text-[#3B4759] font-semibold text-[14px] px-6 border-r border-[#D5DEDD]">
                  Paid
                </TableHead>
                <TableHead className="h-14 text-[#3B4759] font-semibold text-[14px] px-6 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-[15px] text-[#3B4759]/70"
                  >
                    Loading rows...
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-[15px] text-[#3B4759]/70"
                  >
                    No refundable payments.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  className="border-b border-[#D5DEDD] hover:bg-[#F2F7F6] transition-colors"
                >
                  <TableCell className="px-6 py-4 border-r border-[#D5DEDD]">
                    <div className="font-semibold text-[14px] text-[#3B4759]">
                      {r.customer_name ?? "—"}
                    </div>
                    <div className="text-[12px] font-medium text-[#3B4759]/70">
                      {r.customer_email ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-[14px] font-medium text-[#3B4759]/80 border-r border-[#D5DEDD]">
                    {r.description}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-[14px] font-semibold text-[#3B4759] border-r border-[#D5DEDD]">
                    {formatDollars(r.amount)}
                  </TableCell>
                  <TableCell className="px-6 py-4 border-r border-[#D5DEDD]">
                    <div className="flex items-center gap-2">
                      {r.invoice_url ? (
                        <a
                          href={r.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#3B4759]/70 hover:text-[#3B4759] transition-colors"
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
                          className="text-[#3B4759]/70 hover:text-[#3B4759] transition-colors"
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
                  <TableCell className="px-6 py-4 text-[14px] font-medium text-[#3B4759]/70 border-r border-[#D5DEDD]">
                    {formatDate(r.created_at)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Button
                      size="sm"
                      onClick={() => {
                        setIssuing(r);
                        setReason("");
                      }}
                      disabled={busyId === r.id}
                      className="bg-[#6A9B9C] hover:bg-[#5B8788] text-white font-semibold rounded-lg text-xs"
                    >
                      Issue refund
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={issuing !== null} onOpenChange={(open) => !open && setIssuing(null)}>
        <DialogContent className="rounded-xl max-w-sm p-6 bg-white border border-[#D5DEDD] shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[18px] font-bold text-[#3B4759]">Issue refund</DialogTitle>
            <DialogDescription className="text-sm text-[#6A9B9C]/90 leading-relaxed">
              {issuing
                ? `Refund ${formatDollars(issuing.amount)} to ${
                    issuing.customer_email ?? "this patient"
                  }. This is recorded in Refund History.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for refund (optional)"
            rows={4}
            maxLength={500}
            className="border-[#D5DEDD] bg-[#F8FBFA] text-foreground placeholder:text-[#6A9B9C]/40 rounded-xl focus-visible:ring-[#3B4759] text-[14px] mt-2 resize-none"
          />
          <DialogFooter className="mt-5 gap-2">
            <Button
              variant="outline"
              onClick={() => setIssuing(null)}
              disabled={busyId !== null}
              className="rounded-lg border border-[#D5DEDD] text-[#6A9B9C] hover:bg-[#F2F7F6]"
            >
              Cancel
            </Button>
            <Button
              onClick={onIssue}
              disabled={busyId !== null}
              className="bg-[#6A9B9C] hover:bg-[#5B8788] text-white rounded-lg shadow-none"
            >
              {busyId ? "Issuing…" : "Confirm refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
