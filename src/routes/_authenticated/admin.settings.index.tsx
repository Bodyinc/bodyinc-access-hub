import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getSettings, updateSettings, type PlatformSettings } from "@/lib/settings.functions";
import { syncShippingBatch } from "@/lib/shipping-reprice.functions";
import { ActivityLogTab } from "@/components/admin/activity-log-tab";

export const Route = createFileRoute("/_authenticated/admin/settings/")({
  component: SettingsPage,
});

type FormState = {
  consultation_fee: string;
  consultation_fee_enabled: boolean;
  shipping_fee: string;
  shipping_fee_enabled: boolean;
  referral_reward: string;
  referral_enabled: boolean;
  maintenance_mode: boolean;
  new_signups_enabled: boolean;
};

function centsToStr(cents: number) {
  return (cents / 100).toFixed(2);
}

function strToCents(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function toForm(s: PlatformSettings): FormState {
  return {
    consultation_fee: centsToStr(s.consultation_fee_cents),
    consultation_fee_enabled: s.consultation_fee_enabled,
    shipping_fee: centsToStr(s.shipping_fee_cents),
    shipping_fee_enabled: s.shipping_fee_enabled,
    referral_reward: centsToStr(s.referral_reward_cents),
    referral_enabled: s.referral_enabled,
    maintenance_mode: s.maintenance_mode,
    new_signups_enabled: s.new_signups_enabled,
  };
}

function FeeRow({
  label,
  help,
  value,
  onChange,
  enabled,
  onToggle,
}: {
  label: string;
  help: string;
  value: string;
  onChange: (v: string) => void;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-[#EAE6FA] bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label className="text-[14px] font-bold text-[#2A00A2]">{label}</Label>
          <p className="text-xs text-[#6B5AE0]/70">{help}</p>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-[#6B5AE0]/70">
            {enabled ? "Enabled" : "Disabled"}
          </span>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm font-semibold text-[#2A00A2]">$</span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          disabled={!enabled}
          className="h-10 w-40 rounded-xl border-[#E2DCFA] text-[#2A00A2] font-semibold disabled:opacity-50"
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[#EAE6FA] bg-white p-4">
      <div className="space-y-0.5">
        <Label className="text-[14px] font-bold text-[#2A00A2]">{label}</Label>
        <p className="text-xs text-[#6B5AE0]/70">{help}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-1" />
    </div>
  );
}

type SyncTotals = {
  scanned: number;
  updated: number;
  added: number;
  removed: number;
  skipped: number;
  errors: number;
};

const ZERO_TOTALS: SyncTotals = {
  scanned: 0,
  updated: 0,
  added: 0,
  removed: 0,
  skipped: 0,
  errors: 0,
};

function ShippingSync({ unsaved }: { unsaved: boolean }) {
  const qc = useQueryClient();
  const syncFn = useServerFn(syncShippingBatch);
  const [running, setRunning] = useState(false);
  const [scanned, setScanned] = useState(0);

  async function runSync() {
    setRunning(true);
    setScanned(0);
    let statusIndex = 0;
    let startingAfter: string | null = null;
    let totals: SyncTotals = { ...ZERO_TOTALS };
    try {
      // Bounded to avoid any accidental infinite loop; far above realistic batch counts.
      for (let i = 0; i < 100_000; i++) {
        const res = await syncFn({ data: { statusIndex, startingAfter, totals } });
        totals = res.totals;
        statusIndex = res.statusIndex;
        startingAfter = res.startingAfter;
        setScanned(totals.scanned);
        if (res.done) break;
      }
      toast.success(
        `Synced ${totals.scanned} subscription${totals.scanned === 1 ? "" : "s"}: ${totals.updated} updated, ${totals.added} added, ${totals.removed} removed${
          totals.errors ? `, ${totals.errors} failed` : ""
        }.`,
      );
      qc.invalidateQueries({ queryKey: ["admin-activity-log"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-dashed border-[#E2DCFA] bg-[#FBFAFF] p-4">
      <div className="space-y-0.5">
        <Label className="text-[14px] font-bold text-[#2A00A2]">
          Apply to existing subscriptions
        </Label>
        <p className="text-xs text-[#6B5AE0]/70">
          Save the fee first. New subscriptions use the saved amount automatically; this updates the
          recurring shipping on all active subscriptions to match (adds, re-prices, or removes it).
          Changes take effect on each subscription&apos;s next renewal.
        </p>
        {unsaved ? (
          <p className="pt-1 text-xs font-semibold text-[#FF4D6D]">
            You have unsaved shipping changes — click “Save changes” first, then sync.
          </p>
        ) : null}
        {running ? (
          <p className="pt-1 text-xs font-semibold text-[#4A3AFF]">
            Syncing… {scanned} processed (keep this tab open)
          </p>
        ) : null}
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            disabled={running || unsaved}
            className="h-9 shrink-0 rounded-xl border-[#E2DCFA] font-semibold text-[#2A00A2] hover:bg-[#F5F3FF]"
          >
            {running ? "Syncing…" : "Sync now"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl border-[#E2DCFA]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#2A00A2]">
              Sync shipping to active subscriptions?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#6B5AE0]/80">
              This updates the recurring shipping charge on every active subscription in Stripe to
              match the currently saved shipping fee. It applies from each subscription&apos;s next
              renewal. It runs in batches while this tab stays open. Make sure you&apos;ve saved the
              fee you want first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void runSync()}
              className="rounded-xl bg-[#2A00A2] text-white hover:bg-[#22008A]"
            >
              Sync now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SettingsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSettings);
  const updateFn = useServerFn(updateSettings);

  const query = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => getFn(),
  });

  const [form, setForm] = useState<FormState | null>(null);
  const [tab, setTab] = useState("fees");
  useEffect(() => {
    if (query.data) setForm(toForm(query.data));
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (payload: Partial<PlatformSettings>) => updateFn({ data: payload }),
    onSuccess: (res) => {
      toast.success(res.changed ? "Settings saved" : "No changes to save");
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-activity-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function save() {
    if (!form) return;
    const consultationCents = strToCents(form.consultation_fee);
    const shippingCents = strToCents(form.shipping_fee);
    const referralCents = strToCents(form.referral_reward);
    if (consultationCents === null || shippingCents === null || referralCents === null) {
      toast.error("Enter valid, non-negative amounts");
      return;
    }
    mutation.mutate({
      consultation_fee_cents: consultationCents,
      consultation_fee_enabled: form.consultation_fee_enabled,
      shipping_fee_cents: shippingCents,
      shipping_fee_enabled: form.shipping_fee_enabled,
      referral_reward_cents: referralCents,
      referral_enabled: form.referral_enabled,
      maintenance_mode: form.maintenance_mode,
      new_signups_enabled: form.new_signups_enabled,
    });
  }

  return (
    <div className="w-full max-w-none space-y-5 text-left">
      <div className="space-y-0.5">
        <h2 className="text-xl font-bold tracking-tight text-[#2A00A2]">Settings</h2>
        <p className="text-sm font-medium text-[#6B5AE0]/70">
          Configure fees, referrals, and platform-wide behavior.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-[#F5F3FF] text-[#6B5AE0]">
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="audit">Audit logs</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="mt-4">
          <Card className="space-y-4 border border-[#EAE6FA] bg-[#FDFDFF] p-5 shadow-sm">
            {form ? (
              <>
                <FeeRow
                  label="Consultation fee"
                  help="Charged one time when a patient starts a new medication from the shop. It is FREE on the first onboarding order and is never charged on recurring renewals."
                  value={form.consultation_fee}
                  onChange={(v) => set("consultation_fee", v)}
                  enabled={form.consultation_fee_enabled}
                  onToggle={(v) => set("consultation_fee_enabled", v)}
                />
                <FeeRow
                  label="Shipping fee"
                  help="FREE on the first onboarding order, then charged on every recurring renewal and on every shop order (including its renewals)."
                  value={form.shipping_fee}
                  onChange={(v) => set("shipping_fee", v)}
                  enabled={form.shipping_fee_enabled}
                  onToggle={(v) => set("shipping_fee_enabled", v)}
                />
                <ShippingSync
                  unsaved={
                    !!query.data &&
                    (strToCents(form.shipping_fee) !== query.data.shipping_fee_cents ||
                      form.shipping_fee_enabled !== query.data.shipping_fee_enabled)
                  }
                />
              </>
            ) : (
              <p className="text-sm text-[#6B5AE0]/60">Loading…</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          <Card className="space-y-4 border border-[#EAE6FA] bg-[#FDFDFF] p-5 shadow-sm">
            {form ? (
              <FeeRow
                label="Referral reward"
                help="Wallet credit granted to a referrer when their invited friend starts a plan."
                value={form.referral_reward}
                onChange={(v) => set("referral_reward", v)}
                enabled={form.referral_enabled}
                onToggle={(v) => set("referral_enabled", v)}
              />
            ) : (
              <p className="text-sm text-[#6B5AE0]/60">Loading…</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <Card className="space-y-4 border border-[#EAE6FA] bg-[#FDFDFF] p-5 shadow-sm">
            {form ? (
              <>
                <ToggleRow
                  label="Maintenance mode"
                  help="When on, the patient portal shows a maintenance notice and blocks checkout."
                  checked={form.maintenance_mode}
                  onChange={(v) => set("maintenance_mode", v)}
                />
                <ToggleRow
                  label="Allow new signups"
                  help="When off, new patients cannot create accounts or start onboarding."
                  checked={form.new_signups_enabled}
                  onChange={(v) => set("new_signups_enabled", v)}
                />
              </>
            ) : (
              <p className="text-sm text-[#6B5AE0]/60">Loading…</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <ActivityLogTab />
        </TabsContent>
      </Tabs>

      {form && tab !== "audit" ? (
        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={mutation.isPending}
            className="h-10 rounded-xl bg-[#2A00A2] px-6 font-bold text-white hover:bg-[#22008A]"
          >
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
