import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { StateMultiSelect } from "@/components/admin/state-multi-select";
import {
  providerFormSchema,
  US_STATES,
  CREDENTIALS,
  CONSULTATION_TYPES,
  COMMON_LANGUAGES,
  type ProviderFormValues,
} from "@/lib/providers.schema";
import {
  adminLabel,
  adminInput,
  adminTextarea,
  adminSelect,
  adminSectionTitle,
  adminCard,
  adminBtnPrimary,
  adminBtnSecondary,
} from "@/lib/admin-ui";

export type ProviderFormProps = {
  defaultValues?: Partial<ProviderFormValues>;
  mode: "create" | "edit";
  submitting?: boolean;
  onSubmit: (values: ProviderFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

const EMPTY: ProviderFormValues = {
  email: "",
  full_name: "",
  phone: "",
  avatar_url: "",
  bio: "",
  credentials: undefined,
  specialty: "",
  npi: "",
  dea: "",
  license_number: "",
  license_states: [],
  years_experience: undefined,
  languages: [],
  consultation_types: [],
  practice_states: [],
  address_line1: "",
  address_line2: "",
  city: "",
  state: undefined,
  zip: "",
  country: "US",
  is_active: true,
};

const fieldShell = "min-w-0 w-full";
const inputFull = `${adminInput} w-full min-w-0 max-w-full`;
const textareaFull = `${adminTextarea} w-full min-w-0 max-w-full`;
const selectFull = `${adminSelect} w-full min-w-0 max-w-full`;
const cardClass = `${adminCard} w-full min-w-0 max-w-full p-4 sm:p-6`;
const gridClass = "grid grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:gap-6";

export function ProviderForm({
  defaultValues,
  mode,
  submitting,
  onSubmit,
  onCancel,
}: ProviderFormProps) {
  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(providerFormSchema) as any,
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  const { register, handleSubmit, watch, setValue, formState } = form;
  const errors = formState.errors;

  const licenseStates = watch("license_states") ?? [];
  const practiceStates = watch("practice_states") ?? [];
  const languages = watch("languages") ?? [];
  const consultationTypes = watch("consultation_types") ?? [];
  const credentials = watch("credentials");
  const state = watch("state");
  const isActive = watch("is_active");

  function toggleIn<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  return (
    <form
      onSubmit={handleSubmit((v) => onSubmit(v))}
      className="m-0 w-full min-w-0 max-w-full space-y-5 overflow-x-hidden p-0 font-['DM_Sans',sans-serif] sm:space-y-6"
      noValidate
    >
      <Card className={cardClass}>
        <CardHeader className="space-y-0 p-0 pb-4">
          <CardTitle className={adminSectionTitle}>Identity</CardTitle>
        </CardHeader>
        <CardContent className={gridClass}>
          <Field label="Full name" error={errors.full_name?.message} required>
            <Input {...register("full_name")} className={inputFull} />
          </Field>
          <Field label="Email" error={errors.email?.message} required>
            <Input
              type="email"
              disabled={mode === "edit"}
              {...register("email")}
              className={`${inputFull} disabled:bg-[#FDFDFF] disabled:opacity-60`}
            />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} placeholder="(555) 555-1234" className={inputFull} />
          </Field>
          <Field label="Avatar URL" error={errors.avatar_url?.message}>
            <Input {...register("avatar_url")} placeholder="https://…" className={inputFull} />
          </Field>
          <div className={`sm:col-span-2 ${fieldShell}`}>
            <Field label="Bio" error={errors.bio?.message}>
              <Textarea rows={3} {...register("bio")} className={textareaFull} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className="space-y-0 p-0 pb-4">
          <CardTitle className={adminSectionTitle}>Licensing & Credentials</CardTitle>
        </CardHeader>
        <CardContent className={gridClass}>
          <Field label="Credentials" error={errors.credentials?.message}>
            <Select
              value={credentials ?? ""}
              onValueChange={(v) => setValue("credentials", v as any, { shouldDirty: true })}
            >
              <SelectTrigger className={selectFull}>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="rounded-[6px] border-[#EAE6FA]">
                {CREDENTIALS.map((c) => (
                  <SelectItem key={c} value={c} className="font-normal text-[#2E00AB]">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Specialty" error={errors.specialty?.message}>
            <Input
              {...register("specialty")}
              placeholder="e.g. Internal Medicine"
              className={inputFull}
            />
          </Field>
          <Field label="NPI" error={errors.npi?.message}>
            <Input {...register("npi")} placeholder="10 digits" className={inputFull} />
          </Field>
          <Field label="DEA" error={errors.dea?.message}>
            <Input {...register("dea")} placeholder="AB1234567" className={inputFull} />
          </Field>
          <Field label="State license number" error={errors.license_number?.message}>
            <Input {...register("license_number")} className={inputFull} />
          </Field>
          <Field label="Licensed in (states)">
            <div className={fieldShell}>
              <StateMultiSelect
                selected={licenseStates}
                onToggle={(s) =>
                  setValue("license_states", toggleIn(licenseStates as string[], s) as any, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className="space-y-0 p-0 pb-4">
          <CardTitle className={adminSectionTitle}>Practice</CardTitle>
        </CardHeader>
        <CardContent className={gridClass}>
          <Field label="Years of experience" error={errors.years_experience?.message}>
            <Input
              type="number"
              min={0}
              max={80}
              {...register("years_experience", {
                setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
              })}
              className={inputFull}
            />
          </Field>
          <Field label="Consultation types">
            <div className="flex min-w-0 flex-wrap gap-2 pt-1">
              {CONSULTATION_TYPES.map((t) => {
                const on = (consultationTypes as string[]).includes(t);
                return (
                  <Badge
                    key={t}
                    variant={on ? "default" : "outline"}
                    className={`cursor-pointer rounded-[6px] px-3 py-1 text-[13px] font-medium shadow-none normal-case tracking-normal capitalize transition-all ${
                      on
                        ? "bg-[#2E00AB] text-white hover:bg-[#2E00AB]"
                        : "border-[#EAE6FA] bg-white text-[#2E00AB] hover:bg-[#F9F8FF]"
                    }`}
                    onClick={() =>
                      setValue(
                        "consultation_types",
                        toggleIn(consultationTypes as string[], t) as any,
                        { shouldDirty: true },
                      )
                    }
                  >
                    {t.replace("_", " ")}
                  </Badge>
                );
              })}
            </div>
          </Field>
          <Field label="Languages">
            <ChipMultiSelect
              options={COMMON_LANGUAGES as readonly string[]}
              selected={languages as string[]}
              onToggle={(l) =>
                setValue("languages", toggleIn(languages as string[], l) as any, {
                  shouldDirty: true,
                })
              }
              allowCustom
              onAddCustom={(l) =>
                setValue("languages", [...(languages as string[]), l] as any, {
                  shouldDirty: true,
                })
              }
            />
          </Field>
          <Field label="Practice states">
            <div className={fieldShell}>
              <StateMultiSelect
                selected={practiceStates}
                onToggle={(s) =>
                  setValue("practice_states", toggleIn(practiceStates as string[], s) as any, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className="space-y-0 p-0 pb-4">
          <CardTitle className={adminSectionTitle}>Address</CardTitle>
        </CardHeader>
        <CardContent className={gridClass}>
          <div className={`sm:col-span-2 ${fieldShell}`}>
            <Field label="Address line 1" error={errors.address_line1?.message}>
              <Input {...register("address_line1")} className={inputFull} />
            </Field>
          </div>
          <div className={`sm:col-span-2 ${fieldShell}`}>
            <Field label="Address line 2" error={errors.address_line2?.message}>
              <Input {...register("address_line2")} className={inputFull} />
            </Field>
          </div>
          <Field label="City" error={errors.city?.message}>
            <Input {...register("city")} className={inputFull} />
          </Field>
          <Field label="State" error={errors.state?.message}>
            <Select
              value={state ?? ""}
              onValueChange={(v) => setValue("state", v as any, { shouldDirty: true })}
            >
              <SelectTrigger className={selectFull}>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-72 rounded-[6px] border-[#EAE6FA]">
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s} className="font-normal text-[#2E00AB]">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="ZIP" error={errors.zip?.message}>
            <Input
              {...register("zip")}
              placeholder="12345 or 12345-6789"
              className={inputFull}
            />
          </Field>
          <Field label="Country">
            <Input
              {...register("country")}
              disabled
              className={`${inputFull} disabled:bg-[#FDFDFF]`}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader className="space-y-0 p-0 pb-4">
          <CardTitle className={adminSectionTitle}>Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex min-w-0 flex-col gap-4 rounded-[10px] border border-[#EAE6FA] bg-[#FDFDFF] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-medium text-[#2E00AB]">Active Account State</p>
              <p className="mt-1 break-words text-[13px] font-normal text-[#2E00AB]/80 sm:text-[14px]">
                Inactive providers cannot sign in or manage patient consultation slots.
              </p>
            </div>
            <Switch
              checked={!!isActive}
              onCheckedChange={(v) => setValue("is_active", v, { shouldDirty: true })}
              className="shrink-0 self-start data-[state=checked]:bg-[#2E00AB] sm:self-auto"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
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
        <Button
          type="submit"
          disabled={submitting}
          className={`${adminBtnPrimary} w-full min-w-0 sm:w-auto sm:min-w-[140px]`}
        >
          {submitting ? "Saving changes…" : mode === "create" ? "Create provider" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${fieldShell} space-y-2 text-left`}>
      <Label className={`${adminLabel} break-words`}>
        {label} {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 break-words text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ChipMultiSelect({
  options,
  selected,
  onToggle,
  allowCustom,
  onAddCustom,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
  allowCustom?: boolean;
  onAddCustom?: (v: string) => void;
}) {
  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="flex min-w-0 flex-wrap gap-2 pt-0.5">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <Badge
              key={o}
              variant={on ? "default" : "outline"}
              className={`cursor-pointer rounded-[6px] px-3 py-1 text-[13px] font-medium shadow-none normal-case tracking-normal transition-all ${
                on
                  ? "bg-[#2E00AB] text-white hover:bg-[#2E00AB]"
                  : "border-[#EAE6FA] bg-white text-[#2E00AB] hover:bg-[#F9F8FF]"
              }`}
              onClick={() => onToggle(o)}
            >
              {o}
            </Badge>
          );
        })}
        {selected
          .filter((s) => !options.includes(s))
          .map((s) => (
            <Badge
              key={s}
              className="max-w-full gap-1 rounded-[6px] border border-transparent bg-[#F5F3FF] px-3 py-1 text-[13px] font-medium text-[#2E00AB] shadow-none normal-case tracking-normal hover:bg-[#F5F3FF]"
            >
              <span className="truncate">{s}</span>
              <button
                type="button"
                onClick={() => onToggle(s)}
                className="ml-1 shrink-0 rounded-md p-0.5 transition-colors hover:bg-[#EAE6FA]"
              >
                <X className="h-3 w-3 stroke-[3]" />
              </button>
            </Badge>
          ))}
      </div>
      {allowCustom && (
        <div className="w-full min-w-0">
          <Input
            placeholder="Add other language and press Enter"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const v = (e.target as HTMLInputElement).value.trim();
                if (v && !selected.includes(v)) {
                  onAddCustom?.(v);
                  (e.target as HTMLInputElement).value = "";
                }
              }
            }}
            className={inputFull}
          />
        </div>
      )}
    </div>
  );
}
