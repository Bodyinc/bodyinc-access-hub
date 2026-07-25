import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { medicinesQueryOptions } from "@/lib/query-options/medicines";
import { changeRequestMedicine } from "@/lib/requests.functions";
import type { StoredMedicinePackage } from "@/lib/medicines.store";

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function planLabel(p: StoredMedicinePackage) {
  const dur = p.duration_months === 1 ? "Monthly" : `${p.duration_months}-Month`;
  return `${dur} — ${money(p.price)}${p.duration_months > 1 ? ` (every ${p.duration_months} mo)` : "/mo"}`;
}

export type RequestChangeCurrent = {
  medicineName: string | null;
  planName: string | null;
  price: number | null;
};

// Change the medicine on a medication order under review. Unlike the subscription change dialog,
// a more expensive switch sends the patient a payment request for the difference before the
// prescription is generated; a cheaper switch is credited to their next cycle.
export function RequestChangeMedicineDialog({
  requestId,
  open,
  onOpenChange,
  onChanged,
  current,
}: {
  requestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  current: RequestChangeCurrent;
}) {
  const medicinesQ = useQuery(medicinesQueryOptions());
  const change = useServerFn(changeRequestMedicine);

  const [search, setSearch] = useState("");
  const [medicineId, setMedicineId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");
  const [packageId, setPackageId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setSearch("");
      setMedicineId("");
      setVariantId("");
      setPackageId("");
    }
  }, [open]);

  const medicines = useMemo(
    () => (medicinesQ.data ?? []).filter((m) => m.is_active),
    [medicinesQ.data],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return medicines;
    return medicines.filter((m) => m.name.toLowerCase().includes(s));
  }, [medicines, search]);

  const medicine = medicines.find((m) => m.id === medicineId) ?? null;
  const hasVariants = (medicine?.variants.length ?? 0) > 0;
  const activeVariants = useMemo(
    () => (medicine?.variants ?? []).filter((v) => v.is_active),
    [medicine],
  );
  const variant = hasVariants ? activeVariants.find((v) => v.id === variantId) ?? null : null;

  const packages = useMemo(() => {
    const list = hasVariants ? variant?.packages ?? [] : medicine?.packages ?? [];
    return list.filter((p) => p.is_active && p.stripe_price_id);
  }, [hasVariants, variant, medicine]);

  useEffect(() => {
    if (!medicine) return;
    if (hasVariants && !variantId && activeVariants.length === 1) setVariantId(activeVariants[0].id);
  }, [medicine, hasVariants, variantId, activeVariants]);

  useEffect(() => {
    if (!medicine) return;
    if ((!hasVariants || variantId) && !packageId && packages.length === 1) {
      setPackageId(packages[0].id);
    }
  }, [medicine, hasVariants, variantId, packageId, packages]);

  function selectMedicine(id: string) {
    setMedicineId(id);
    setVariantId("");
    setPackageId("");
  }

  const selectedPkg = packages.find((p) => p.id === packageId) ?? null;
  const diff =
    selectedPkg && current.price != null ? selectedPkg.price - current.price : null;

  const mutation = useMutation({
    mutationFn: () => change({ data: { requestId, packageId } }),
    onSuccess: (res: any) => {
      toast.success(
        res?.status === "awaiting_additional_payment"
          ? "Medicine changed. The patient has been sent a payment request for the difference."
          : "Medicine changed and approved.",
      );
      onChanged();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = !!selectedPkg && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Change medicine</DialogTitle>
          <DialogDescription>
            Switch this order to a different medicine. If it costs more, the patient is sent a
            payment request for the difference before the prescription is generated; if it costs
            less, the difference is credited to their next cycle.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Current
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
              <div className="font-semibold text-foreground">{current.medicineName ?? "—"}</div>
              <div className="text-muted-foreground">{current.planName ?? "—"}</div>
              <div className="text-lg font-bold text-foreground">
                {current.price != null ? money(current.price) : "—"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              New medicine
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search medicines…"
                className="pl-8 h-9"
                disabled={medicinesQ.isLoading}
              />
            </div>

            <div className="rounded-lg border max-h-56 overflow-y-auto divide-y">
              {medicinesQ.isLoading ? (
                <div className="p-3 text-sm text-muted-foreground">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No medicines match.</div>
              ) : (
                filtered.map((m) => {
                  const selected = m.id === medicineId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMedicine(m.id)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-sm transition-colors ${
                        selected ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{m.name}</div>
                      </div>
                      {selected ? <Check className="h-4 w-4 text-primary shrink-0" /> : null}
                    </button>
                  );
                })
              )}
            </div>

            {hasVariants ? (
              <div className="space-y-1">
                <Label className="text-xs">Variant</Label>
                <Select
                  value={variantId}
                  onValueChange={(v) => {
                    setVariantId(v);
                    setPackageId("");
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeVariants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {medicine && (!hasVariants || variantId) ? (
              <div className="space-y-1">
                <Label className="text-xs">Plan</Label>
                {packages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No purchasable plan for this selection.
                  </p>
                ) : (
                  <Select value={packageId} onValueChange={setPackageId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {planLabel(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {selectedPkg && diff != null ? (
          <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Price difference</span>
              <span
                className={`font-bold ${
                  diff > 0 ? "text-destructive" : diff < 0 ? "text-emerald-600" : "text-foreground"
                }`}
              >
                {diff > 0 ? "+" : diff < 0 ? "−" : ""}
                {money(Math.abs(diff))}
              </span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {diff > 0
                ? "The patient will be asked to pay this difference before the prescription is generated."
                : diff < 0
                  ? "This credit settles on the patient's next billing cycle."
                  : "No price change."}
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Changing…" : "Confirm change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
