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
    /* Changed container classes to sit flush with the sidebar layout from left-to-right */
    <div className="w-full p-4 sm:p-1 space-y-6 bg-white min-h-screen">
      {/* Top Banner Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-bold text-[#2A00A2] tracking-tight">Questionnaires</h2>
          <p className="text-[14px] text-[#5527E7]/80 font-normal mt-1">
            Eligibility screenings shown per medicine.
          </p>
        </div>
        <Button 
          onClick={() => navigate({ to: "/admin/questionnaires/new" })}
          className="bg-[#1D0087] hover:bg-[#140061] text-white font-medium text-[14px] h-10 px-5 rounded-lg shadow-none transition-colors shrink-0"
        >
          <Plus className="mr-1.5 h-4 w-4 stroke-[2.5]" /> Add Questionnaire
        </Button>
      </div>

      {!query.isLoading && rows.length === 0 ? (
        <Card className="border-dashed border-[#EDEAFB] bg-white rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-[#1D0087]">No questionnaires yet</CardTitle>
            <CardDescription className="text-[#5527E7]/80 font-medium">
              Create one and link it to medicines that require screening.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button 
              onClick={() => navigate({ to: "/admin/questionnaires/new" })}
              className="bg-[#1D0087] hover:bg-[#140061] text-white font-medium text-[14px] h-10 px-5 rounded-lg shadow-none transition-colors"
            >
              <Plus className="mr-1.5 h-4 w-4 stroke-[2.5]" /> Add questionnaire
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Main Table Interface Panel styled horizontally left-to-right */
        <Card className="overflow-hidden border border-[#EDEAFB] bg-white shadow-none rounded-2xl w-full">
          <div className="overflow-x-auto">
            <Table className="border-collapse w-full">
              <TableHeader className="bg-[#FAF9FF] border-b border-[#EDEAFB]">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="h-14 font-medium text-[#1D0087] text-[14px] px-8 border-r border-[#EDEAFB]">Name</TableHead>
                  <TableHead className="h-14 font-medium text-[#1D0087] text-[14px] px-8 border-r border-[#EDEAFB]">Questions</TableHead>
                  <TableHead className="h-14 font-medium text-[#1D0087] text-[14px] px-8 border-r border-[#EDEAFB]">Linked medicines</TableHead>
                  <TableHead className="h-14 font-medium text-[#1D0087] text-[14px] px-8 border-r border-[#EDEAFB]">Status</TableHead>
                  <TableHead className="h-14 w-16 px-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center font-medium text-[#5527E7]/60">
                      Loading records…
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow 
                    key={r.id} 
                    className="border-b border-[#EDEAFB] last:border-none hover:bg-[#FAF9FF]/20 transition-colors cursor-pointer"
                    onClick={() => navigate({ to: "/admin/questionnaires/$questionnaireId", params: { questionnaireId: r.id } })}
                  >
                    {/* Primary item title matches deep purple font weights */}
                    <TableCell className="font-semibold text-[#1D0087] text-[14px] py-5 px-8 border-r border-[#EDEAFB]">
                      {r.name}
                    </TableCell>
                    
                    {/* Column variables mapped to slate indigo font color */}
                    <TableCell className="font-normal text-[#5140AB] text-[14px] py-5 px-8 border-r border-[#EDEAFB]">
                      {r.question_count}
                    </TableCell>
                    
                    <TableCell className="font-normal text-[#5140AB] text-[14px] py-5 px-8 border-r border-[#EDEAFB]">
                      {r.medicine_ids.length}
                    </TableCell>
                    
                    {/* Active dynamic pill tags updated */}
                    <TableCell className="py-5 px-8 border-r border-[#EDEAFB]">
                      <Badge 
                        className={`
                          px-3.5 py-1 rounded-[6px] text-[13px] font-medium tracking-normal normal-case border shadow-none
                          ${r.is_active 
                            ? "bg-[#F3F0FF] text-[#5527E7] border-transparent" 
                            : "bg-white text-[#5527E7]/50 border-[#E5E1FC]"
                          }
                        `}
                      >
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="py-5 px-8 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#5140AB] hover:bg-[#F3F0FF] rounded-lg transition-colors">
                            <MoreHorizontal className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-[#EDEAFB] p-1 shadow-md bg-white">
                          <DropdownMenuItem asChild className="rounded-lg font-medium text-[#1D0087] focus:bg-[#F3F0FF] focus:text-[#1D0087] cursor-pointer">
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

      {/* Confirmation Modal */}
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl border-none bg-white p-6 max-w-[440px] shadow-xl">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-xl font-bold text-[#1D0087]">
              Delete questionnaire?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] font-medium text-[#5527E7]/80">
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