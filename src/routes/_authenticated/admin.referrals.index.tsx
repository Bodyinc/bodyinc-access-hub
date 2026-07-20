import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { RefreshButton } from "@/components/admin/refresh-button";
import {
  adjustPatientWallet,
  getPatientWallet,
  listReferrals,
} from "@/lib/referrals.functions";

export const Route = createFileRoute("/_authenticated/admin/referrals/")({
  component: ReferralsPage,
});

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 rounded-2xl border border-[#EAE6FA] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B5AE0]/70">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#2A00A2]">{value}</p>
    </Card>
  );
}

function WalletDialog({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const walletFn = useServerFn(getPatientWallet);
  const adjustFn = useServerFn(adjustPatientWallet);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const wallet = useQuery({
    queryKey: ["patient-wallet", userId],
    queryFn: () => walletFn({ data: { userId } }),
  });

  const adjustMut = useMutation({
    mutationFn: (vars: { amount_cents: number; note?: string; request_id: string }) =>
      adjustFn({ data: { userId, ...vars } }),
    onSuccess: () => {
      toast.success("Wallet updated");
      setAmount("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["patient-wallet", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(sign: 1 | -1) {
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    adjustMut.mutate({
      amount_cents: sign * Math.round(dollars * 100),
      note: note || undefined,
      request_id: crypto.randomUUID(),
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-2xl border-[#E2DCFA]">
        <DialogHeader>
          <DialogTitle className="text-[#2A00A2]">
            Wallet — {wallet.data?.user.full_name ?? wallet.data?.user.email ?? "Patient"}
          </DialogTitle>
          <DialogDescription className="text-[#6B5AE0]/80">
            Balance:{" "}
            <span className="font-bold text-[#2A00A2]">
              {wallet.data ? usd(wallet.data.balance_cents) : "…"}
            </span>{" "}
            — credit is applied automatically to the patient's next bill.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (USD)"
              inputMode="decimal"
              className="h-10 rounded-xl border-[#E2DCFA]"
            />
            <Button
              disabled={adjustMut.isPending}
              onClick={() => submit(1)}
              className="h-10 rounded-xl bg-[#2A00A2] text-white hover:bg-[#22008A]"
            >
              Add credit
            </Button>
            <Button
              disabled={adjustMut.isPending}
              onClick={() => submit(-1)}
              variant="outline"
              className="h-10 rounded-xl border-[#FF4D6D]/40 text-[#FF4D6D] hover:bg-[#FFF1F4]"
            >
              Deduct
            </Button>
          </div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="h-10 rounded-xl border-[#E2DCFA]"
          />
        </div>

        <div className="max-h-56 overflow-y-auto rounded-xl border border-[#EAE6FA]">
          <Table>
            <TableBody>
              {(wallet.data?.transactions ?? []).map((t: any) => (
                <TableRow key={t.id} className="border-b border-[#EAE6FA]/50">
                  <TableCell className="text-[13px] text-[#2A00A2]/80">
                    {t.description ?? t.type}
                    <span className="ml-2 text-xs text-[#6B5AE0]/60">{formatDate(t.created_at)}</span>
                  </TableCell>
                  <TableCell
                    className={`text-right text-[13px] font-bold ${
                      t.amount_cents >= 0 ? "text-emerald-700" : "text-[#FF4D6D]"
                    }`}
                  >
                    {t.amount_cents >= 0 ? "+" : "−"}
                    {usd(Math.abs(t.amount_cents))}
                  </TableCell>
                </TableRow>
              ))}
              {wallet.data && wallet.data.transactions.length === 0 ? (
                <TableRow>
                  <TableCell className="py-6 text-center text-[13px] text-[#6B5AE0]/60">
                    No wallet activity yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReferralsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listReferrals);

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState<"all" | "pending" | "converted">("all");
  const [walletUser, setWalletUser] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["referrals", { search: debounced, status }],
    queryFn: () => list({ data: { search: debounced || undefined, status } }),
  });

  const stats = query.data?.stats;
  const rows = query.data?.rows ?? [];

  return (
    <div className="w-full text-left m-0 p-0 space-y-5 max-w-none">
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold text-[#2A00A2] tracking-tight">Referrals</h2>
          <p className="text-sm text-[#6B5AE0]/70 font-medium">
            Track who referred whom, reward status, and manage patient wallets.
          </p>
        </div>
        <RefreshButton
          onClick={() => qc.invalidateQueries({ queryKey: ["referrals"] })}
          loading={query.isFetching}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <StatCard label="Total referrals" value={String(stats?.total ?? "—")} />
        <StatCard label="Pending" value={String(stats?.pending ?? "—")} />
        <StatCard label="Converted" value={String(stats?.converted ?? "—")} />
        <StatCard label="Rewards paid" value={stats ? usd(stats.rewarded_cents) : "—"} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#6B5AE0]/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or code"
            className="pl-9 h-10 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px] placeholder:text-[#6B5AE0]/40 bg-white"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40 h-10 rounded-xl border-[#E2DCFA] bg-white text-[#2A00A2] font-semibold text-[14px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-[#E2DCFA]">
            <SelectItem value="all" className="font-medium text-[#2A00A2]">All</SelectItem>
            <SelectItem value="pending" className="font-medium text-[#2A00A2]">Pending</SelectItem>
            <SelectItem value="converted" className="font-medium text-[#2A00A2]">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="w-full overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl max-w-none m-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-[#FDFDFF]">
              <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Referrer</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Referred friend</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Code</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Status</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Reward</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Invited</TableHead>
                <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Converted</TableHead>
                <TableHead className="w-24 h-11 text-[13px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-[#6B5AE0]/60 font-semibold text-[14px]">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {query.isError && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-[#FF4D6D] font-semibold text-[14px]">
                    {(query.error as Error).message}
                  </TableCell>
                </TableRow>
              )}
              {!query.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-[#6B5AE0]/60 font-semibold text-[14px]">
                    No referrals yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r: any) => (
                <TableRow key={r.id} className="border-b border-[#EAE6FA]/50 hover:bg-[#F5F3FF]/40">
                  <TableCell>
                    <p className="font-bold text-[#2A00A2] text-[14px]">{r.referrer_name ?? "—"}</p>
                    <p className="text-xs text-[#6B5AE0]/70">{r.referrer_email}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-[#2A00A2] text-[14px]">{r.referred_name ?? "—"}</p>
                    <p className="text-xs text-[#6B5AE0]/70">{r.referred_email}</p>
                  </TableCell>
                  <TableCell className="font-mono text-[13px] text-[#2A00A2]">{r.code}</TableCell>
                  <TableCell>
                    <Badge
                      className={`font-bold text-[12px] px-2.5 py-0.5 rounded-lg shadow-none border border-transparent ${
                        r.status === "converted"
                          ? "bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#E8F5E9]"
                          : "bg-[#F5F3FF] text-[#2A00A2] hover:bg-[#F5F3FF]"
                      }`}
                    >
                      {r.status === "converted" ? "Converted" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-[#2A00A2] text-[14px]">
                    {r.status === "converted" ? usd(r.reward_cents) : "—"}
                  </TableCell>
                  <TableCell className="text-[#2A00A2]/80 text-[13px]">{formatDate(r.created_at)}</TableCell>
                  <TableCell className="text-[#2A00A2]/80 text-[13px]">{formatDate(r.converted_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-xl text-[#6B5AE0] hover:bg-[#F5F3FF] text-[12px] font-bold"
                      onClick={() => setWalletUser(r.referrer_user_id)}
                    >
                      <Wallet className="mr-1 h-3.5 w-3.5" /> Wallet
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {walletUser ? <WalletDialog userId={walletUser} onClose={() => setWalletUser(null)} /> : null}
    </div>
  );
}
