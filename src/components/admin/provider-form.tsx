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
      className="space-y-6"
      noValidate
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" error={errors.full_name?.message} required>
            <Input {...register("full_name")} />
          </Field>
          <Field label="Email" error={errors.email?.message} required>
            <Input type="email" disabled={mode === "edit"} {...register("email")} />
          </Field>
          <Field label="Phone" error={errors.phone?.message}>
            <Input {...register("phone")} placeholder="(555) 555-1234" />
          </Field>
          <Field label="Avatar URL" error={errors.avatar_url?.message}>
            <Input {...register("avatar_url")} placeholder="https://…" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Bio" error={errors.bio?.message}>
              <Textarea rows={3} {...register("bio")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Licensing & Credentials</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Credentials" error={errors.credentials?.message}>
            <Select
              value={credentials ?? ""}
              onValueChange={(v) => setValue("credentials", v as any, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {CREDENTIALS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Specialty" error={errors.specialty?.message}>
            <Input {...register("specialty")} placeholder="e.g. Internal Medicine" />
          </Field>
          <Field label="NPI" error={errors.npi?.message}>
            <Input {...register("npi")} placeholder="10 digits" />
          </Field>
          <Field label="DEA" error={errors.dea?.message}>
            <Input {...register("dea")} placeholder="AB1234567" />
          </Field>
          <Field label="State license number" error={errors.license_number?.message}>
            <Input {...register("license_number")} />
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Practice</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Years of experience" error={errors.years_experience?.message}>
            <Input
              type="number"
              min={0}
              max={80}
              {...register("years_experience", {
                setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
              })}
            />
          </Field>
          <Field label="Consultation types">
            <div className="flex flex-wrap gap-2">
              {CONSULTATION_TYPES.map((t) => {
                const on = (consultationTypes as string[]).includes(t);
                return (
                  <Badge
                    key={t}
                    variant={on ? "default" : "outline"}
                    className="cursor-pointer capitalize"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Address line 1" error={errors.address_line1?.message}>
              <Input {...register("address_line1")} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Address line 2" error={errors.address_line2?.message}>
              <Input {...register("address_line2")} />
            </Field>
          </div>
          <Field label="City" error={errors.city?.message}>
            <Input {...register("city")} />
          </Field>
          <Field label="State" error={errors.state?.message}>
            <Select
              value={state ?? ""}
              onValueChange={(v) => setValue("state", v as any, { shouldDirty: true })}
            >
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="ZIP" error={errors.zip?.message}>
            <Input {...register("zip")} placeholder="12345 or 12345-6789" />
          </Field>
          <Field label="Country">
            <Input {...register("country")} disabled />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive providers cannot sign in to the portal.
              </p>
            </div>
            <Switch
              checked={!!isActive}
              onCheckedChange={(v) => setValue("is_active", v, { shouldDirty: true })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Create provider" : "Save changes"}
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
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
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
    <div className="space-y-2">
      <Select value="" onValueChange={(v) => v && onToggle(v)}>
        <SelectTrigger><SelectValue placeholder="Add state" /></SelectTrigger>
        <SelectContent className="max-h-72">
          {US_STATES.filter((s) => !selected.includes(s)).map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1">
              {s}
              <button type="button" onClick={() => onToggle(s)} className="ml-0.5">
                <X className="h-3 w-3" />
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
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <Badge
              key={o}
              variant={on ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => onToggle(o)}
            >
              {o}
            </Badge>
          );
        })}
        {selected
          .filter((s) => !options.includes(s))
          .map((s) => (
            <Badge key={s} variant="secondary" className="gap-1">
              {s}
              <button type="button" onClick={() => onToggle(s)} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
      </div>
      {allowCustom && (
        <div className="flex gap-2">
          <Input
            placeholder="Add other language"
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
            className="h-8"
          />
        </div>
      )}
    </div>
  );
}