import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
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
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search by patient or reason…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No refund requests.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.customer_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{r.customer_email ?? "—"}</div>
                </TableCell>
                <TableCell>{formatCurrency(r.amount)}</TableCell>
                <TableCell className="max-w-[220px]">
                  <span className="text-sm">{r.reason || "—"}</span>
                  {r.admin_note ? (
                    <span className="block text-xs text-muted-foreground">Note: {r.admin_note}</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {r.invoice_url ? (
                      <a
                        href={r.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
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
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Download invoice PDF"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    ) : null}
                    {!r.invoice_url && !r.invoice_pdf_url ? (
                      <span className="text-muted-foreground">—</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                <TableCell className="text-right">
                  {r.status === "pending" ? (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => onApprove(r.id)}
                        disabled={busyId === r.id}
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
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Resolved</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject refund request</DialogTitle>
            <DialogDescription>
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
            placeholder="Reason for rejecting (optional)…"
            rows={4}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={busyId !== null}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onReject} disabled={busyId !== null}>
              {busyId ? "Rejecting…" : "Reject request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
