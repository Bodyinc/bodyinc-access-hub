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
import { adminPageTitle, adminPageSubtitle, adminBtnPrimary, adminCard } from "@/lib/admin-ui";

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
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h2 className={adminPageTitle}>Questionnaires</h2>
          <p className={`mt-1 ${adminPageSubtitle}`}>
            Eligibility screenings shown per goal/category.
          </p>
        </div>
        <Button
          onClick={() => navigate({ to: "/admin/questionnaires/new" })}
          className={adminBtnPrimary}
        >
          <Plus className="mr-1.5 h-4 w-4 stroke-[2.5]" /> Add Questionnaire
        </Button>
      </div>

      {!query.isLoading && rows.length === 0 ? (
        <Card className={`${adminCard} border-dashed`}>
          <CardHeader className="text-center">
            <CardTitle className={adminPageTitle}>No questionnaires yet</CardTitle>
            <CardDescription className={adminPageSubtitle}>
              Create one and link it to medicines that require screening.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button
              onClick={() => navigate({ to: "/admin/questionnaires/new" })}
              className={adminBtnPrimary}
            >
              <Plus className="mr-1.5 h-4 w-4 stroke-[2.5]" /> Add questionnaire
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className={adminCard}>
          <div className="admin-table-scroll">
            <Table className="w-full min-w-[680px] border-collapse">
              <TableHeader className="border-b border-[#EAE6FA] bg-[#FAF9FF]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="h-12 border-r border-[#EAE6FA] px-4 text-[13px] font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-[14px] lg:px-8">Name</TableHead>
                  <TableHead className="h-12 border-r border-[#EAE6FA] px-4 text-[13px] font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-[14px] lg:px-8">Questions</TableHead>
                  <TableHead className="h-12 border-r border-[#EAE6FA] px-4 text-[13px] font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-[14px] lg:px-8">Linked goals</TableHead>
                  <TableHead className="h-12 border-r border-[#EAE6FA] px-4 text-[13px] font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-[14px] lg:px-8">Status</TableHead>
                  <TableHead className="h-12 w-14 px-2 sm:h-14 sm:px-4 lg:px-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center font-medium text-[#2E00AB]/60">
                      Loading records…
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer border-b border-[#EAE6FA] last:border-none hover:bg-[#FAF9FF]/20 transition-colors"
                    onClick={() => navigate({ to: "/admin/questionnaires/$questionnaireId", params: { questionnaireId: r.id } })}
                  >
                    <TableCell className="border-r border-[#EAE6FA] px-4 py-4 text-[14px] font-semibold text-[#2E00AB] sm:px-6 sm:py-5 lg:px-8">
                      {r.name}
                    </TableCell>
                    <TableCell className="border-r border-[#EAE6FA] px-4 py-4 text-[14px] font-normal text-[#2E00AB]/80 sm:px-6 sm:py-5 lg:px-8">
                      {r.question_count}
                    </TableCell>
                    <TableCell className="border-r border-[#EAE6FA] px-4 py-4 text-[14px] font-normal text-[#2E00AB]/80 sm:px-6 sm:py-5 lg:px-8">
                      {r.category_ids.length}
                    </TableCell>
                    <TableCell className="border-r border-[#EAE6FA] px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                      <Badge
                        className={`px-3.5 py-1 rounded-[6px] text-[13px] font-medium tracking-normal normal-case border shadow-none ${
                          r.is_active
                            ? "bg-[#F3F0FF] text-[#2E00AB] border-transparent"
                            : "bg-white text-[#2E00AB]/50 border-[#EAE6FA]"
                        }`}
                      >
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 py-4 text-right sm:px-4 sm:py-5 lg:px-8" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#2E00AB]/70 hover:bg-[#F3F0FF] rounded-lg transition-colors">
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-[#EAE6FA] p-1 shadow-md bg-white">
                          <DropdownMenuItem asChild className="rounded-lg font-medium text-[#2E00AB] focus:bg-[#F3F0FF] focus:text-[#2E00AB] cursor-pointer">
                            <Link to="/admin/questionnaires/$questionnaireId" params={{ questionnaireId: r.id }}>Edit</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-[#FAF9FF]" />
                          <DropdownMenuItem
                            className="rounded-lg font-medium text-[#FF5A79] focus:bg-[#FFE8EC] focus:text-[#FF5A79] cursor-pointer"
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

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl border border-[#EAE6FA] bg-white p-6 max-w-[440px] shadow-xl">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className={adminPageTitle}>
              Delete questionnaire?
            </AlertDialogTitle>
            <AlertDialogDescription className={adminPageSubtitle}>
              &ldquo;{confirm?.name}&rdquo; and all its questions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-2 pt-2 w-full">
            <AlertDialogCancel className="flex-1 text-[#5527E7] hover:bg-[#F3F0FF] hover:text-[#1D0087] font-semibold rounded-xl h-11 transition-colors border-none bg-transparent shadow-none mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              className="flex-1 bg-[#FF5A79] hover:bg-[#E24A67] text-white font-bold rounded-xl h-11 px-5 shadow-none transition-colors border-none"
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