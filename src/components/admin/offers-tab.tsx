import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshButton } from "@/components/admin/refresh-button";
import {
  createOffer,
  deleteOffer,
  listOffers,
  setOfferActive,
  updateOffer,
  type PortalOfferRow,
} from "@/lib/offers.functions";
import { listPromos } from "@/lib/promos.functions";
import { formatDateTime } from "@/lib/format";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminLabel,
  adminSelect,
} from "@/lib/admin-ui";

type FormState = {
  promo_code_id: string;
  headline: string;
  badge_text: string;
  cta_label: string;
  cta_href: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  sort_order: string;
};

const EMPTY: FormState = {
  promo_code_id: "",
  headline: "",
  badge_text: "",
  cta_label: "View Treatment Details",
  cta_href: "/shop",
  is_active: true,
  starts_at: "",
  ends_at: "",
  sort_order: "0",
};

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  const t = value.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function offerToForm(o: PortalOfferRow): FormState {
  return {
    promo_code_id: o.promo_code_id ?? "",
    headline: o.headline ?? "",
    badge_text: o.badge_text ?? "",
    cta_label: o.cta_label || "View Treatment Details",
    cta_href: o.cta_href || "/shop",
    is_active: o.is_active,
    starts_at: toDatetimeLocal(o.starts_at),
    ends_at: toDatetimeLocal(o.ends_at),
    sort_order: String(o.sort_order ?? 0),
  };
}

export function OffersTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listOffers);
  const createFn = useServerFn(createOffer);
  const updateFn = useServerFn(updateOffer);
  const setActiveFn = useServerFn(setOfferActive);
  const deleteFn = useServerFn(deleteOffer);
  const listPromosFn = useServerFn(listPromos);

  const offersQuery = useQuery({
    queryKey: ["admin-portal-offers"],
    queryFn: () => listFn(),
  });
  const promosQuery = useQuery({
    queryKey: ["admin-promos"],
    queryFn: () => listPromosFn(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PortalOfferRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!dialogOpen) return;
    setForm(editing ? offerToForm(editing) : EMPTY);
  }, [dialogOpen, editing]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  }

  function openEdit(row: PortalOfferRow) {
    setEditing(row);
    setForm(offerToForm(row));
    setDialogOpen(true);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function toggleActive(id: string, is_active: boolean) {
    try {
      await setActiveFn({ data: { id, is_active } });
      qc.invalidateQueries({ queryKey: ["admin-portal-offers"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function submit() {
    if (!form.headline.trim()) {
      toast.error("Headline is required");
      return;
    }
    const payload = {
      promo_code_id: form.promo_code_id || null,
      headline: form.headline.trim(),
      badge_text: form.badge_text.trim() || null,
      cta_label: form.cta_label.trim() || "View Treatment Details",
      cta_href: form.cta_href.trim() || "/shop",
      is_active: form.is_active,
      starts_at: fromDatetimeLocal(form.starts_at),
      ends_at: fromDatetimeLocal(form.ends_at),
      sort_order: Number.parseInt(form.sort_order, 10) || 0,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await updateFn({ data: { id: editing.id, ...payload } });
        toast.success("Offer updated");
      } else {
        await createFn({ data: payload });
        toast.success("Offer created");
      }
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-portal-offers"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteFn({ data: { id: deleteId } });
      toast.success("Offer deleted");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["admin-portal-offers"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  const rows = offersQuery.data ?? [];
  const promos = promosQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="text-[16px] font-bold text-[#3B4759]">Portal offers</h3>
          <p className="text-xs text-[#3B4759]/60">
            Marketing banners shown in the patient portal. Coupon text comes from the linked promo
            code.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RefreshButton
            onClick={() => offersQuery.refetch()}
            loading={offersQuery.isFetching}
          />
          <Button onClick={openCreate} className={adminBtnPrimary}>
            <Plus className="mr-1.5 h-4 w-4 stroke-[2.5]" /> Add offer
          </Button>
        </div>
      </div>

      <Card className="w-full overflow-hidden rounded-2xl border border-[#D5DEDD] bg-white shadow-sm">
        <div className="admin-table-scroll">
          <Table className="min-w-[860px]">
            <TableHeader className="bg-[#F8FBFA]">
              <TableRow className="border-b border-[#D5DEDD] hover:bg-transparent">
                <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                  Headline
                </TableHead>
                <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                  Promo
                </TableHead>
                <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">CTA</TableHead>
                <TableHead className="h-11 text-[13px] font-semibold text-[#3B4759]">
                  Schedule
                </TableHead>
                <TableHead className="h-11 w-16 text-[13px] font-semibold text-[#3B4759]">
                  Sort
                </TableHead>
                <TableHead className="h-11 w-20 text-[13px] font-semibold text-[#3B4759]">
                  Active
                </TableHead>
                <TableHead className="h-11 w-24 text-[13px] font-semibold text-[#3B4759]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {offersQuery.isLoading && (
                <TableRow className="border-b border-[#D5DEDD]">
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-[14px] font-medium text-[#3B4759]/60"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!offersQuery.isLoading && rows.length === 0 && (
                <TableRow className="border-b border-[#D5DEDD]">
                  <TableCell
                    colSpan={7}
                    className="py-12 text-center text-[14px] font-medium text-[#3B4759]/60"
                  >
                    No offers yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((o) => (
                <TableRow key={o.id} className="border-b border-[#D5DEDD] hover:bg-[#E8EEED]/40">
                  <TableCell className="max-w-[280px] text-[14px] font-semibold text-[#3B4759]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate">{o.headline}</span>
                      {o.badge_text ? (
                        <Badge variant="secondary" className="shrink-0 text-[11px] font-medium">
                          {o.badge_text}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-[14px] font-medium text-[#3B4759]">
                    {o.promo_codes?.code ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-[13px] text-[#3B4759]/80">
                    {o.cta_label}
                  </TableCell>
                  <TableCell className="text-[12px] text-[#3B4759]/70">
                    {o.starts_at || o.ends_at
                      ? `${formatDateTime(o.starts_at)} → ${formatDateTime(o.ends_at)}`
                      : "Always"}
                  </TableCell>
                  <TableCell className="text-[14px] text-[#3B4759]">{o.sort_order}</TableCell>
                  <TableCell>
                    <Switch
                      checked={o.is_active}
                      onCheckedChange={(v) => toggleActive(o.id, v)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(o)}
                        aria-label="Edit offer"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(o.id)}
                        aria-label="Delete offer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto font-['DM_Sans',sans-serif]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit offer" : "Add offer"}</DialogTitle>
            <DialogDescription>
              Configure a marketing banner for the patient portal. Coupon text comes from the linked
              promo code.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label className={adminLabel}>Headline</Label>
              <Input
                value={form.headline}
                onChange={(e) => set("headline", e.target.value)}
                className={adminInput}
                placeholder="Save with code WELCOME20"
              />
            </div>

            <div className="space-y-2">
              <Label className={adminLabel}>Promo code</Label>
              <Select
                value={form.promo_code_id || "__none__"}
                onValueChange={(v) => set("promo_code_id", v === "__none__" ? "" : v)}
              >
                <SelectTrigger className={adminSelect}>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {promos.map((p: { id: string; code: string }) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={adminLabel}>Badge text</Label>
                <Input
                  value={form.badge_text}
                  onChange={(e) => set("badge_text", e.target.value)}
                  className={adminInput}
                  placeholder="Limited time"
                />
              </div>
              <div className="space-y-2">
                <Label className={adminLabel}>Sort order</Label>
                <Input
                  type="number"
                  step="1"
                  value={form.sort_order}
                  onChange={(e) => set("sort_order", e.target.value)}
                  className={adminInput}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={adminLabel}>CTA label</Label>
                <Input
                  value={form.cta_label}
                  onChange={(e) => set("cta_label", e.target.value)}
                  className={adminInput}
                />
              </div>
              <div className="space-y-2">
                <Label className={adminLabel}>CTA href</Label>
                <Input
                  value={form.cta_href}
                  onChange={(e) => set("cta_href", e.target.value)}
                  className={adminInput}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className={adminLabel}>Starts at</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => set("starts_at", e.target.value)}
                  className={adminInput}
                />
              </div>
              <div className="space-y-2">
                <Label className={adminLabel}>Ends at</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => set("ends_at", e.target.value)}
                  className={adminInput}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#D5DEDD] px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-[#3B4759]">Active</p>
                <p className="text-xs text-[#3B4759]/60">Inactive offers are hidden from patients.</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className={adminBtnSecondary}
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="button" className={adminBtnPrimary} onClick={submit} disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Create offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the marketing banner. Linked promo codes are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
