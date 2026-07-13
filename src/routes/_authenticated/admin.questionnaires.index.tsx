import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteQuestionnaire, listQuestionnaires } from "@/lib/questionnaires.store";

export const Route = createFileRoute("/_authenticated/admin/questionnaires/")({
  component: QuestionnairesListPage,
});

const listKey = ["questionnaires"] as const;
const listQO = queryOptions({
  queryKey: listKey,
  queryFn: () => listQuestionnaires(),
  staleTime: Number.POSITIVE_INFINITY,
});

function QuestionnairesListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);
  const query = useQuery(listQO);
  const rows = query.data ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteQuestionnaire(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      toast.success("Deleted");
      setConfirm(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-[1200px] w-full mx-auto">
      {/* Top Banner Action Row matching Figma */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-brand">Questionnaires</h2>
          <p className="text-[14px] text-brand-strong/70 font-medium mt-1">
            Eligibility screenings shown per medicine.
          </p>
        </div>
        <Button 
          onClick={() => navigate({ to: "/admin/questionnaires/new" })}
          className="bg-brand hover:bg-brand text-white font-bold h-11 px-5 rounded-xl shadow-sm transition-colors shrink-0"
        >
          <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Add Questionnaire
        </Button>
      </div>

      {!query.isLoading && rows.length === 0 ? (
        <Card className="border-dashed border-brand-border bg-white rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-brand">No questionnaires yet</CardTitle>
            <CardDescription className="text-brand-strong/70 font-medium">
              Create one and link it to medicines that require screening.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button 
              onClick={() => navigate({ to: "/admin/questionnaires/new" })}
              className="bg-brand hover:bg-brand text-white font-bold h-11 px-5 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Add questionnaire
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Main Table Interface Panel */
        <Card className="overflow-hidden border border-brand-border bg-white shadow-sm rounded-2xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white border-b border-brand-border">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Name</TableHead>
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Questions</TableHead>
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Linked medicines</TableHead>
                  <TableHead className="h-12 font-bold text-brand text-[14px] px-6">Status</TableHead>
                  <TableHead className="h-12 w-16 px-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center font-semibold text-brand-strong/60">
                      Loading records…
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow 
                    key={r.id} 
                    className="border-b border-brand-border/80 last:border-none hover:bg-white/50 transition-colors cursor-pointer"
                    onClick={() => navigate({ to: "/admin/questionnaires/$questionnaireId", params: { questionnaireId: r.id } })}
                  >
                    <TableCell className="font-bold text-brand text-[14px] py-4 px-6">
                      {r.name}
                    </TableCell>
                    <TableCell className="font-medium text-brand-strong/80 text-[14px] py-4 px-6">
                      {r.question_count}
                    </TableCell>
                    <TableCell className="font-medium text-brand-strong/80 text-[14px] py-4 px-6">
                      {r.medicine_ids.length}
                    </TableCell>
                    <TableCell className="py-4 px-6">
                      <Badge 
                        className={`
                          px-3 py-1 rounded-xl text-[14px] font-semibold tracking-normal normal-case border shadow-none
                          ${r.is_active 
                            ? "bg-brand-surface text-brand-strong border-transparent" 
                            : "bg-white text-brand-strong/60 border-brand-border"
                          }
                        `}
                      >
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-brand-strong hover:bg-brand-surface rounded-xl transition-colors">
                            <MoreHorizontal className="h-[18px] w-[18px]" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-brand-border p-1 shadow-md bg-white">
                          <DropdownMenuItem asChild className="rounded-lg font-medium text-brand focus:bg-brand-surface focus:text-brand cursor-pointer">
                            <Link to="/admin/questionnaires/$questionnaireId" params={{ questionnaireId: r.id }}>Edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-brand-border" />
                          <DropdownMenuItem 
                            className="rounded-lg font-medium text-[#FF4D6D] focus:bg-[#FFE8EC] focus:text-[#FF4D6D] cursor-pointer"
                            onClick={() => setConfirm({ id: r.id, name: r.name })}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Confirmation Modal */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-[24px] border-none bg-white p-6 max-w-[440px] shadow-xl sm:rounded-[24px]">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-[20px] font-black tracking-tight text-brand">
              Delete questionnaire?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] font-medium text-brand-strong/60">
              &ldquo;{confirm?.name}&rdquo; and all its questions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-2 pt-2 w-full">
            <AlertDialogCancel className="flex-1 text-brand-strong hover:bg-brand-surface hover:text-brand font-bold rounded-xl h-11 transition-colors border-none bg-transparent shadow-none mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="flex-1 bg-[#FF4D6D] hover:bg-[#E63956] text-white font-bold rounded-xl h-11 px-5 shadow-sm transition-colors border-none"
              onClick={() => confirm && deleteMut.mutate(confirm.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}