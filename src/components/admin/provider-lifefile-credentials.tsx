import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { toastError } from "@/lib/toast-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteProviderLifeFileCredential,
  listLifeFilePharmacies,
  listProviderLifeFileCredentials,
  upsertProviderLifeFileCredential,
} from "@/lib/lifefile-pharmacies.functions";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
  adminInput,
  adminLabel,
  adminSectionTitle,
} from "@/lib/admin-ui";

type CredForm = {
  id?: string;
  pharmacy_id: string;
  api_base_url: string;
  api_username: string;
  api_password: string;
  provider_life_file_id: string;
  practice_id: string;
  npi: string;
  is_active: boolean;
};

const EMPTY: CredForm = {
  pharmacy_id: "",
  api_base_url: "",
  api_username: "",
  api_password: "",
  provider_life_file_id: "",
  practice_id: "",
  npi: "",
  is_active: true,
};

export function ProviderLifeFileCredentialsSection({ providerId }: { providerId: string }) {
  const qc = useQueryClient();
  const listCreds = useServerFn(listProviderLifeFileCredentials);
  const listPharmacies = useServerFn(listLifeFilePharmacies);
  const upsert = useServerFn(upsertProviderLifeFileCredential);
  const remove = useServerFn(deleteProviderLifeFileCredential);

  const [form, setForm] = useState<CredForm>(EMPTY);
  const [editing, setEditing] = useState(false);

  const credsQ = useQuery({
    queryKey: ["provider-life-file-credentials", providerId],
    queryFn: () => listCreds({ data: { providerId } }),
  });
  const pharmaciesQ = useQuery({
    queryKey: ["life-file-pharmacies"],
    queryFn: () => listPharmacies({}),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          id: form.id,
          provider_id: providerId,
          pharmacy_id: form.pharmacy_id,
          api_base_url: form.api_base_url,
          api_username: form.api_username,
          api_password: form.api_password,
          provider_life_file_id: form.provider_life_file_id,
          practice_id: form.practice_id,
          npi: form.npi,
          is_active: form.is_active,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider-life-file-credentials", providerId] });
      toast.success("LifeFile pharmacy credentials saved.");
      setForm(EMPTY);
      setEditing(false);
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider-life-file-credentials", providerId] });
      toast.success("Credentials removed.");
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  const pharmacies = pharmaciesQ.data ?? [];
  const creds = credsQ.data ?? [];

  return (
    <Card className={`${adminCard} mb-5 p-4 sm:mb-6 sm:p-6`}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-0 pb-4">
        <div>
          <CardTitle className={adminSectionTitle}>LifeFile pharmacy configuration</CardTitle>
          <p className="mt-1 text-[13px] font-normal text-[#3B4759]/80">
            Add username, password, and Provider LifeFile ID for each pharmacy this practitioner
            can send to.
          </p>
        </div>
        {!editing ? (
          <Button
            type="button"
            className={`${adminBtnPrimary} h-10 shrink-0`}
            onClick={() => {
              setForm(EMPTY);
              setEditing(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add pharmacy
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        {credsQ.isLoading ? (
          <p className="text-[14px] text-[#3B4759]/60">Loading…</p>
        ) : creds.length === 0 && !editing ? (
          <p className="text-[14px] text-[#3B4759]/60">No LifeFile pharmacies configured yet.</p>
        ) : (
          creds.map((c: any) => (
            <div
              key={c.id}
              className="flex flex-col gap-2 rounded-[12px] border border-[#E8EEED] p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 text-[14px] text-[#3B4759]">
                <div className="font-semibold text-[#152A51]">
                  {c.pharmacy_name ?? "Pharmacy"}
                  {!c.is_active ? " (inactive)" : ""}
                </div>
                <div className="text-[13px] text-[#3B4759]/70">
                  User: {c.api_username}
                  {c.provider_life_file_id ? ` · LF ID: ${c.provider_life_file_id}` : ""}
                  {c.practice_id != null ? ` · Practice: ${c.practice_id}` : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={adminBtnSecondary}
                  onClick={() => {
                    setForm({
                      id: c.id,
                      pharmacy_id: c.pharmacy_id,
                      api_base_url: c.api_base_url ?? "",
                      api_username: c.api_username ?? "",
                      api_password: "",
                      provider_life_file_id: c.provider_life_file_id ?? "",
                      practice_id: c.practice_id != null ? String(c.practice_id) : "",
                      npi: c.npi ?? "",
                      is_active: c.is_active !== false,
                    });
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-[#E7CFC3] text-[#8F4A33]"
                  onClick={() => {
                    if (confirm("Remove these LifeFile credentials?")) deleteMut.mutate(c.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}

        {editing ? (
          <div className="space-y-3 rounded-[12px] border border-[#D5DEDD] bg-[#F8FBFA] p-4">
            <div className="space-y-1">
              <Label className={adminLabel}>Pharmacy</Label>
              <Select
                value={form.pharmacy_id}
                onValueChange={(v) => setForm((f) => ({ ...f, pharmacy_id: v }))}
                disabled={!!form.id}
              >
                <SelectTrigger className={adminInput}>
                  <SelectValue placeholder="Select pharmacy" />
                </SelectTrigger>
                <SelectContent>
                  {pharmacies.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className={adminLabel}>Username</Label>
                <Input
                  className={adminInput}
                  value={form.api_username}
                  onChange={(e) => setForm((f) => ({ ...f, api_username: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className={adminLabel}>
                  Password{form.id ? " (leave blank to keep)" : ""}
                </Label>
                <Input
                  className={adminInput}
                  type="password"
                  value={form.api_password}
                  onChange={(e) => setForm((f) => ({ ...f, api_password: e.target.value }))}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className={adminLabel}>Provider LifeFile ID</Label>
                <Input
                  className={adminInput}
                  value={form.provider_life_file_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, provider_life_file_id: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className={adminLabel}>Practice ID</Label>
                <Input
                  className={adminInput}
                  inputMode="numeric"
                  value={form.practice_id}
                  onChange={(e) => setForm((f) => ({ ...f, practice_id: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className={adminLabel}>NPI (optional override)</Label>
                <Input
                  className={adminInput}
                  value={form.npi}
                  onChange={(e) => setForm((f) => ({ ...f, npi: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className={adminLabel}>API URL override (optional)</Label>
                <Input
                  className={adminInput}
                  value={form.api_base_url}
                  onChange={(e) => setForm((f) => ({ ...f, api_base_url: e.target.value }))}
                  placeholder="Uses pharmacy URL if blank"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <span className="text-[13px] font-medium text-[#3B4759]">Active</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                className={adminBtnPrimary}
                disabled={saveMut.isPending || !form.pharmacy_id}
                onClick={() => saveMut.mutate()}
              >
                {saveMut.isPending ? "Saving…" : "Save credentials"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={adminBtnSecondary}
                onClick={() => {
                  setEditing(false);
                  setForm(EMPTY);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
