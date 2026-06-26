import { useEffect, type ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlignLeft, CheckSquare, CircleDot, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  questionFormSchema,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPE_HELPERS,
  isMcqType,
  optionLetter,
  type QuestionFormValues,
  type QuestionType,
} from "@/lib/questions.schema";

export type QuestionFormProps = {
  defaultValues?: Partial<QuestionFormValues>;
  mode: "create" | "edit";
  questionPosition?: number | null;
  submitting?: boolean;
  onSubmit: (values: QuestionFormValues) => void | Promise<void>;
  onCancel?: () => void;
  onValuesChange?: (values: QuestionFormValues) => void;
};

const EMPTY: QuestionFormValues = {
  prompt: "",
  description: "",
  question_type: "short_text",
  sort_order: 0,
  is_required: true,
  is_active: true,
  options: [],
};

const TYPE_ICONS: Record<QuestionType, typeof AlignLeft> = {
  short_text: AlignLeft,
  mcq_single: CircleDot,
  mcq_multi: CheckSquare,
};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function QuestionForm({
  defaultValues,
  mode,
  questionPosition,
  submitting,
  onSubmit,
  onCancel,
  onValuesChange,
}: QuestionFormProps) {
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema) as any,
    defaultValues: { ...EMPTY, ...defaultValues },
  });

  const { register, handleSubmit, watch, setValue, control, formState } = form;
  const errors = formState.errors;
  const values = watch();
  const questionType = values.question_type as QuestionType;
  const showOptions = isMcqType(questionType);

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "options",
  });

  useEffect(() => {
    if (showOptions && fields.length === 0) {
      replace([{ label: "" }, { label: "" }]);
    }
    if (!showOptions && fields.length > 0) {
      replace([]);
    }
  }, [showOptions, fields.length, replace]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Add question" : "Edit question"}</CardTitle>
          <CardDescription>Question details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Question" error={errors.prompt?.message}>
            <Textarea
              {...register("prompt")}
              rows={3}
              placeholder="Enter the question patients will see"
              disabled={submitting}
            />
          </Field>

          <Field label="Short description" error={errors.description?.message}>
            <Textarea
              {...register("description")}
              rows={2}
              placeholder="Optional helper text shown below the question (e.g. what to include)"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Optional. Helps patients understand what you&apos;re asking.
            </p>
          </Field>

          <div className="space-y-2">
            <Label>Question type</Label>
            <div className="grid gap-2 sm:grid-cols-1">
              {QUESTION_TYPES.map((type) => {
                const Icon = TYPE_ICONS[type];
                const selected = questionType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={submitting}
                    onClick={() => setValue("question_type", type)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium">{QUESTION_TYPE_LABELS[type]}</p>
                      <p className="text-xs text-muted-foreground">{QUESTION_TYPE_HELPERS[type]}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.question_type?.message && (
              <p className="text-sm text-destructive">{errors.question_type.message}</p>
            )}
          </div>

          {showOptions && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Answer options</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting || fields.length >= 10}
                  onClick={() => append({ label: "" })}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add option
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">At least 2 options required.</p>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-2 shrink-0 font-mono">
                    {optionLetter(index)}
                  </Badge>
                  <Input
                    {...register(`options.${index}.label`)}
                    placeholder={`Option ${index + 1}`}
                    disabled={submitting}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    disabled={submitting || fields.length <= 2}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {errors.options?.message && (
                <p className="text-sm text-destructive">{errors.options.message}</p>
              )}
              {errors.options?.root?.message && (
                <p className="text-sm text-destructive">{errors.options.root.message}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "edit" && questionPosition != null && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
              <Badge variant="secondary">Question #{questionPosition} in quiz</Badge>
              <div className="flex items-center gap-2">
                <Label htmlFor="sort_order" className="text-xs text-muted-foreground whitespace-nowrap">
                  Sort order
                </Label>
                <Input
                  id="sort_order"
                  type="number"
                  min={0}
                  className="h-8 w-20"
                  {...register("sort_order")}
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Required</p>
              <p className="text-xs text-muted-foreground">Patients must answer this question</p>
            </div>
            <Switch
              checked={values.is_required}
              onCheckedChange={(v) => setValue("is_required", v)}
              disabled={submitting}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Show this question in the intake quiz</p>
            </div>
            <Switch
              checked={values.is_active}
              onCheckedChange={(v) => setValue("is_active", v)}
              disabled={submitting}
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
          {submitting ? "Saving…" : mode === "create" ? "Create question" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
