import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { listRequestNotes, addRequestNote } from "@/lib/requests.functions";
import { adminCard, adminSectionTitle, adminSectionSubtitle } from "@/lib/admin-ui";
import { formatDateTimeFull } from "@/lib/format";
import { toastError } from "@/lib/toast-message";

// Internal clinical notes on an order — visible to admins and the assigned practitioner only.
export function RequestNotes({ requestId }: { requestId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listRequestNotes);
  const add = useServerFn(addRequestNote);
  const [body, setBody] = useState("");

  const q = useQuery({
    queryKey: ["request-notes", requestId],
    queryFn: () => list({ data: { requestId } }),
  });

  const mut = useMutation({
    mutationFn: () => add({ data: { requestId, body: body.trim() } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["request-notes", requestId] });
    },
    onError: (e: Error) => toast.error(toastError(e)),
  });

  const notes = (q.data as any[]) ?? [];

  return (
    <Card className={adminCard}>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className={adminSectionTitle}>Clinical notes</CardTitle>
        <CardDescription className={adminSectionSubtitle}>
          Internal only — never shown to the patient.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        {q.isLoading ? (
          <p className="text-[14px] text-[#3B4759]/60">Loading notes…</p>
        ) : notes.length === 0 ? (
          <p className="text-[14px] text-[#3B4759]/60">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-[#D5DEDD] bg-[#E8EEED]/40 p-3">
                <div className="whitespace-pre-wrap text-[14px] text-[#3B4759]">{n.body}</div>
                <div className="pt-1 text-[12px] text-[#3B4759]/60">
                  {n.author_name} · {n.author_role} · {formatDateTimeFull(n.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Add a clinical note…"
            className="border-[#D5DEDD] text-[14px] text-[#3B4759]"
          />
          <Button
            size="sm"
            disabled={body.trim().length === 0 || mut.isPending}
            onClick={() => mut.mutate()}
            className="h-10 bg-[#6A9B9C] px-4 text-[13px] font-semibold text-white hover:bg-[#5B8788]"
          >
            {mut.isPending ? "Saving…" : "Add note"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
