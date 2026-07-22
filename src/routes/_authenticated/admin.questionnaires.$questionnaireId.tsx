import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  createQuestion, deleteQuestion, getQuestionnaire, QQUESTION_TYPE_LABELS,
  replaceQuestionOptions, updateQuestion, updateQuestionnaire,
  type QQuestionType, type StoredQuestion, type StoredQuestionOption,
} from "@/lib/questionnaires.store";
import { categoriesQueryOptions } from "@/lib/query-options/categories";

export const Route = createFileRoute("/_authenticated/admin/questionnaires/$questionnaireId")({
  component: EditQuestionnairePage,
});

const detailKey = (id: string) => ["questionnaire", id] as const;
const detailQO = (id: string) =>
  queryOptions({
    queryKey: detailKey(id),
    queryFn: () => getQuestionnaire(id),
    staleTime: Number.POSITIVE_INFINITY,
  });

function EditQuestionnairePage() {
  const { questionnaireId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dataQ = useQuery(detailQO(questionnaireId));
  const catsQ = useQuery(categoriesQueryOptions());

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    const q = dataQ.data?.questionnaire;
    if (!q) return;
    setName(q.name);
    setDescription(q.description ?? "");
    setIsActive(q.is_active);
    setCategoryIds(q.category_ids);
  }, [dataQ.data?.questionnaire]);

  const saveMut = useMutation({
    mutationFn: () => updateQuestionnaire(questionnaireId, {
      name: name.trim(), description: description.trim() || null, is_active: isActive, category_ids: categoryIds,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: detailKey(questionnaireId) });
      qc.invalidateQueries({ queryKey: ["questionnaires"] });
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addMut = useMutation({
    mutationFn: () =>
      createQuestion({
        questionnaire_id: questionnaireId,
        prompt: "New question",
        question_type: "yes_no",
        is_required: true,
        sort_order: (dataQ.data?.questions.length ?? 0),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: detailKey(questionnaireId) });
      qc.invalidateQueries({ queryKey: ["questionnaires"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (dataQ.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!dataQ.data) return <p className="text-sm text-destructive">Not found</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Questionnaire details</CardTitle>
          <CardDescription>Update name and linked medicines.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="q-active" />
              <Label htmlFor="q-active">Active</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Linked goals / categories</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(catsQ.data ?? []).map((m) => {
                const checked = categoryIds.includes(m.id);
                return (
                  <label key={m.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <Checkbox checked={checked} onCheckedChange={(v) =>
                      setCategoryIds((prev) => v ? [...prev, m.id] : prev.filter((x) => x !== m.id))
                    } />
                    {m.name}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/admin/questionnaires" })}>Back</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Questions</h3>
        <Button size="sm" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Question
        </Button>
      </div>

      <div className="space-y-4">
        {dataQ.data.questions.length === 0 && (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-sm text-muted-foreground">
            No questions yet. Click &ldquo;Add Question&rdquo;.
          </CardContent></Card>
        )}
        {dataQ.data.questions.map((q) => (
          <QuestionEditor key={q.id} question={q} questionnaireId={questionnaireId} />
        ))}
      </div>
    </div>
  );
}

function QuestionEditor({ question, questionnaireId }: { question: StoredQuestion; questionnaireId: string }) {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState(question.prompt);
  const [description, setDescription] = useState(question.description ?? "");
  const [type, setType] = useState<QQuestionType>(question.question_type);
  const [required, setRequired] = useState(question.is_required);
  const [ynDisq, setYnDisq] = useState<"none" | "yes" | "no">(
    (question.disqualify_rules as any)?.if_yes ? "yes" :
    (question.disqualify_rules as any)?.if_no ? "no" : "none",
  );
  const [options, setOptions] = useState<Array<{ label: string; is_disqualifying: boolean }>>(
    question.options.map((o: StoredQuestionOption) => ({ label: o.label, is_disqualifying: o.is_disqualifying })),
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      await updateQuestion(question.id, {
        prompt: prompt.trim(),
        description: description.trim() || null,
        question_type: type,
        is_required: required,
        sort_order: question.sort_order,
        disqualify_rules:
          type === "yes_no"
            ? (ynDisq === "yes" ? { if_yes: true } : ynDisq === "no" ? { if_no: true } : {})
            : {},
      });
      if (type === "single_choice" || type === "multi_choice") {
        await replaceQuestionOptions(question.id, options.filter((o) => o.label.trim()));
      } else {
        await replaceQuestionOptions(question.id, []);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questionnaire", questionnaireId] });
      toast.success("Question saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteQuestion(question.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questionnaire", questionnaireId] });
      toast.success("Deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const showOptions = type === "single_choice" || type === "multi_choice";
  const showYesNo = type === "yes_no";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm text-muted-foreground">Question</CardTitle>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
          onClick={() => deleteMut.mutate()}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Prompt</Label>
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Helper text (optional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as QQuestionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(QQUESTION_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Switch checked={required} onCheckedChange={setRequired} id={`req-${question.id}`} />
            <Label htmlFor={`req-${question.id}`}>Required</Label>
          </div>
          {showYesNo && (
            <div className="space-y-2">
              <Label>Disqualify when</Label>
              <Select value={ynDisq} onValueChange={(v) => setYnDisq(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Never</SelectItem>
                  <SelectItem value="yes">Answer is Yes</SelectItem>
                  <SelectItem value="no">Answer is No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {showOptions && (
          <div className="space-y-2">
            <Label>Options (check the box to mark an option as disqualifying)</Label>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={o.label} placeholder={`Option ${i + 1}`} onChange={(e) => {
                    const copy = [...options]; copy[i] = { ...copy[i], label: e.target.value }; setOptions(copy);
                  }} />
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Checkbox checked={o.is_disqualifying} onCheckedChange={(v) => {
                      const copy = [...options]; copy[i] = { ...copy[i], is_disqualifying: !!v }; setOptions(copy);
                    }} />
                    Disqualifies
                  </label>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    onClick={() => setOptions(options.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setOptions([...options, { label: "", is_disqualifying: false }])}>
                <Plus className="mr-1.5 h-4 w-4" /> Add option
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : "Save question"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}