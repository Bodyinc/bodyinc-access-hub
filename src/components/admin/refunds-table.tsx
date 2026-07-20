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

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

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
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-[390px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B5AE0]/60" />
          <Input
            placeholder="Search by patient or reason..."
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
          <Table className="border-collapse min-w-[820px]">
            <TableHeader className="bg-white">
              <TableRow className="hover:bg-transparent border-b border-[#EAE6FA]">
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Patient</TableHead>
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Amount</TableHead>
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Reason</TableHead>
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Invoice</TableHead>
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Status</TableHead>
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 border-r border-[#EAE6FA]">Requested</TableHead>
                <TableHead className="h-14 text-[#2A00A2] font-semibold text-[14px] px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-[15px] text-[#6B5AE0]/70">
                    Loading rows...
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-[15px] text-[#6B5AE0]/70">
                    No refund requests.
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

                  {/* Amount */}
                  <TableCell className="px-6 py-4 text-[14px] font-bold text-[#2A00A2] border-r border-[#EAE6FA]/60">
                    {formatCurrency(r.amount)}
                  </TableCell>

                  {/* Reason */}
                  <TableCell className="px-6 py-4 max-w-[220px] border-r border-[#EAE6FA]/60">
                    <span className="text-[14px] font-medium text-[#5D22E8]">{r.reason || "—"}</span>
                    {r.admin_note ? (
                      <span className="block text-[12px] font-medium text-[#6B5AE0]/70 mt-1">Note: {r.admin_note}</span>
                    ) : null}
                  </TableCell>

                  {/* Invoice Actions */}
                  <TableCell className="px-6 py-4 border-r border-[#EAE6FA]/60">
                    <div className="flex items-center gap-2">
                      {r.invoice_url ? (
                        <a
                          href={r.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#6B5AE0] hover:text-[#2A00A2] transition-colors"
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
                          className="text-[#6B5AE0] hover:text-[#2A00A2] transition-colors"
                          aria-label="Download invoice PDF"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      ) : null}
                      {!r.invoice_url && !r.invoice_pdf_url ? (
                        <span className="text-[#6B5AE0]/50">—</span>
                      ) : null}
                    </div>
                  </TableCell>

                  {/* Status Badges */}
                  <TableCell className="px-6 py-4 border-r border-[#EAE6FA]/60">
                    <Badge 
                      className={`rounded-md px-3 py-1 text-[12px] font-bold shadow-none border ${
                        r.status === "approved"
                          ? "bg-[#2A00A2] border-transparent text-white" 
                          : r.status === "rejected"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-[#FAF9FF] border-[#EAE6FA] text-[#6B5AE0]"
                      }`}
                    >
                      {r.status}
                    </Badge>
                  </TableCell>

                  {/* Requested Date */}
                  <TableCell className="px-6 py-4 text-[14px] font-medium text-[#6B5AE0] border-r border-[#EAE6FA]/60">
                    {formatDate(r.created_at)}
                  </TableCell>

                  {/* Actions Buttons */}
                  <TableCell className="px-6 py-4 text-right">
                    {r.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => onApprove(r.id)}
                          disabled={busyId === r.id}
                          className="bg-[#2A00A2] hover:bg-[#1F007A] text-white font-semibold rounded-lg text-xs"
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
                          className="border-[#EAE6FA] text-[#6B5AE0] hover:bg-[#F9F8FF] font-semibold rounded-lg text-xs"
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-[#6B5AE0]/60">Resolved</span>
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
        <DialogContent className="rounded-xl max-w-sm p-6 bg-white border border-[#EAE6FA] shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[18px] font-bold text-[#2A00A2]">Reject refund request</DialogTitle>
            <DialogDescription className="text-sm text-[#6B5AE0]/90 leading-relaxed">
              {rejecting
                ? `Reject the ${formatCurrency(rejecting.amount)} refund for ${
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
            className="border-[#EAE6FA] bg-[#FDFDFF] text-foreground placeholder:text-[#6B5AE0]/40 rounded-xl focus-visible:ring-[#2A00A2] text-[14px] mt-2 resize-none"
          />
          <DialogFooter className="mt-5 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setRejecting(null)} 
              disabled={busyId !== null}
              className="rounded-lg border border-[#EAE6FA] text-[#6B5AE0] hover:bg-[#F9F8FF]"
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