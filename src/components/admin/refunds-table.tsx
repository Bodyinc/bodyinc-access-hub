import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { approveRefund, listRefunds, rejectRefund } from "@/lib/billing.functions";
import { adminInput } from "@/lib/admin-ui";
import { formatDate, formatDollars } from "@/lib/format";

export function RefundsTable() {
  const [search, setSearch] = useState("");
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const qc = useQueryClient();
  const list = useServerFn(listRefunds);
  const approve = useServerFn(approveRefund);
  const reject = useServerFn(rejectRefund);
  const query = useQuery({ queryKey: ["admin-refunds"], queryFn: () => list({ data: {} }) });

  const rows = useMemo(() => {
    const all = (query.data as any[]) ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return all;
    return all.filter(
      (r) =>
        (r.customer_name ?? "").toLowerCase().includes(s) ||
        (r.customer_email ?? "").toLowerCase().includes(s) ||
        (r.reason ?? "").toLowerCase().includes(s),
    );
  }, [query.data, search]);

  async function onApprove(id: string) {
    setBusyId(id);
    try {
      await approve({ data: { id } });
      toast.success("Refund approved and issued via Stripe.");
      qc.invalidateQueries({ queryKey: ["admin-refunds"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function onReject() {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    try {
      await reject({ data: { id: rejecting.id, note } });
      toast.success("Refund request rejected.");
      setRejecting(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-refunds"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Refresh Bar styled to match Subscriptions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 w-full sm:max-w-[390px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6A9B9C]/60" />
          <Input
            placeholder="Search by patient or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${adminInput} pl-10`}
          />
        </div>
        <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
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
                  Amount
                </TableHead>
                <TableHead className="h-14 text-[#3B4759] font-semibold text-[14px] px-6 border-r border-[#D5DEDD]">
                  Reason
                </TableHead>
                <TableHead className="h-14 text-[#3B4759] font-semibold text-[14px] px-6 border-r border-[#D5DEDD]">
                  Invoice
                </TableHead>
                <TableHead className="h-14 text-[#3B4759] font-semibold text-[14px] px-6 border-r border-[#D5DEDD]">
                  Status
                </TableHead>
                <TableHead className="h-14 text-[#3B4759] font-semibold text-[14px] px-6 border-r border-[#D5DEDD]">
                  Requested
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
                    colSpan={7}
                    className="py-12 text-center text-[15px] text-[#3B4759]/70"
                  >
                    Loading rows...
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-[15px] text-[#3B4759]/70"
                  >
                    No refund requests.
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
                  <TableCell className="px-6 py-4 text-[14px] font-semibold text-[#3B4759] border-r border-[#D5DEDD]">
                    {formatDollars(r.amount)}
                  </TableCell>
                  <TableCell className="px-6 py-4 max-w-[220px] border-r border-[#D5DEDD]">
                    <span className="text-[14px] font-medium text-[#3B4759]/80">
                      {r.reason || "—"}
                    </span>
                    {r.admin_note ? (
                      <span className="block text-[12px] font-medium text-[#3B4759]/70 mt-1">
                        Note: {r.admin_note}
                      </span>
                    ) : null}
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
                  <TableCell className="px-6 py-4 border-r border-[#D5DEDD]">
                    <Badge
                      className={`rounded-md px-3 py-1 text-[12px] font-bold shadow-none border ${
                        r.status === "approved"
                          ? "bg-[#6A9B9C] border-transparent text-white"
                          : r.status === "rejected"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-[#F2F7F6] border-[#D5DEDD] text-[#3B4759]/70"
                      }`}
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-[14px] font-medium text-[#3B4759]/70 border-r border-[#D5DEDD]">
                    {formatDate(r.created_at)}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    {r.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => onApprove(r.id)}
                          disabled={busyId === r.id}
                          className="bg-[#6A9B9C] hover:bg-[#5B8788] text-white font-semibold rounded-lg text-xs"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejecting(r);
                            setNote("");
                          }}
                          disabled={busyId === r.id}
                          className="border-[#D5DEDD] text-[#3B4759]/70 hover:bg-[#F2F7F6] font-semibold rounded-lg text-xs"
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-[#3B4759]/60">Resolved</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Reject Modal styled to match Figma design guidelines */}
      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="rounded-xl max-w-sm p-6 bg-white border border-[#D5DEDD] shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[18px] font-bold text-[#3B4759]">
              Reject refund request
            </DialogTitle>
            <DialogDescription className="text-sm text-[#6A9B9C]/90 leading-relaxed">
              {rejecting
                ? `Reject the ${formatDollars(rejecting.amount)} refund for ${
                    rejecting.customer_email ?? "this patient"
                  }. The reason is shown to the patient.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for rejecting (optional)..."
            rows={4}
            maxLength={500}
            className="border-[#D5DEDD] bg-[#F8FBFA] text-foreground placeholder:text-[#6A9B9C]/40 rounded-xl focus-visible:ring-[#3B4759] text-[14px] mt-2 resize-none"
          />
          <DialogFooter className="mt-5 gap-2">
            <Button
              variant="outline"
              onClick={() => setRejecting(null)}
              disabled={busyId !== null}
              className="rounded-lg border border-[#D5DEDD] text-[#6A9B9C] hover:bg-[#F2F7F6]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              disabled={busyId !== null}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-none"
            >
              {busyId ? "Rejecting…" : "Reject request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
