import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  listProviderPayouts,
  recordProviderPayout,
  setProviderPayoutRate,
  type ProviderPayoutRow,
} from "@/lib/payouts.functions";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminPageSubtitle,
  adminPageTitle,
  adminTextarea,
} from "@/lib/admin-ui";
import { formatCents, formatDateTime } from "@/lib/format";
import { toastError } from "@/lib/toast-message";

export const Route = createFileRoute("/_authenticated/admin/payouts/")({
  head: () => ({
    meta: [
      { title: "Payouts · Body Inc Admin" },
      { name: "description", content: "Provider consultation payouts — Admin area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPayoutsPage,
});

function dollarsToCents(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function AdminPayoutsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listProviderPayouts);
  const saveRate = useServerFn(setProviderPayoutRate);
  const record = useServerFn(recordProviderPayout);
  const [search, setSearch] = useState("");
  const [rateInput, setRateInput] = useState<string | null>(null);
  const [paying, setPaying] = useState<ProviderPayoutRow | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const query = useQuery({
    queryKey: ["admin-provider-payouts"],
    queryFn: () => list({}),
  });

  const summary = query.data;
  const rateCents = summary?.rate_cents ?? 0;
  const rateField = rateInput ?? (rateCents / 100).toFixed(2);

  const rateMut = useMutation({
    mutationFn: (cents: number) => saveRate({ data: { rate_cents: cents } }),
    onSuccess: () => {
      setRateInput(null);
      qc.invalidateQueries({ queryKey: ["admin-provider-payouts"] });
      toast.success("Payout rate saved.");
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  const payMut = useMutation({
    mutationFn: (vars: { provider_id: string; amount_cents: number; note?: string }) =>
      record({ data: vars }),
    onSuccess: () => {
      setPaying(null);
      setAmount("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-provider-payouts"] });
      toast.success("Payment recorded.");
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  const rows = useMemo(() => {
    const all = summary?.rows ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((row) => row.name.toLowerCase().includes(q));
  }, [summary?.rows, search]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += row.total;
        acc.completed += row.completed;
        acc.in_progress += row.in_progress;
        acc.due += row.completed * rateCents;
        acc.paid += row.paid_cents;
        return acc;
      },
      { total: 0, completed: 0, in_progress: 0, due: 0, paid: 0 },
    );
  }, [rows, rateCents]);

  function openPay(row: ProviderPayoutRow) {
    const balance = row.completed * rateCents - row.paid_cents;
    setPaying(row);
    setNote("");
    setAmount(balance > 0 ? (balance / 100).toFixed(2) : "");
  }

  function submitRate() {
    const cents = dollarsToCents(rateField);
    if (cents == null) {
      toast.error("Enter a payout rate of 0 or more.");
      return;
    }
    rateMut.mutate(cents);
  }

  function submitPayment() {
    if (!paying) return;
    const cents = dollarsToCents(amount);
    if (cents == null || cents < 1) {
      toast.error("Enter a payment amount greater than 0.");
      return;
    }
    payMut.mutate({
      provider_id: paying.provider_id,
      amount_cents: cents,
      note: note.trim() || undefined,
    });
  }

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h1 className={adminPageTitle}>Payouts</h1>
          <p className={adminPageSubtitle}>
            Provider name, total consultations, completed consultations, and in-progress consultations.
            Amount due is based on completed visits.
          </p>
        </div>
        <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[#D5DEDD] bg-white p-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="block min-w-0 flex-1 space-y-2">
          <span className="text-[13px] font-semibold text-[#3B4759]">Pay per completed consultation</span>
          <span className="block text-[13px] text-[#3B4759]/70">
            Amount due is completed consultations times this rate. Record a payment when you send it.
          </span>
          <div className="flex max-w-xs items-center gap-2">
            <span className="text-[16px] text-[#3B4759]">$</span>
            <Input
              inputMode="decimal"
              value={rateField}
              onChange={(e) => setRateInput(e.target.value)}
              className={adminInput}
            />
          </div>
        </label>
        <Button type="button" className={adminBtnPrimary} disabled={rateMut.isPending} onClick={submitRate}>
          {rateMut.isPending ? "Saving…" : "Save rate"}
        </Button>
      </div>

      {query.isError ? (
        <p className="rounded-2xl border border-[#D5DEDD] bg-white p-6 text-[14px] font-semibold text-[#B8684B]">
          {(query.error as Error).message}
        </p>
      ) : null}

      {summary && summary.unassigned > 0 ? (
        <p className="text-[13px] text-[#3B4759]/70">
          {summary.unassigned} consultation{summary.unassigned === 1 ? "" : "s"}{" "}
          {summary.unassigned === 1 ? "is" : "are"} not tied to a provider yet, so{" "}
          {summary.unassigned === 1 ? "it is" : "they are"} left out of these totals.
        </p>
      ) : null}

      <div className="relative max-w-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search providers"
          className={adminInput}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D5DEDD] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">In progress</TableHead>
              <TableHead className="text-right">Amount due</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-[14px] text-[#3B4759]/60">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-[14px] text-[#3B4759]/60">
                  No providers to show.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const due = row.completed * rateCents;
                const balance = due - row.paid_cents;
                return (
                  <TableRow key={row.provider_id}>
                    <TableCell className="font-medium text-[#3B4759]">
                      <div className="flex items-center gap-2">
                        <span>{row.name}</span>
                        {!row.is_active ? (
                          <Badge className="border-transparent bg-[#E8EEED] text-[11px] font-semibold text-[#3B4759] shadow-none hover:bg-[#E8EEED]">
                            Inactive
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-[#3B4759]">{row.total}</TableCell>
                    <TableCell className="text-right font-semibold text-[#3B4759]">{row.completed}</TableCell>
                    <TableCell className="text-right text-[#3B4759]">{row.in_progress}</TableCell>
                    <TableCell className="text-right text-[#3B4759]">{formatCents(due)}</TableCell>
                    <TableCell className="text-right text-[#3B4759]">{formatCents(row.paid_cents)}</TableCell>
                    <TableCell className="text-right font-semibold text-[#3B4759]">{formatCents(balance)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 bg-[#6A9B9C] text-[13px] font-semibold text-white hover:bg-[#5B8788]"
                        onClick={() => openPay(row)}
                      >
                        Record payment
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {!query.isLoading && rows.length > 0 ? (
              <TableRow>
                <TableCell className="font-semibold text-[#152A51]">Total</TableCell>
                <TableCell className="text-right font-semibold text-[#152A51]">{totals.total}</TableCell>
                <TableCell className="text-right font-semibold text-[#152A51]">{totals.completed}</TableCell>
                <TableCell className="text-right font-semibold text-[#152A51]">{totals.in_progress}</TableCell>
                <TableCell className="text-right font-semibold text-[#152A51]">{formatCents(totals.due)}</TableCell>
                <TableCell className="text-right font-semibold text-[#152A51]">{formatCents(totals.paid)}</TableCell>
                <TableCell className="text-right font-semibold text-[#152A51]">
                  {formatCents(totals.due - totals.paid)}
                </TableCell>
                <TableCell />
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        <h2 className="text-[18px] font-semibold text-[#152A51]">Recent payments</h2>
        <div className="overflow-x-auto rounded-xl border border-[#D5DEDD] bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Completed then</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(summary?.recent.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[14px] text-[#3B4759]/60">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                summary?.recent.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-[#3B4759]">{formatDateTime(entry.paid_at)}</TableCell>
                    <TableCell className="font-medium text-[#3B4759]">{entry.provider_name}</TableCell>
                    <TableCell className="text-right text-[#3B4759]">{entry.completed_count}</TableCell>
                    <TableCell className="text-right text-[#3B4759]">{formatCents(entry.amount_cents)}</TableCell>
                    <TableCell className="text-[#3B4759]/80">{entry.note || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!paying} onOpenChange={(open) => !open && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {paying
                ? `${paying.name} has ${paying.completed} completed consultation${paying.completed === 1 ? "" : "s"}. Amount due ${formatCents(paying.completed * rateCents)}, already paid ${formatCents(paying.paid_cents)}.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-[#3B4759]">Amount ($)</span>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={adminInput}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[13px] font-semibold text-[#3B4759]">Note</span>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional, for example the pay period"
                className={adminTextarea}
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" className={adminBtnSecondary} onClick={() => setPaying(null)}>
              Cancel
            </Button>
            <Button type="button" className={adminBtnPrimary} disabled={payMut.isPending} onClick={submitPayment}>
              {payMut.isPending ? "Saving…" : "Record payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
