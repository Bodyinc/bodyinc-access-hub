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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { medicinesQueryOptions } from "@/lib/query-options/medicines";
import { categoriesQueryOptions } from "@/lib/query-options/categories";
import { changeRequestMedicine } from "@/lib/requests.functions";
import type { StoredMedicinePackage } from "@/lib/medicines.store";
import { formatDollars } from "@/lib/format";
import { toastError } from "@/lib/toast-message";

function planLabel(p: StoredMedicinePackage) {
  const dur = p.duration_months === 1 ? "Monthly" : `${p.duration_months}-Month`;
  return `${dur} — ${formatDollars(p.price)}${p.duration_months > 1 ? ` (every ${p.duration_months} mo)` : "/mo"}`;
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
  currentMedicineId,
}: {
  requestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  current: RequestChangeCurrent;
  currentMedicineId?: string | null;
}) {
  const medicinesQ = useQuery(medicinesQueryOptions());
  const categoriesQ = useQuery(categoriesQueryOptions());
  const change = useServerFn(changeRequestMedicine);

  const [search, setSearch] = useState("");
  const [medicineId, setMedicineId] = useState<string>("");
  const [variantId, setVariantId] = useState<string>("");
  const [packageId, setPackageId] = useState<string>("");
  const [allowOtherCategory, setAllowOtherCategory] = useState(false);
  const [categoryReason, setCategoryReason] = useState("");

  useEffect(() => {
    if (open) {
      setSearch("");
      setMedicineId("");
      setVariantId("");
      setPackageId("");
      setAllowOtherCategory(false);
      setCategoryReason("");
    }
  }, [open]);

  const medicines = useMemo(
    () => (medicinesQ.data ?? []).filter((m) => m.is_active),
    [medicinesQ.data],
  );

  // Same-category first: practitioners switch within a treatment category by default, and must
  // opt in (with a clinical reason) to move a patient to a different category.
  const currentCategoryIds = useMemo(() => {
    const m = medicines.find((x) => x.id === currentMedicineId);
    return new Set(m?.category_ids ?? []);
  }, [medicines, currentMedicineId]);

  const inSameCategory = (m: { id: string; category_ids: string[] }) =>
    currentCategoryIds.size === 0 || m.category_ids.some((c) => currentCategoryIds.has(c));

  const categoryNames = useMemo(() => {
    const map = new Map((categoriesQ.data ?? []).map((c) => [c.id, c.name] as const));
    return Array.from(currentCategoryIds)
      .map((id) => map.get(id))
      .filter(Boolean) as string[];
  }, [categoriesQ.data, currentCategoryIds]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return medicines
      .filter((m) => m.id !== currentMedicineId)
      .filter((m) => allowOtherCategory || inSameCategory(m))
      .filter((m) => !s || m.name.toLowerCase().includes(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicines, search, allowOtherCategory, currentCategoryIds, currentMedicineId]);

  const medicine = medicines.find((m) => m.id === medicineId) ?? null;
  const hasVariants = (medicine?.variants.length ?? 0) > 0;
  const activeVariants = useMemo(
    () => (medicine?.variants ?? []).filter((v) => v.is_active),
    [medicine],
  );
  const variant = hasVariants ? (activeVariants.find((v) => v.id === variantId) ?? null) : null;

  const packages = useMemo(() => {
    const list = hasVariants ? (variant?.packages ?? []) : (medicine?.packages ?? []);
    return list.filter((p) => p.is_active && p.stripe_price_id);
  }, [hasVariants, variant, medicine]);

  useEffect(() => {
    if (!medicine) return;
    if (hasVariants && !variantId && activeVariants.length === 1)
      setVariantId(activeVariants[0].id);
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
  const diff = selectedPkg && current.price != null ? selectedPkg.price - current.price : null;

  const isCrossCategory = !!medicine && currentCategoryIds.size > 0 && !inSameCategory(medicine);
  const reasonMissing = isCrossCategory && categoryReason.trim().length < 10;

  const mutation = useMutation({
    mutationFn: () =>
      change({
        data: {
          requestId,
          packageId,
          crossCategoryReason: isCrossCategory ? categoryReason.trim() : undefined,
        },
      }),
    onSuccess: (res: any) => {
      toast.success(
        res?.status === "awaiting_additional_payment"
          ? "Medicine changed. The patient has been sent a payment request for the difference."
          : "Medicine changed and approved.",
      );
      onChanged();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  const canSubmit = !!selectedPkg && !mutation.isPending && !reasonMissing;

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
                {current.price != null ? formatDollars(current.price) : "—"}
              </div>
              {categoryNames.length > 0 ? (
                <div className="flex flex-wrap gap-1 pt-1">
                  {categoryNames.map((n) => (
                    <Badge key={n} variant="secondary" className="text-[11px]">
                      {n}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              New medicine
            </div>

            {currentCategoryIds.size > 0 ? (
              <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                <Label htmlFor="allow-other-cat" className="text-xs font-normal leading-snug">
                  Show medicines from other categories
                </Label>
                <Switch
                  id="allow-other-cat"
                  checked={allowOtherCategory}
                  onCheckedChange={(v) => {
                    setAllowOtherCategory(v);
                    setMedicineId("");
                    setVariantId("");
                    setPackageId("");
                  }}
                />
              </div>
            ) : null}

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
                  const other = !inSameCategory(m);
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
                        {other ? (
                          <div className="text-[11px] text-muted-foreground">Other category</div>
                        ) : null}
                      </div>
                      {selected ? <Check className="h-4 w-4 text-primary shrink-0" /> : null}
                    </button>
                  );
                })
              )}
            </div>

            {isCrossCategory ? (
              <div className="space-y-1 rounded-md border border-[#B8684B]/40 bg-[#B8684B]/5 p-3">
                <Label className="text-xs font-semibold text-[#8F4A33]">
                  Clinical reason for changing treatment category
                </Label>
                <Textarea
                  value={categoryReason}
                  onChange={(e) => setCategoryReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Explain why this patient should move to a different treatment category…"
                />
                <p className="text-[11px] text-muted-foreground">
                  Required (min. 10 characters). This is recorded on the order timeline and notes.
                </p>
              </div>
            ) : null}

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
                {formatDollars(Math.abs(diff))}
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
