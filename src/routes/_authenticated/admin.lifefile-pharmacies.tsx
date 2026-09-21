import { toastError } from "@/lib/toast-message";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createLifeFilePharmacy,
  deleteLifeFilePharmacy,
  listLifeFilePharmacies,
  updateLifeFilePharmacy,
} from "@/lib/lifefile-pharmacies.functions";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
  adminLabel,
  adminSectionTitle,
} from "@/lib/admin-ui";
import { Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/lifefile-pharmacies")({
  head: () => ({
    meta: [
      { title: "LifeFile Pharmacies · Body Inc Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LifeFilePharmaciesPage,
});

type FormState = {
  id?: string;
  name: string;
  api_base_url: string;
  vendor_id: string;
  location_id: string;
  api_network_id: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: "",
  api_base_url: "",
  vendor_id: "",
  location_id: "",
  api_network_id: "",
  is_active: true,
};

function LifeFilePharmaciesPage() {
  const qc = useQueryClient();
  const list = useServerFn(listLifeFilePharmacies);
  const create = useServerFn(createLifeFilePharmacy);
  const update = useServerFn(updateLifeFilePharmacy);
  const remove = useServerFn(deleteLifeFilePharmacy);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const q = useQuery({
    queryKey: ["life-file-pharmacies"],
    queryFn: () => list({}),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (form.id) {
        return update({ data: { ...form, id: form.id } });
      }
      return create({ data: form });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["life-file-pharmacies"] });
      toast.success(form.id ? "Pharmacy updated." : "Pharmacy created.");
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["life-file-pharmacies"] });
      toast.success("Pharmacy deleted.");
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-5">
      <PageHeader
        title="LifeFile Pharmacies"
        crumbs={[{ label: "LifeFile Pharmacies" }]}
        actions={
          <Button
            className={adminBtnPrimary}
            onClick={() => {
              setForm(EMPTY);
              setOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add pharmacy
          </Button>
        }
      />

      <Card className={adminCard}>
        <CardHeader>
          <CardTitle className={adminSectionTitle}>Configured pharmacies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.isLoading ? (
            <p className="text-[14px] text-[#3B4759]/60">Loading…</p>
          ) : (q.data ?? []).length === 0 ? (
            <p className="text-[14px] text-[#3B4759]/60">
              No pharmacies yet. Add Striker, Optimal, etc. before linking medicines and providers.
            </p>
          ) : (
            (q.data ?? []).map((p: any) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-[12px] border border-[#E8EEED] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-[#152A51]">{p.name}</span>
                    <Badge
                      className={`rounded-lg border-transparent px-2 py-0.5 text-[11px] font-semibold shadow-none ${
                        p.is_active
                          ? "bg-[#6A9B9C] text-white hover:bg-[#6A9B9C]"
                          : "bg-[#FBF1EC] text-[#B8684B] hover:bg-[#FBF1EC]"
                      }`}
                    >
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="truncate text-[13px] text-[#3B4759]/70">{p.api_base_url}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={adminBtnSecondary}
                    onClick={() => {
                      setForm({
                        id: p.id,
                        name: p.name ?? "",
                        api_base_url: p.api_base_url ?? "",
                        vendor_id: p.vendor_id ?? "",
                        location_id: p.location_id ?? "",
                        api_network_id: p.api_network_id ?? "",
                        is_active: p.is_active !== false,
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#E7CFC3] text-[#8F4A33]"
                    disabled={deleteMut.isPending}
                    onClick={() => {
                      if (confirm(`Delete pharmacy "${p.name}"?`)) deleteMut.mutate(p.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit pharmacy" : "Add pharmacy"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label className={adminLabel}>Pharmacy name</Label>
              <Input
                className={adminInput}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Striker"
              />
            </div>
            <div className="space-y-1">
              <Label className={adminLabel}>API URL</Label>
              <Input
                className={adminInput}
                value={form.api_base_url}
                onChange={(e) => setForm((f) => ({ ...f, api_base_url: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className={adminLabel}>Vendor ID</Label>
                <Input
                  className={adminInput}
                  value={form.vendor_id}
                  onChange={(e) => setForm((f) => ({ ...f, vendor_id: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className={adminLabel}>Location ID</Label>
                <Input
                  className={adminInput}
                  value={form.location_id}
                  onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className={adminLabel}>API Network ID</Label>
                <Input
                  className={adminInput}
                  value={form.api_network_id}
                  onChange={(e) => setForm((f) => ({ ...f, api_network_id: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <span className="text-[13px] font-medium text-[#3B4759]">Active</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className={adminBtnPrimary}
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
            >
              {saveMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
