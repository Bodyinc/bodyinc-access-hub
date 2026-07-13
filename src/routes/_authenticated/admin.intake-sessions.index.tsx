import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { listIntakeSessions } from "@/lib/intake-sessions.functions";
import { RefreshButton } from "@/components/admin/refresh-button";

export const Route = createFileRoute("/_authenticated/admin/intake-sessions/")({
  component: IntakeSessionsListPage,
});

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IntakeSessionsListPage() {
  const navigate = useNavigate();
  const list = useServerFn(listIntakeSessions);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState<string>("all");
  const [claimed, setClaimed] = useState<"all" | "claimed" | "unclaimed">("all");

  const q = useQuery({
    queryKey: ["admin-intake-sessions", { search: debounced, status, claimed }],
    queryFn: () => list({ data: { search: debounced || undefined, status, claimed } }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Intake Sessions</h2>
          <p className="text-sm text-muted-foreground">
            Patient intake responses, eligibility results, and selected plans.
          </p>
        </div>
        <RefreshButton onClick={() => q.refetch()} loading={q.isFetching} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="payment_pending">Payment pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="abandoned">Abandoned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={claimed} onValueChange={(v) => setClaimed(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sessions</SelectItem>
            <SelectItem value="claimed">Claimed</SelectItem>
            <SelectItem value="unclaimed">Unclaimed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {q.isError && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-destructive">{(q.error as Error).message}</TableCell></TableRow>
            )}
            {!q.isLoading && q.data?.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No sessions found.</TableCell></TableRow>
            )}
            {q.data?.map((s: any) => (
              <TableRow
                key={s.id}
                className="cursor-pointer"
                onClick={() => navigate({ to: "/admin/intake-sessions/$sessionId", params: { sessionId: s.id } })}
              >
                <TableCell className="font-medium">{s.full_name || "—"}</TableCell>
                <TableCell>{s.email || "—"}</TableCell>
                <TableCell>{s.state_code || "—"}</TableCell>
                <TableCell className="capitalize">{s.sex || "—"}</TableCell>
                <TableCell>{s.plan_name || "—"}</TableCell>
                <TableCell><Badge variant="secondary">{s.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{formatDate(s.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}