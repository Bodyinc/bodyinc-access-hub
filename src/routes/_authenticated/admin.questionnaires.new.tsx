import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createQuestionnaire } from "@/lib/questionnaires.store";
import { medicinesQueryOptions } from "@/lib/query-options/medicines";

export const Route = createFileRoute("/_authenticated/admin/questionnaires/new")({
  component: NewQuestionnairePage,
});

function NewQuestionnairePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const medsQ = useQuery(medicinesQueryOptions());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [medicineIds, setMedicineIds] = useState<string[]>([]);

  const mut = useMutation({
    mutationFn: () => createQuestionnaire({
      name: name.trim(),
      description: description.trim() || null,
      is_active: isActive,
      medicine_ids: medicineIds,
    }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["questionnaires"] });
      toast.success("Created");
      navigate({ to: "/admin/questionnaires/$questionnaireId", params: { questionnaireId: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New questionnaire</CardTitle>
          <CardDescription>Add questions after creating.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GLP-1 Eligibility" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="q-active" />
            <Label htmlFor="q-active">Active</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linked medicines</CardTitle>
          <CardDescription>Patients selecting these medicines will see this questionnaire.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {(medsQ.data ?? []).map((m) => {
              const checked = medicineIds.includes(m.id);
              return (
                <label key={m.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox checked={checked} onCheckedChange={(v) => {
                    setMedicineIds((prev) => v ? [...prev, m.id] : prev.filter((x) => x !== m.id));
                  }} />
                  {m.name}
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button disabled={!name.trim() || mut.isPending} onClick={() => mut.mutate()}>
          {mut.isPending ? "Saving…" : "Create questionnaire"}
        </Button>
        <Button variant="outline" onClick={() => navigate({ to: "/admin/questionnaires" })}>Cancel</Button>
      </div>
    </div>
  );
}