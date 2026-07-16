import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { medicinesQueryOptions } from "@/lib/query-options/medicines";
import { changeSubscriptionMedicine } from "@/lib/orders.functions";
import type { StoredMedicinePackage } from "@/lib/medicines.store";

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function planLabel(p: StoredMedicinePackage) {
  const dur = p.duration_months === 1 ? "Monthly" : `${p.duration_months}-Month`;
  return `${dur} — ${money(p.price)}${p.duration_months > 1 ? ` (every ${p.duration_months} mo)` : "/mo"}`;
}

export function ChangeMedicineDialog({
  orderId,
  open,
  onOpenChange,
  onChanged,
}: {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const medicinesQ = useQuery(medicinesQueryOptions());
  const change = useServerFn(changeSubscriptionMedicine);

  const [medicineId, setMedicineId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");
  const [packageId, setPackageId] = useState<string>("");

  // Reset the cascade whenever the dialog reopens.
  useEffect(() => {
    if (open) {
      setMedicineId("");
      setVariantId("");
      setPackageId("");
    }
  }, [open]);

  const medicines = useMemo(
    () => (medicinesQ.data ?? []).filter((m) => m.is_active),
    [medicinesQ.data],
  );
  const medicine = medicines.find((m) => m.id === medicineId) ?? null;
  const hasVariants = (medicine?.variants.length ?? 0) > 0;
  const variant = hasVariants ? medicine?.variants.find((v) => v.id === variantId) ?? null : null;

  const packages = useMemo(() => {
    const list = hasVariants ? variant?.packages ?? [] : medicine?.packages ?? [];
    return list.filter((p) => p.is_active);
  }, [hasVariants, variant, medicine]);

  const mutation = useMutation({
    mutationFn: () => change({ data: { orderId, packageId } }),
    onSuccess: () => {
      toast.success("Medicine changed. The new plan applies from the next billing cycle.");
      onChanged();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit =
    !!medicineId && (!hasVariants || !!variantId) && !!packageId && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change medicine</DialogTitle>
          <DialogDescription>
            Switch this subscription to a different medicine, variant and plan. The new medicine and
            price take effect from the next billing cycle — the patient isn&apos;t charged now.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-sm">Medicine</Label>
            <Select
              value={medicineId}
              onValueChange={(v) => {
                setMedicineId(v);
                setVariantId("");
                setPackageId("");
              }}
              disabled={medicinesQ.isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={medicinesQ.isLoading ? "Loading…" : "Select a medicine"} />
              </SelectTrigger>
              <SelectContent>
                {medicines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasVariants ? (
            <div className="space-y-1.5">
              <Label className="text-sm">Variant</Label>
              <Select
                value={variantId}
                onValueChange={(v) => {
                  setVariantId(v);
                  setPackageId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a variant" />
                </SelectTrigger>
                <SelectContent>
                  {medicine!.variants
                    .filter((v) => v.is_active)
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {medicineId && (!hasVariants || variantId) ? (
            <div className="space-y-1.5">
              <Label className="text-sm">Plan</Label>
              {packages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This selection has no purchasable plan yet.
                </p>
              ) : (
                <Select value={packageId} onValueChange={setPackageId}>
                  <SelectTrigger>
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

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Changing…" : "Change medicine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
