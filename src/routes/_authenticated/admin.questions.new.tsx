import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { QuestionForm } from "@/components/admin/question-form";
import { QuestionPreview } from "@/components/admin/question-preview";
import { createQuestion } from "@/lib/questions.functions";
import type { QuestionFormValues } from "@/lib/questions.schema";

export const Route = createFileRoute("/_authenticated/admin/questions/new")({
  component: NewQuestionPage,
});

function NewQuestionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createQuestion);
  const [previewValues, setPreviewValues] = useState<QuestionFormValues>({
    prompt: "",
    description: "",
    question_type: "short_text",
    sort_order: 0,
    is_required: true,
    is_active: true,
    options: [],
  });

  const mutation = useMutation({
    mutationFn: (values: QuestionFormValues) => create({ data: values }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question created");
      navigate({ to: "/admin/questions" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <QuestionForm
          mode="create"
          submitting={mutation.isPending}
          onSubmit={(values) => mutation.mutate(values)}
          onCancel={() => navigate({ to: "/admin/questions" })}
          onValuesChange={setPreviewValues}
        />
        <div className="lg:sticky lg:top-20">
          <QuestionPreview
            prompt={previewValues.prompt}
            description={previewValues.description}
            question_type={previewValues.question_type}
            options={previewValues.options}
            is_required={previewValues.is_required}
          />
        </div>
      </div>
    </div>
  );
}
