import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Search, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { RefreshButton } from "@/components/admin/refresh-button";
import {
  listPatients,
  sendPatientPasswordReset,
  setPatientActive,
} from "@/lib/patients.functions";

export const Route = createFileRoute("/_authenticated/admin/patients/")({
  component: PatientsListPage,
});

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PatientsListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listPatients);
  const setActive = useServerFn(setPatientActive);
  const reset = useServerFn(sendPatientPasswordReset);

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search);
  const [status, setStatus] = useState<"all" | "active" | "deactivated">("all");

  const query = useQuery({
    queryKey: ["patients", { search: debounced, status }],
    queryFn: () => list({ data: { search: debounced || undefined, status } }),
  });

  const activeMut = useMutation({
    mutationFn: (vars: { userId: string; is_active: boolean }) => setActive({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMut = useMutation({
    mutationFn: (userId: string) =>
      reset({ data: { userId, redirect_to: `${window.location.origin}/reset-password` } }),
    onSuccess: () => toast.success("Password reset email sent"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    // FIX: Replaced layout wrappers with an expansive left-aligned canvas block
    <div className="w-full text-left m-0 p-0 space-y-5 max-w-none">
      {/* Header View Section */}
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold text-brand tracking-tight">Patients</h2>
          <p className="text-sm text-brand-strong/70 font-medium">
            Browse patient accounts, review intake responses, and manage access.
          </p>
        </div>
        <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
      </div>

      {/* Filter and Input Controls Strip */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-brand-strong/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="pl-9 h-10 rounded-xl border-brand-border focus-visible:ring-brand-strong text-brand font-semibold text-[14px] placeholder:text-brand-strong/40 bg-white"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40 h-10 rounded-xl border-brand-border bg-white text-brand font-semibold text-[14px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-brand-border">
            <SelectItem value="all" className="font-medium text-brand">All</SelectItem>
            <SelectItem value="active" className="font-medium text-brand">Active</SelectItem>
            <SelectItem value="deactivated" className="font-medium text-brand">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Complete Data Matrix Table Structure */}
      <Card className="w-full overflow-hidden border border-brand-border bg-white shadow-sm rounded-2xl max-w-none m-0">
        <div className="overflow-x-auto">
        <Table className="min-w-[820px]">
          <TableHeader className="bg-white">
            <TableRow className="border-b border-brand-border hover:bg-transparent">
              <TableHead className="text-brand font-bold h-11 text-[13px]">Name</TableHead>
              <TableHead className="text-brand font-bold h-11 text-[13px]">Email</TableHead>
              <TableHead className="text-brand font-bold h-11 text-[13px]">Phone</TableHead>
              <TableHead className="text-brand font-bold h-11 text-[13px]">DOB</TableHead>
              <TableHead className="text-brand font-bold h-11 text-[13px]">Joined</TableHead>
              <TableHead className="text-brand font-bold h-11 text-[13px]">Status</TableHead>
              <TableHead className="w-12 h-11 text-[13px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow className="border-b border-brand-border/50">
                <TableCell colSpan={7} className="py-12 text-center text-brand-strong/60 font-semibold text-[14px]">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {query.isError && (
              <TableRow className="border-b border-brand-border/50">
                <TableCell colSpan={7} className="py-12 text-center text-[#FF4D6D] font-semibold text-[14px]">
                  {(query.error as Error).message}
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && query.data?.length === 0 && (
              <TableRow className="border-b border-brand-border/50">
                <TableCell colSpan={7} className="py-12 text-center text-brand-strong/60 font-semibold text-[14px]">
                  No patients found.
                </TableCell>
              </TableRow>
            )}
            {query.data?.map((p: any) => (
              <TableRow
                key={p.id}
                className="cursor-pointer border-b border-brand-border/50 hover:bg-brand-surface/40 transition-colors"
                onClick={() =>
                  navigate({
                    to: "/admin/patients/$patientId",
                    params: { patientId: p.id },
                  })
                }
              >
                <TableCell className="font-bold text-brand text-[14px]">{p.full_name || "—"}</TableCell>
                <TableCell className="text-brand font-semibold text-[14px]">{p.email}</TableCell>
                <TableCell className="text-brand font-semibold text-[14px]">{p.phone || "—"}</TableCell>
                <TableCell className="text-brand font-medium text-[14px]">{formatDate(p.dob)}</TableCell>
                <TableCell className="text-brand/80 font-medium text-[14px]">{formatDate(p.created_at)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={p.is_active ? "default" : "secondary"}
                    className={`font-bold text-[12px] px-2.5 py-0.5 rounded-lg shadow-none normal-case tracking-normal border border-transparent ${
                      p.is_active 
                        ? "bg-[#E8F5E9] text-brand-strong hover:bg-[#E8F5E9]" 
                        : "bg-brand-surface text-brand hover:bg-brand-surface"
                    }`}
                  >
                    {p.is_active ? "Active" : "Deactivated"}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-brand-surface text-brand-strong rounded-xl">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-brand-border shadow-md p-1">
                      <DropdownMenuItem
                        className="rounded-lg text-brand font-semibold text-[13px] focus:bg-brand-surface focus:text-brand"
                        onClick={() =>
                          navigate({
                            to: "/admin/patients/$patientId",
                            params: { patientId: p.id },
                          })
                        }
                      >
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="rounded-lg text-brand font-semibold text-[13px] focus:bg-brand-surface focus:text-brand"
                        onClick={() => resetMut.mutate(p.id)}
                      >
                        <Mail className="mr-2 h-4 w-4 stroke-[2.5] text-brand-strong" /> Send password reset
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-brand-border" />
                      <DropdownMenuItem
                        className={`rounded-lg font-bold text-[13px] focus:bg-brand-surface ${
                          p.is_active 
                            ? "text-[#FF4D6D] focus:text-[#FF4D6D]" 
                            : "text-[#2E7D32] focus:text-[#2E7D32]"
                        }`}
                        onClick={() =>
                          activeMut.mutate({ userId: p.id, is_active: !p.is_active })
                        }
                      >
                        {p.is_active ? "Deactivate" : "Reactivate"}
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
    </div>
  );
}