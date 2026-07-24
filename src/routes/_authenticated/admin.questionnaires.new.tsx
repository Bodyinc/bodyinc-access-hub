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
import { categoriesQueryOptions } from "@/lib/query-options/categories";
import {
  adminLabel,
  adminInput,
  adminTextarea,
  adminPageTitle,
  adminPageSubtitle,
  adminSectionTitle,
  adminSectionSubtitle,
  adminCard,
  adminBtnPrimary,
  adminBtnSecondary,
} from "@/lib/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/questionnaires/new")({
  component: NewQuestionnairePage,
});

function NewQuestionnairePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const catsQ = useQuery(categoriesQueryOptions());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const mut = useMutation({
    mutationFn: () =>
      createQuestionnaire({
        name: name.trim(),
        description: description.trim() || null,
        is_active: isActive,
        category_ids: categoryIds,
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["questionnaires"] });
      toast.success("Created");
      navigate({
        to: "/admin/questionnaires/$questionnaireId",
        params: { questionnaireId: r.id },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="admin-page-shell space-y-5 font-['DM_Sans',sans-serif] sm:space-y-6">
      <div className="space-y-3">
        <h2 className={adminPageTitle}>New questionnaire</h2>
        <p className={adminPageSubtitle}>
          Add screening configurations and structure questions.
        </p>
      </div>

      <Card className={adminCard}>
        <CardHeader className="space-y-2 p-4 sm:p-6">
          <CardTitle className={adminSectionTitle}>Questionnaire details</CardTitle>
          <CardDescription className={adminSectionSubtitle}>
            Add details below. You will be able to add screening questions after creating.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-2">
            <Label className={adminLabel}>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GLP-1 Eligibility"
              className={adminInput}
            />
          </div>

          <div className="space-y-2">
            <Label className={adminLabel}>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Provide context or instructions for this custom review cluster..."
              className={adminTextarea}
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
           <Switch
  checked={isActive}
  onCheckedChange={setIsActive}
  id="q-active"
/>
            <Label
              htmlFor="q-active"
              className="cursor-pointer select-none text-[16px] font-medium text-[#2E00AB]"
            >
              Active Status
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card className={adminCard}>
        <CardHeader className="space-y-2 p-4 sm:p-6">
          <CardTitle className={adminSectionTitle}>Linked goals / categories</CardTitle>
          <CardDescription className={adminSectionSubtitle}>
            Patients selecting these goals/categories will see this custom screening sequence during
            checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {catsQ.isLoading && (
            <p className="py-2 text-[14px] font-normal text-[#2E00AB]/60">Loading categories…</p>
          )}
          {!catsQ.isLoading && (catsQ.data ?? []).length === 0 && (
            <p className="py-2 text-[14px] font-normal text-[#2E00AB]/60">
              No categories found to link.
            </p>
          )}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {(catsQ.data ?? []).map((m) => {
              const checked = categoryIds.includes(m.id);
              return (
                <label key={m.id} className="admin-check-row">
                  <Checkbox
                    checked={checked}
                    className="h-5 w-5 rounded-[4px] border-[#EAE6FA] data-[state=checked]:border-[#2E00AB] data-[state=checked]:bg-[#2E00AB]"
                    onCheckedChange={(v) => {
                      setCategoryIds((prev) =>
                        v ? [...prev, m.id] : prev.filter((x) => x !== m.id),
                      );
                    }}
                  />
                  {m.name}
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/admin/questionnaires" })}
          className={`${adminBtnSecondary} w-full sm:w-auto`}
        >
          Cancel
        </Button>
        <Button
          disabled={!name.trim() || mut.isPending}
          onClick={() => mut.mutate()}
          className={`${adminBtnPrimary} w-full sm:w-auto`}
        >
          {mut.isPending ? "Saving…" : "Create questionnaire"}
        </Button>
      </div>
    </div>
  );
}
