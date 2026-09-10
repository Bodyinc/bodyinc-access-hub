import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { RefreshButton } from "@/components/admin/refresh-button";
import {
  listPatientFeedback,
  updatePatientFeedback,
  type PatientFeedbackRow,
} from "@/lib/feedback.functions";
import {
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABELS,
  feedbackStatusLabel,
  feedbackStatusTone,
  adminStatusOptions,
  type FeedbackStatus,
} from "@/lib/feedback-status";
import {
  adminPageTitle,
  adminPageSubtitle,
  adminInput,
  adminSelect,
  adminTextarea,
  adminBtnPrimary,
  adminBtnSecondary,
  adminLabel,
} from "@/lib/admin-ui";
import { formatDateTime } from "@/lib/format";
import { toastError } from "@/lib/toast-message";

export const Route = createFileRoute("/_authenticated/admin/feedback/")({
  head: () => ({
    meta: [
      { title: "Feedback · Body Inc Admin" },
      { name: "description", content: "Patient inquiries — Admin area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeedbackListPage,
});

function preview(text: string, max = 90) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function FeedbackListPage() {
  const qc = useQueryClient();
  const list = useServerFn(listPatientFeedback);
  const update = useServerFn(updatePatientFeedback);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState<"all" | "active" | FeedbackStatus>("all");
  const [selected, setSelected] = useState<PatientFeedbackRow | null>(null);
  const [nextStatus, setNextStatus] = useState<FeedbackStatus>("in_progress");
  const [reply, setReply] = useState("");

  const q = useQuery({
    queryKey: ["admin-feedback", { search: debounced, status }],
    queryFn: () => list({ data: { search: debounced || undefined, status } }),
    placeholderData: keepPreviousData,
  });

  const mut = useMutation({
    mutationFn: () =>
      update({
        data: { id: selected!.id, status: nextStatus, body: reply },
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin-feedback"] });
      if (result.emailed && !result.email_sent) {
        toast.warning("Saved, but the patient email did not send.");
      } else if (result.email_sent) {
        toast.success("Update saved and emailed to the patient.");
      } else {
        toast.success("Inquiry updated.");
      }
      setSelected(null);
      setReply("");
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  function openRow(row: PatientFeedbackRow) {
    setSelected(row);
    setNextStatus(row.status === "open" ? "in_progress" : row.status);
    setReply("");
  }

  return (
    <div className="admin-page-shell !max-w-none space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h2 className={adminPageTitle}>Feedback</h2>
          <p className={adminPageSubtitle}>
            Patient inquiries. History stays here after a solution is sent. Resolved means the
            patient confirmed, or 3 days passed with no reply.
          </p>
        </div>
        <RefreshButton onClick={() => q.refetch()} loading={q.isFetching} />
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3B4759]/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or message…"
            className={`${adminInput} pl-9`}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className={`${adminSelect} sm:w-52`}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All (including history)</SelectItem>
            <SelectItem value="active">Needs attention</SelectItem>
            {FEEDBACK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {FEEDBACK_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="admin-table-wrap m-0 w-full">
        <div className="admin-table-scroll">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-[#F8FBFA]">
              <TableRow className="border-b border-[#D5DEDD] hover:bg-transparent">
                <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">
                  Patient
                </TableHead>
                <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">
                  Message
                </TableHead>
                <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">
                  Status
                </TableHead>
                <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">
                  Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && (
                <TableRow className="border-b border-[#D5DEDD]/50">
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-[#6A9B9C]/60 font-semibold text-[14px]"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {q.isError && (
                <TableRow className="border-b border-[#D5DEDD]/50">
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-[#6A9B9C] font-semibold text-[14px]"
                  >
                    {(q.error as Error).message}
                  </TableCell>
                </TableRow>
              )}
              {!q.isLoading && q.data?.length === 0 && (
                <TableRow className="border-b border-[#D5DEDD]/50">
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-[#6A9B9C]/60 font-semibold text-[14px]"
                  >
                    No inquiries in this view.
                  </TableCell>
                </TableRow>
              )}
              {q.data?.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer border-b border-[#D5DEDD] hover:bg-[#E8EEED]/40 transition-colors"
                  onClick={() => openRow(row)}
                >
                  <TableCell className="font-semibold text-[#3B4759] text-[14px]">
                    <div>{row.full_name || "—"}</div>
                    <div className="font-medium text-[#3B4759]/70">{row.email || "—"}</div>
                    {row.intake_session_id && !row.user_id ? (
                      <div className="mt-0.5 text-[12px] font-medium text-[#6A9B9C]">
                        Onboarding intake
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-[360px] text-[#3B4759] font-medium text-[14px]">
                    {preview(row.message)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`rounded-full font-semibold ${feedbackStatusTone(row.status)}`}
                    >
                      {feedbackStatusLabel(row.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[#3B4759]/70 font-medium text-[14px]">
                    {formatDateTime(row.updated_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border-[#D5DEDD]">
          <DialogHeader>
            <DialogTitle className="text-[#3B4759]">
              {selected?.full_name || "Patient inquiry"}
            </DialogTitle>
            <DialogDescription className="text-[#6A9B9C]/80">
              {selected ? `${selected.email || "No email"} · ${formatDateTime(selected.created_at)}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.page_path && (
                <p className="text-[13px] text-[#6A9B9C]">From {selected.page_path}</p>
              )}
              {selected.intake_session_id && (
                <Button asChild className={adminBtnSecondary}>
                  <Link
                    to="/admin/intake-sessions/$sessionId"
                    params={{ sessionId: selected.intake_session_id }}
                  >
                    Open intake session
                  </Link>
                </Button>
              )}

              <div className="rounded-xl border border-[#D5DEDD] bg-[#F8FBFA] p-3">
                <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-[#6A9B9C]">
                  Original inquiry
                </p>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#3B4759]">
                  {selected.message}
                </p>
              </div>

              {selected.replies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#6A9B9C]">
                    Thread
                  </p>
                  {selected.replies.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-[#D5DEDD] bg-white p-3"
                    >
                      <p className="text-[12px] font-semibold text-[#6A9B9C]">
                        {r.author_role === "admin" ? "Body Inc team" : "Patient"} ·{" "}
                        {formatDateTime(r.created_at)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-[#3B4759]">
                        {r.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className={adminLabel}>Status</p>
                <Select
                  value={nextStatus}
                  onValueChange={(v) => setNextStatus(v as FeedbackStatus)}
                >
                  <SelectTrigger className={adminSelect}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {adminStatusOptions(selected.status).map((s) => (
                      <SelectItem key={s} value={s}>
                        {FEEDBACK_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className={adminLabel}>
                  {nextStatus === "awaiting_confirmation"
                    ? "Solution (patient confirms, or this resolves in 3 days)"
                    : nextStatus === "needs_info"
                      ? "What do you still need from them?"
                      : "Message to the patient (optional)"}
                </p>
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder={
                    nextStatus === "awaiting_confirmation"
                      ? "Explain how this should be resolved…"
                      : "Write a note the patient will see in email and in their portal…"
                  }
                  className={adminTextarea}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className={adminBtnPrimary}
                  disabled={
                    mut.isPending ||
                    ((nextStatus === "awaiting_confirmation" || nextStatus === "needs_info") &&
                      reply.trim().length < 10)
                  }
                  onClick={() => mut.mutate()}
                >
                  {mut.isPending ? "Saving…" : "Save and notify patient"}
                </Button>
                {selected.user_id && (
                  <Button asChild className={adminBtnSecondary}>
                    <Link to="/admin/patients/$patientId" params={{ patientId: selected.user_id }}>
                      Open patient
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
