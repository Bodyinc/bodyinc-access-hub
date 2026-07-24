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
import {
  adminLabel,
  adminInput,
  adminSelect,
  adminSectionTitle,
  adminSectionSubtitle,
  adminCard,
  adminBtnPrimary,
  adminBtnSecondary,
} from "@/lib/admin-ui";

export type PromoFormValues = {
  code: string;
  discount_type: "percent" | "amount";
  percent_off: number;
  amount_off: number;
  is_active: boolean;
  auto_apply: boolean;
  max_redemptions: string;
  redeem_by: string;
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

const fieldShell = "min-w-0 w-full";
const inputFull = `${adminInput} w-full min-w-0 max-w-full`;
const selectFull = `${adminSelect} w-full min-w-0 max-w-full`;

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
      className="m-0 w-full min-w-0 max-w-full space-y-5 overflow-x-hidden p-0 font-['DM_Sans',sans-serif] sm:space-y-6"
      noValidate
    >
      <Card className={`${adminCard} w-full min-w-0 max-w-full`}>
        <CardHeader className="space-y-2 p-4 sm:p-6">
          <CardTitle className={`${adminSectionTitle} break-words`}>
            {mode === "create" ? "New promo code" : "Edit promo code"}
          </CardTitle>
          <CardDescription className={`${adminSectionSubtitle} break-words`}>
            Discount applied at checkout. Auto-apply promos are the first-time welcome discount
            applied automatically during onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0 sm:space-y-6 sm:p-6 sm:pt-0">
          <Field label="Code">
            <Input
              value={v.code}
              onChange={(e) => set({ code: e.target.value.toUpperCase() })}
              placeholder="WELCOME20"
              disabled={submitting}
              className={inputFull}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <Field label="Discount type">
              <Select
                value={v.discount_type}
                onValueChange={(x) => set({ discount_type: x as PromoFormValues["discount_type"] })}
                disabled={submitting}
              >
                <SelectTrigger className={selectFull}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[6px] border-[#EAE6FA]">
                  <SelectItem value="amount" className="text-[#2E00AB]">
                    Fixed amount ($)
                  </SelectItem>
                  <SelectItem value="percent" className="text-[#2E00AB]">
                    Percent (%)
                  </SelectItem>
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
                  className={inputFull}
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
                  className={inputFull}
                />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <Field label="Max redemptions (blank = unlimited)">
              <Input
                type="number"
                min={1}
                value={v.max_redemptions}
                onChange={(e) => set({ max_redemptions: e.target.value })}
                disabled={submitting}
                className={inputFull}
              />
            </Field>
            <Field label="Expires on (blank = never)">
              <Input
                type="date"
                value={v.redeem_by}
                onChange={(e) => set({ redeem_by: e.target.value })}
                disabled={submitting}
                className={inputFull}
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

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="submit"
          disabled={submitting}
          className={`${adminBtnPrimary} w-full min-w-0 sm:w-auto sm:min-w-[140px]`}
        >
          {submitting ? "Saving…" : mode === "create" ? "Create promo" : "Save changes"}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className={`${adminBtnSecondary} w-full min-w-0 sm:w-auto sm:min-w-[140px]`}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={`${fieldShell} space-y-2`}>
      <Label className={`${adminLabel} break-words`}>{label}</Label>
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
    <div className="flex min-w-0 flex-col gap-3 rounded-[10px] border border-[#EAE6FA] bg-[#FDFDFF] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="break-words text-[16px] font-medium text-[#2E00AB]">{label}</p>
        <p className="mt-1 break-words text-[13px] font-normal text-[#2E00AB]/80 sm:text-[14px]">
          {desc}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="shrink-0 self-start data-[state=checked]:bg-[#2E00AB] sm:self-auto"
      />
    </div>
  );
}
