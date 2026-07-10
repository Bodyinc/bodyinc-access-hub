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
import {
  providerFormSchema,
  US_STATES,
  CREDENTIALS,
  CONSULTATION_TYPES,
  COMMON_LANGUAGES,
  type ProviderFormValues,
} from "@/lib/providers.schema";

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
      className="space-y-6 w-full text-left"
      noValidate
    >
      {/* Identity Block Component */}
      <Card className="overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl p-1 sm:p-3">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-[#2A00A2]">Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Field label="Full name" error={errors.full_name?.message} required>
            <Input {...register("full_name")} className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px]" />
          </Field>
          <Field label="Email" error={errors.email?.message} required>
            <Input type="email" disabled={mode === "edit"} {...register("email")} className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px] disabled:bg-[#FDFDFF] disabled:text-[#6B5AE0]/50" />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} placeholder="(555) 555-1234" className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px] placeholder:text-[#6B5AE0]/40" />
          </Field>
          <Field label="Avatar URL" error={errors.avatar_url?.message}>
            <Input {...register("avatar_url")} placeholder="https://…" className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px] placeholder:text-[#6B5AE0]/40" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Bio" error={errors.bio?.message}>
              <Textarea rows={3} {...register("bio")} className="rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-medium text-[14px]" />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Licensing & Credentials Block Component */}
      <Card className="overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl p-1 sm:p-3">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-[#2A00A2]">Licensing & Credentials</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Field label="Credentials" error={errors.credentials?.message}>
            <Select
              value={credentials ?? ""}
              onValueChange={(v) => setValue("credentials", v as any, { shouldDirty: true })}
            >
              <SelectTrigger className="h-11 rounded-xl border-[#E2DCFA] bg-white text-[#2A00A2] font-semibold text-[14px] shadow-none">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E2DCFA]">
                {CREDENTIALS.map((c) => (
                  <SelectItem key={c} value={c} className="font-medium text-[#2A00A2]">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Specialty" error={errors.specialty?.message}>
            <Input {...register("specialty")} placeholder="e.g. Internal Medicine" className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px] placeholder:text-[#6B5AE0]/40" />
          </Field>
          <Field label="NPI" error={errors.npi?.message}>
            <Input {...register("npi")} placeholder="10 digits" className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px] placeholder:text-[#6B5AE0]/40" />
          </Field>
          <Field label="DEA" error={errors.dea?.message}>
            <Input {...register("dea")} placeholder="AB1234567" className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px] placeholder:text-[#6B5AE0]/40" />
          </Field>
          <Field label="State license number" error={errors.license_number?.message}>
            <Input {...register("license_number")} className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px]" />
          </Field>
          <Field label="Licensed in (states)">
            <StateMultiSelect
              selected={licenseStates}
              onToggle={(s) =>
                setValue("license_states", toggleIn(licenseStates as string[], s) as any, {
                  shouldDirty: true,
                })
              }
            />
          </Field>
        </CardContent>
      </Card>

      {/* Practice Parameters Block Component */}
      <Card className="overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl p-1 sm:p-3">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-[#2A00A2]">Practice</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <Field label="Years of experience" error={errors.years_experience?.message}>
            <Input
              type="number"
              min={0}
              max={80}
              {...register("years_experience", {
                setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
              })}
              className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px]"
            />
          </Field>
          <Field label="Consultation types">
            <div className="flex flex-wrap gap-2 pt-1">
              {CONSULTATION_TYPES.map((t) => {
                const on = (consultationTypes as string[]).includes(t);
                return (
                  <Badge
                    key={t}
                    variant={on ? "default" : "outline"}
                    className={`cursor-pointer capitalize text-[13px] px-3 py-1 rounded-xl transition-all font-semibold shadow-none tracking-normal normal-case ${
                      on 
                        ? "bg-[#2A00A2] text-white hover:bg-[#2A00A2]" 
                        : "border-[#E2DCFA] text-[#6B5AE0] bg-white hover:bg-[#F5F3FF]"
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
            <StateMultiSelect
              selected={practiceStates}
              onToggle={(s) =>
                setValue("practice_states", toggleIn(practiceStates as string[], s) as any, {
                  shouldDirty: true,
                })
              }
            />
          </Field>
        </CardContent>
      </Card>

      {/* Physical Address Block Component */}
      <Card className="overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl p-1 sm:p-3">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-[#2A00A2]">Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Address line 1" error={errors.address_line1?.message}>
              <Input {...register("address_line1")} className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px]" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address line 2" error={errors.address_line2?.message}>
              <Input {...register("address_line2")} className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px]" />
            </Field>
          </div>
          <Field label="City" error={errors.city?.message}>
            <Input {...register("city")} className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px]" />
          </Field>
          <Field label="State" error={errors.state?.message}>
            <Select
              value={state ?? ""}
              onValueChange={(v) => setValue("state", v as any, { shouldDirty: true })}
            >
              <SelectTrigger className="h-11 rounded-xl border-[#E2DCFA] bg-white text-[#2A00A2] font-semibold text-[14px] shadow-none">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-72 rounded-xl border-[#E2DCFA]">
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s} className="font-medium text-[#2A00A2]">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="ZIP" error={errors.zip?.message}>
            <Input {...register("zip")} placeholder="12345 or 12345-6789" className="h-11 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[14px] placeholder:text-[#6B5AE0]/40" />
          </Field>
          <Field label="Country">
            <Input {...register("country")} disabled className="h-11 rounded-xl border-[#E2DCFA] bg-[#FDFDFF] text-[#2A00A2] font-semibold text-[14px]" />
          </Field>
        </CardContent>
      </Card>

      {/* Account Activation Metrics Block Component */}
      <Card className="overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl p-1 sm:p-3">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-[#2A00A2]">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between bg-[#FDFDFF]/80 border border-[#E2DCFA]/60 rounded-xl p-4">
            <div>
              <p className="text-[14px] font-bold text-[#2A00A2]">Active Account State</p>
              <p className="text-[13px] text-[#6B5AE0]/70 font-medium mt-0.5">
                Inactive providers cannot sign in or manage patient consultation slots.
              </p>
            </div>
            <Switch
              checked={!!isActive}
              onCheckedChange={(v) => setValue("is_active", v, { shouldDirty: true })}
              className="data-[state=checked]:bg-[#4A3AFF]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Footer Navigation Control Blocks */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onCancel} 
            disabled={submitting}
            className="text-[#6B5AE0] hover:bg-[#F5F3FF] hover:text-[#2A00A2] font-bold rounded-xl h-11 px-5 transition-colors"
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={submitting}
          className="bg-[#2A00A2] hover:bg-[#1E0075] text-white font-bold rounded-xl h-11 px-6 shadow-sm transition-colors"
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
    <div className="space-y-1.5 text-left">
      <Label className="text-[13px] font-bold text-[#2A00A2]/90">
        {label} {required && <span className="text-[#FF4D6D] ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[12px] text-[#FF4D6D] font-medium mt-1">{error}</p>}
    </div>
  );
}

function StateMultiSelect({
  selected,
  onToggle,
}: {
  selected: readonly string[];
  onToggle: (s: string) => void;
}) {
  return (
    <div className="space-y-2.5 w-full">
      <Select value="" onValueChange={(v) => v && onToggle(v)}>
        <SelectTrigger className="h-11 rounded-xl border-[#E2DCFA] bg-white text-[#2A00A2] font-semibold text-[14px] shadow-none">
          <SelectValue placeholder="Add state" />
        </SelectTrigger>
        <SelectContent className="max-h-72 rounded-xl border-[#E2DCFA]">
          {US_STATES.filter((s) => !selected.includes(s)).map((s) => (
            <SelectItem key={s} value={s} className="font-medium text-[#2A00A2]">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-1 bg-[#FDFDFF] border border-[#F4F1FE] rounded-xl">
          {selected.map((s) => (
            <Badge key={s} className="bg-[#F5F3FF] text-[#4A3AFF] hover:bg-[#F5F3FF] border border-transparent font-bold text-[12px] px-2.5 py-1 rounded-lg gap-1 shadow-none normal-case tracking-normal">
              {s}
              <button type="button" onClick={() => onToggle(s)} className="ml-1 p-0.5 hover:bg-[#E2DCFA] rounded-md transition-colors">
                <X className="h-3 w-3 stroke-[3]" />
              </button>
            </Badge>
          ))}
        </div>
      )}
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
    <div className="space-y-3 w-full">
      <div className="flex flex-wrap gap-2 pt-0.5">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <Badge
              key={o}
              variant={on ? "default" : "outline"}
              className={`cursor-pointer text-[13px] px-3 py-1 rounded-xl transition-all font-semibold shadow-none tracking-normal normal-case ${
                on 
                  ? "bg-[#2A00A2] text-white hover:bg-[#2A00A2]" 
                  : "border-[#E2DCFA] text-[#6B5AE0] bg-white hover:bg-[#F5F3FF]"
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
            <Badge key={s} className="bg-[#F5F3FF] text-[#4A3AFF] hover:bg-[#F5F3FF] border border-transparent font-bold text-[13px] px-3 py-1 rounded-xl gap-1 shadow-none normal-case tracking-normal">
              {s}
              <button type="button" onClick={() => onToggle(s)} className="ml-1 p-0.5 hover:bg-[#E2DCFA] rounded-md transition-colors">
                <X className="h-3 w-3 stroke-[3]" />
              </button>
            </Badge>
          ))}
      </div>
      {allowCustom && (
        <div className="flex gap-2">
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
            className="h-10 rounded-xl border-[#E2DCFA] focus-visible:ring-[#4A3AFF] text-[#2A00A2] font-semibold text-[13px] placeholder:text-[#6B5AE0]/40 bg-white"
          />
        </div>
      )}
    </div>
  );
}