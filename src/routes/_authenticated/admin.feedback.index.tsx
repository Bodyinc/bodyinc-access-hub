import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { RefreshButton } from "@/components/admin/refresh-button";
import { listPatientFeedback, type PatientFeedbackRow } from "@/lib/feedback.functions";
import { adminPageTitle, adminPageSubtitle, adminInput, adminBtnSecondary } from "@/lib/admin-ui";
import { formatDateTime } from "@/lib/format";
import { sentenceCase } from "@/lib/text-normalize";

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
  const list = useServerFn(listPatientFeedback);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [selected, setSelected] = useState<PatientFeedbackRow | null>(null);

  const q = useQuery({
    queryKey: ["admin-feedback", { search: debounced }],
    queryFn: () => list({ data: { search: debounced || undefined } }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h2 className={adminPageTitle}>Feedback</h2>
          <p className={adminPageSubtitle}>
            Inquiries patients send from the patient portal. Newest first.
          </p>
        </div>
        <RefreshButton onClick={() => q.refetch()} loading={q.isFetching} />
      </div>

      <div className="relative min-w-0 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3B4759]/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, or message…"
          className={`${adminInput} pl-9`}
        />
      </div>

      <div className="admin-table-wrap m-0 w-full">
        <div className="admin-table-scroll">
          <Table className="min-w-[720px]">
            <TableHeader className="bg-[#F8FBFA]">
              <TableRow className="border-b border-[#D5DEDD] hover:bg-transparent">
                <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">
                  Patient
                </TableHead>
                <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">
                  Email
                </TableHead>
                <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">
                  Message
                </TableHead>
                <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">
                  Page
                </TableHead>
                <TableHead className="text-[#3B4759] font-semibold h-11 text-[13px]">
                  Received
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading && (
                <TableRow className="border-b border-[#D5DEDD]/50">
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-[#6A9B9C]/60 font-semibold text-[14px]"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {q.isError && (
                <TableRow className="border-b border-[#D5DEDD]/50">
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-[#6A9B9C] font-semibold text-[14px]"
                  >
                    {(q.error as Error).message}
                  </TableCell>
                </TableRow>
              )}
              {!q.isLoading && q.data?.length === 0 && (
                <TableRow className="border-b border-[#D5DEDD]/50">
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-[#6A9B9C]/60 font-semibold text-[14px]"
                  >
                    No inquiries yet.
                  </TableCell>
                </TableRow>
              )}
              {q.data?.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer border-b border-[#D5DEDD] hover:bg-[#E8EEED]/40 transition-colors"
                  onClick={() => setSelected(row)}
                >
                  <TableCell className="font-semibold text-[#3B4759] text-[14px]">
                    {row.full_name || "—"}
                  </TableCell>
                  <TableCell className="text-[#3B4759]/70 font-medium text-[14px]">
                    {row.email || "—"}
                  </TableCell>
                  <TableCell className="max-w-[360px] text-[#3B4759] font-medium text-[14px]">
                    {preview(row.message)}
                  </TableCell>
                  <TableCell className="text-[#3B4759]/70 font-medium text-[14px]">
                    {row.page_path || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-[#3B4759]/70 font-medium text-[14px]">
                    {formatDateTime(row.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg rounded-2xl border-[#D5DEDD]">
          <DialogHeader>
            <DialogTitle className="text-[#3B4759]">
              {selected?.full_name || "Patient inquiry"}
            </DialogTitle>
            <DialogDescription className="text-[#6A9B9C]/80">
              {selected ? formatDateTime(selected.created_at) : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full bg-[#F2F7F6] text-[#3B4759]">
                  {sentenceCase(selected.category)}
                </Badge>
                {selected.page_path && (
                  <span className="text-[13px] text-[#6A9B9C]">{selected.page_path}</span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#3B4759]">
                {selected.message}
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.email && (
                  <Button asChild className={adminBtnSecondary}>
                    <a href={`mailto:${selected.email}`}>Email patient</a>
                  </Button>
                )}
                {selected.user_id && (
                  <Button asChild className={adminBtnSecondary}>
                    <Link
                      to="/admin/patients/$patientId"
                      params={{ patientId: selected.user_id }}
                    >
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
