import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PromoFormValues = {
  code: string;
  discount_type: "percent" | "amount";
  percent_off: number;
  amount_off: number; // dollars
  is_active: boolean;
  auto_apply: boolean;
  max_redemptions: string; // "" = unlimited
  redeem_by: string; // yyyy-mm-dd, "" = never
};

const EMPTY: PromoFormValues = {
  code: "",
  discount_type: "amount",
  percent_off: 10,
  amount_off: 20,
  is_active: true,
  auto_apply: false,
  max_redemptions: "",
  redeem_by: "",
};

export function PromoForm({
  mode,
  defaultValues,
  submitting,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<PromoFormValues>;
  submitting?: boolean;
  onSubmit: (values: PromoFormValues) => void;
  onCancel?: () => void;
}) {
  const [v, setV] = useState<PromoFormValues>({ ...EMPTY, ...defaultValues });
  const set = (patch: Partial<PromoFormValues>) => setV((p) => ({ ...p, ...patch }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="space-y-6"
      noValidate
    >
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "New promo code" : "Edit promo code"}</CardTitle>
          <CardDescription>
            Discount applied at checkout. Auto-apply promos are the first-time welcome discount
            applied automatically during onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Code">
            <Input
              value={v.code}
              onChange={(e) => set({ code: e.target.value.toUpperCase() })}
              placeholder="WELCOME20"
              disabled={submitting}
            />
          </Field>

          <Field label="Discount type">
            <Select
              value={v.discount_type}
              onValueChange={(x) => set({ discount_type: x as PromoFormValues["discount_type"] })}
              disabled={submitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Fixed amount ($)</SelectItem>
                <SelectItem value="percent">Percent (%)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {v.discount_type === "amount" ? (
            <Field label="Amount off ($)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={v.amount_off}
                onChange={(e) => set({ amount_off: Number(e.target.value) })}
                disabled={submitting}
              />
            </Field>
          ) : (
            <Field label="Percent off (%)">
              <Input
                type="number"
                min={0}
                max={100}
                value={v.percent_off}
                onChange={(e) => set({ percent_off: Number(e.target.value) })}
                disabled={submitting}
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Max redemptions (blank = unlimited)">
              <Input
                type="number"
                min={1}
                value={v.max_redemptions}
                onChange={(e) => set({ max_redemptions: e.target.value })}
                disabled={submitting}
              />
            </Field>
            <Field label="Expires on (blank = never)">
              <Input
                type="date"
                value={v.redeem_by}
                onChange={(e) => set({ redeem_by: e.target.value })}
                disabled={submitting}
              />
            </Field>
          </div>

          <Toggle
            label="Active"
            desc="Available at checkout."
            checked={v.is_active}
            onChange={(x) => set({ is_active: x })}
          />
          <Toggle
            label="Auto-apply (welcome / first-time)"
            desc="Applied automatically during onboarding without the patient entering a code."
            checked={v.auto_apply}
            onChange={(x) => set({ auto_apply: x })}
          />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create promo" : "Save changes"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
