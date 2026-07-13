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
    // Fixed alignment: Removed mx-auto and max-w constraints so it sits perfectly next to the sidebar
    <div className="space-y-6 w-full text-left">
      {/* Top Header Section */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-brand">New questionnaire</h2>
        <p className="text-[14px] text-brand-strong/70 font-medium mt-1">
          Add screening configurations and structure questions.
        </p>
      </div>

      {/* Main Configurations Card Group */}
      <Card className="overflow-hidden border border-brand-border bg-white shadow-sm rounded-2xl p-2 sm:p-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-brand">Questionnaire details</CardTitle>
          <CardDescription className="text-brand-strong/60 font-medium text-[13px]">
            Add details below. You will be able to add screening questions after creating.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Form Field Name */}
          <div className="space-y-2">
            <Label className="text-[13px] font-bold text-brand-strong">Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. GLP-1 Eligibility" 
              className="h-11 rounded-xl border-brand-border focus-visible:ring-brand-strong focus-visible:ring-1 text-brand font-semibold text-[14px] placeholder:text-brand-strong/40"
            />
          </div>

          {/* Form Field Description */}
          <div className="space-y-2">
            <Label className="text-[13px] font-bold text-brand-strong">Description (optional)</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={3} 
              placeholder="Provide context or instructions for this custom review cluster..."
              className="rounded-xl border-brand-border focus-visible:ring-brand-strong focus-visible:ring-1 resize-none font-medium text-[14px] text-brand placeholder:text-brand-strong/40 p-3 min-h-[90px]"
            />
          </div>

          {/* Form Field Switch Status Toggle */}
          <div className="flex items-center gap-3 pt-1">
            <Switch 
              checked={isActive} 
              onCheckedChange={setIsActive} 
              id="q-active"
              className="data-[state=checked]:bg-brand-strong data-[state=unchecked]:bg-brand-border"
            />
            <Label htmlFor="q-active" className="text-[14px] font-bold text-brand cursor-pointer select-none">
              Active Status
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Linked Medicines Target Group */}
      <Card className="overflow-hidden border border-brand-border bg-white shadow-sm rounded-2xl p-2 sm:p-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold text-brand">Linked medicines</CardTitle>
          <CardDescription className="text-brand-strong/60 font-medium text-[13px]">
            Patients selecting these treatment variants will see this custom screening sequence during checkouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {medsQ.isLoading && (
            <p className="text-[14px] font-medium text-brand-strong/60 py-2">Loading target medicines list...</p>
          )}
          {!medsQ.isLoading && (medsQ.data ?? []).length === 0 && (
            <p className="text-[14px] font-medium text-brand-strong/60 py-2">No active medicines found to link.</p>
          )}
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
            {(medsQ.data ?? []).map((m) => {
              const checked = medicineIds.includes(m.id);
              return (
                <label 
                  key={m.id} 
                  className={`flex items-center gap-3 rounded-xl border p-3 text-[14px] font-semibold transition-all cursor-pointer select-none
                    ${checked 
                      ? "border-brand-strong bg-brand-surface text-brand" 
                      : "border-brand-border bg-white text-brand-strong/80 hover:bg-white/80"
                    }
                  `}
                >
                  <Checkbox 
                    checked={checked} 
                    className="rounded-md border-brand-border data-[state=checked]:bg-brand-strong data-[state=checked]:border-brand-strong"
                    onCheckedChange={(v) => {
                      setMedicineIds((prev) => v ? [...prev, m.id] : prev.filter((x) => x !== m.id));
                    }} 
                  />
                  {m.name}
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Grid Action Control Row Layout Footer */}
      <div className="flex flex-row items-center gap-3 pt-2">
        <Button 
          variant="ghost" 
          onClick={() => navigate({ to: "/admin/questionnaires" })}
          className="w-32 text-brand-strong hover:bg-brand-surface hover:text-brand font-bold rounded-xl h-11 transition-colors border-none bg-transparent"
        >
          Cancel
        </Button>
        <Button 
          disabled={!name.trim() || mut.isPending} 
          onClick={() => mut.mutate()}
          className="w-48 bg-brand hover:bg-brand text-white font-bold rounded-xl h-11 px-5 shadow-sm transition-colors"
        >
          {mut.isPending ? "Saving…" : "Create questionnaire"}
        </Button>
      </div>
    </div>
  );
}