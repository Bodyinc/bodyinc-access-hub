import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Search, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  deleteQuestion,
  listQuestions,
  moveQuestion,
  setQuestionActive,
} from "@/lib/questions.functions";
import {
  QUESTION_TYPE_BADGE_LABELS,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
  isMcqType,
  type QuestionType,
} from "@/lib/questions.schema";

export const Route = createFileRoute("/_authenticated/admin/questions/")({
  component: QuestionsListPage,
});

function truncate(text: string, max = 80) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function QuestionsListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listQuestions);
  const setActive = useServerFn(setQuestionActive);
  const del = useServerFn(deleteQuestion);
  const move = useServerFn(moveQuestion);

  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | QuestionType>("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; prompt: string } | null>(null);

  const query = useQuery({
    queryKey: ["questions", { search, type, status }],
    queryFn: () =>
      list({
        data: {
          search: search || undefined,
          type,
          status,
        },
      }),
  });

  const activeMut = useMutation({
    mutationFn: (vars: { id: string; is_active: boolean }) =>
      setActive({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question deleted");
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveMut = useMutation({
    mutationFn: (vars: { id: string; direction: "up" | "down" }) =>
      move({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = query.data ?? [];
  const isEmpty = !query.isLoading && !query.isError && rows.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Intake Questions</h2>
          <p className="text-sm text-muted-foreground">
            Build the screening quiz shown to first-time visitors before they sign up.
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/admin/questions/new" })} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" /> Add Question
        </Button>
      </div>

      {!isEmpty && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions"
                className="pl-8"
              />
            </div>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {query.isError && (
        <Card className="border-destructive/40">
          <CardContent className="py-6 text-center text-sm text-destructive">
            {(query.error as Error).message}
            <p className="mt-2 text-xs text-muted-foreground">
              Ensure the intake questions migration has been applied in Supabase.
            </p>
          </CardContent>
        </Card>
      )}

      {isEmpty ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>No questions yet</CardTitle>
            <CardDescription>
              Add your first intake question to start building the patient screening quiz.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button onClick={() => navigate({ to: "/admin/questions/new" })}>
              <Plus className="mr-1.5 h-4 w-4" /> Add your first question
            </Button>
          </CardContent>
        </Card>
      ) : (
        !query.isError && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Order</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {rows.map((q: any, index: number) => (
                <TableRow
                  key={q.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: "/admin/questions/$questionId",
                      params: { questionId: q.id },
                    })
                  }
                >
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium">{truncate(q.prompt)}</div>
                    {q.description && (
                      <div className="text-xs text-muted-foreground">{truncate(q.description, 60)}</div>
                    )}
                    {isMcqType(q.question_type) && (
                      <div className="text-xs text-muted-foreground">
                        {q.option_count} option{q.option_count === 1 ? "" : "s"}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {QUESTION_TYPE_BADGE_LABELS[q.question_type as QuestionType]}
                    </Badge>
                  </TableCell>
                  <TableCell>{q.is_required ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Badge variant={q.is_active ? "default" : "secondary"}>
                      {q.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === 0 || moveMut.isPending}
                        onClick={() => moveMut.mutate({ id: q.id, direction: "up" })}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={index === rows.length - 1 || moveMut.isPending}
                        onClick={() => moveMut.mutate({ id: q.id, direction: "down" })}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to="/admin/questions/$questionId" params={{ questionId: q.id }}>
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            activeMut.mutate({ id: q.id, is_active: !q.is_active })
                          }
                        >
                          {q.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() =>
                            setConfirmDelete({ id: q.id, prompt: truncate(q.prompt, 60) })
                          }
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
        </Card>
        )
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes &ldquo;{confirmDelete?.prompt}&rdquo;. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
