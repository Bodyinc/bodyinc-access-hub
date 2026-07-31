import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Eye, Plus, Search } from "lucide-react";
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
import {
  approveRefund,
  createRefundRequest,
  listRefundablePayments,
  listRefunds,
  rejectRefund,
} from "@/lib/billing.functions";
import { adminInput } from "@/lib/admin-ui";
import { formatDate, formatDollars } from "@/lib/format";

export function RefundsTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    "all",
  );
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [newReason, setNewReason] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const qc = useQueryClient();
  const list = useServerFn(listRefunds);
  const approve = useServerFn(approveRefund);
  const reject = useServerFn(rejectRefund);
  const listPayments = useServerFn(listRefundablePayments);
  const createRefund = useServerFn(createRefundRequest);
  const query = useQuery({ queryKey: ["admin-refunds"], queryFn: () => list({ data: {} }) });
  const paymentsQuery = useQuery({
    queryKey: ["admin-refundable-payments"],
    queryFn: () => listPayments({ data: {} }),
    enabled: creating,
  });

  const payments = useMemo(() => {
    const rows = (paymentsQuery.data as any[]) ?? [];
    const s = paymentSearch.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (p) =>
        (p.customer_name ?? "").toLowerCase().includes(s) ||
        (p.customer_email ?? "").toLowerCase().includes(s) ||
        (p.stripe_invoice_id ?? "").toLowerCase().includes(s),
    );
  }, [paymentsQuery.data, paymentSearch]);

  function closeCreate() {
    setCreating(false);
    setSelectedPayment(null);
    setPaymentSearch("");
    setNewReason("");
    setNewAmount("");
  }

  async function onCreate(approveNow: boolean) {
    if (!selectedPayment) return;
    const reason = newReason.trim();
    if (!reason) {
      toast.error("Enter a reason for the refund.");
      return;
    }
    const parsed = newAmount.trim() ? Number(newAmount) : null;
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) {
      toast.error("Enter a valid refund amount.");
      return;
    }
    setSavingNew(true);
    try {
      await createRefund({
        data: {
          payment_id: selectedPayment.id,
          reason,
          approve_now: approveNow,
          ...(parsed !== null ? { amount_cents: Math.round(parsed * 100) } : {}),
        },
      });
      toast.success(approveNow ? "Refund issued via Stripe." : "Refund request created.");
      closeCreate();
      qc.invalidateQueries({ queryKey: ["admin-refunds"] });
      qc.invalidateQueries({ queryKey: ["admin-refundable-payments"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingNew(false);
    }
  }

  const all = useMemo(() => ((query.data as any[]) ?? []), [query.data]);

  const summary = useMemo(() => {
    const sum = (list: any[]) => list.reduce((t, r) => t + Number(r.amount ?? 0), 0);
    const pending = all.filter((r) => r.status === "pending");
    const approved = all.filter((r) => r.status === "approved");
    const rejected = all.filter((r) => r.status === "rejected");
    return {
      pending: { count: pending.length, amount: sum(pending) },
      approved: { count: approved.length, amount: sum(approved) },
      rejected: { count: rejected.length, amount: sum(rejected) },
      total: { count: all.length, amount: sum(all) },
    };
  }, [all]);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!s) return true;
      return (
        (r.customer_name ?? "").toLowerCase().includes(s) ||
        (r.customer_email ?? "").toLowerCase().includes(s) ||
        (r.reason ?? "").toLowerCase().includes(s)
      );
    });
  }, [all, search, statusFilter]);

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
      {/* Refund summary */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {(
          [
            { key: "pending", label: "Needs approval", data: summary.pending, hot: true },
            { key: "approved", label: "Approved / processed", data: summary.approved, hot: false },
            { key: "rejected", label: "Rejected", data: summary.rejected, hot: false },
            { key: "total", label: "Total requested", data: summary.total, hot: false },
          ] as const
        ).map((card) => {
          const highlight = card.hot && card.data.count > 0;
          return (
            <div
              key={card.key}
              className={`rounded-2xl border p-4 ${
                highlight ? "border-[#B8684B]/40 bg-[#E8EEED]" : "border-[#D5DEDD] bg-white"
              }`}
            >
              <div className="text-[12px] font-semibold text-[#3B4759]/70">{card.label}</div>
              <div
                className={`mt-2 text-[24px] leading-none font-semibold ${
                  highlight ? "text-[#B8684B]" : "text-[#3B4759]"
                }`}
              >
                {card.data.count}
              </div>
              <div className="mt-1 text-[12px] font-medium text-[#3B4759]/60">
                {formatDollars(card.data.amount)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Refresh Bar styled to match Subscriptions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 w-full sm:max-w-[390px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6A9B9C]/60" />
            <Input
              placeholder="Search by patient or reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${adminInput} pl-10`}
            />
          </div>
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[#D5DEDD] bg-[#F2F7F6] p-1">
            {(
              [
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-all ${
                  statusFilter === tab.value
                    ? "bg-white text-[#3B4759] shadow-sm"
                    : "text-[#3B4759]/70 hover:text-[#3B4759]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreating(true)}
            className="bg-[#6A9B9C] hover:bg-[#5B8788] text-white font-semibold rounded-lg"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New refund
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
                    No refund requests yet. Use “New refund” to raise one against a payment.
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
            placeholder="Reason for rejecting (optional)"
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

      {/* Create refund */}
      <Dialog open={creating} onOpenChange={(open) => !open && closeCreate()}>
        <DialogContent className="rounded-xl max-w-lg p-6 bg-white border border-[#D5DEDD] shadow-xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[18px] font-bold text-[#3B4759]">New refund</DialogTitle>
            <DialogDescription className="text-sm text-[#6A9B9C]/90 leading-relaxed">
              Pick a successful payment, then create a pending request or issue the refund right
              away.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6A9B9C]/60" />
              <Input
                placeholder="Search by patient, email or invoice ID…"
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className={`${adminInput} pl-10`}
              />
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-[#D5DEDD]">
              {paymentsQuery.isLoading ? (
                <div className="p-4 text-[13px] text-[#3B4759]/70">Loading payments…</div>
              ) : payments.length === 0 ? (
                <div className="p-4 text-[13px] text-[#3B4759]/70">
                  No refundable payments found.
                </div>
              ) : (
                payments.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPayment(p);
                      setNewAmount(String(p.amount));
                    }}
                    className={`flex w-full items-center justify-between gap-3 border-b border-[#D5DEDD] px-4 py-3 text-left last:border-b-0 transition-colors ${
                      selectedPayment?.id === p.id ? "bg-[#E8EEED]" : "hover:bg-[#F2F7F6]"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold text-[#3B4759]">
                        {p.customer_name ?? p.customer_email ?? "Unknown patient"}
                      </span>
                      <span className="block truncate text-[12px] font-medium text-[#3B4759]/60">
                        {formatDate(p.created_at)}
                        {p.stripe_invoice_id ? ` · ${p.stripe_invoice_id}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold text-[#3B4759]">
                      {formatDollars(p.amount)}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[#3B4759]/70">Amount (USD)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  disabled={!selectedPayment}
                  className={`${adminInput} mt-1`}
                />
              </div>
            </div>

            <Textarea
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Reason for the refund"
              rows={3}
              maxLength={500}
              className="border-[#D5DEDD] bg-[#F8FBFA] text-foreground placeholder:text-[#6A9B9C]/40 rounded-xl focus-visible:ring-[#3B4759] text-[14px] resize-none"
            />
          </div>

          <DialogFooter className="mt-5 gap-2">
            <Button
              variant="outline"
              onClick={closeCreate}
              disabled={savingNew}
              className="rounded-lg border border-[#D5DEDD] text-[#6A9B9C] hover:bg-[#F2F7F6]"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => onCreate(false)}
              disabled={savingNew || !selectedPayment}
              className="rounded-lg border border-[#D5DEDD] text-[#3B4759] hover:bg-[#F2F7F6]"
            >
              Create pending
            </Button>
            <Button
              onClick={() => onCreate(true)}
              disabled={savingNew || !selectedPayment}
              className="bg-[#6A9B9C] hover:bg-[#5B8788] text-white font-semibold rounded-lg"
            >
              {savingNew ? "Working…" : "Create and refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
