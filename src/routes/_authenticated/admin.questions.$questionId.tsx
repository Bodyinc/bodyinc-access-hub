import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/admin/form-skeleton";
import { getQuestion, updateQuestion } from "@/lib/questions.functions";
import type { QuestionFormValues, QuestionType } from "@/lib/questions.schema";

const QuestionForm = lazy(() =>
  import("@/components/admin/question-form").then((m) => ({ default: m.QuestionForm })),
);
const QuestionPreview = lazy(() =>
  import("@/components/admin/question-preview").then((m) => ({ default: m.QuestionPreview })),
);

export const Route = createFileRoute("/_authenticated/admin/questions/$questionId")({
  component: EditQuestionPage,
});

function EditQuestionPage() {
  const { questionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getQuestion);
  const update = useServerFn(updateQuestion);
  const [previewValues, setPreviewValues] = useState<QuestionFormValues | null>(null);

  const query = useQuery({
    queryKey: ["questions", questionId],
    queryFn: () => get({ data: { id: questionId } }),
  });

  const mutation = useMutation({
    mutationFn: (values: QuestionFormValues) =>
      update({ data: { id: questionId, ...values } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question updated");
      navigate({ to: "/admin/questions" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (query.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading question…</div>;
  }
  if (query.isError || !query.data) {
    return (
      <div className="text-sm text-destructive">
        {(query.error as Error)?.message ?? "Question not found"}
      </div>
    );
  }

  const d = query.data as any;
  const defaultValues: QuestionFormValues = {
    prompt: d.prompt,
    description: d.description ?? "",
    question_type: d.question_type as QuestionType,
    sort_order: d.sort_order,
    is_required: d.is_required,
    is_active: d.is_active,
    options: (d.intake_question_options ?? []).map((opt: any) => ({
      label: opt.label,
      sort_order: opt.sort_order,
    })),
  };

  const preview = previewValues ?? defaultValues;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Suspense fallback={<FormSkeleton />}>
          <QuestionForm
            mode="edit"
            questionPosition={d.position ?? null}
            submitting={mutation.isPending}
            defaultValues={defaultValues}
            onSubmit={(values) => mutation.mutate(values)}
            onCancel={() => navigate({ to: "/admin/questions" })}
            onValuesChange={setPreviewValues}
          />
        </Suspense>
        <div className="lg:sticky lg:top-20">
          <Suspense fallback={<FormSkeleton />}>
            <QuestionPreview
              prompt={preview.prompt}
              description={preview.description}
              question_type={preview.question_type}
              options={preview.options}
              is_required={preview.is_required}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
