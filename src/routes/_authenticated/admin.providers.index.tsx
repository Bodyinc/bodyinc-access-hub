import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Mail, MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  deleteProvider,
  listProviders,
  resendInvite,
  setProviderActive,
} from "@/lib/providers.functions";
import { adminPageTitle, adminPageSubtitle, adminInput, adminSelect, adminBtnPrimary } from "@/lib/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/providers/")({
  component: ProvidersListPage,
});

function ProvidersListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listProviders);
  const resend = useServerFn(resendInvite);
  const setActive = useServerFn(setProviderActive);
  const del = useServerFn(deleteProvider);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const query = useQuery({
    queryKey: ["providers", { search: debouncedSearch, status }],
    queryFn: () => list({ data: { search: debouncedSearch || undefined, status } }),
  });

  const resendMut = useMutation({
    mutationFn: (id: string) =>
      resend({ data: { id, redirect_to: `${window.location.origin}/reset-password` } }),
    onSuccess: () => toast.success("Invite link sent"),
    onError: (e: Error) => toast.error(e.message),
  });

  const activeMut = useMutation({
    mutationFn: (vars: { id: string; is_active: boolean }) => setActive({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Provider deleted");
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans']">
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h2 className={adminPageTitle}>Providers</h2>
          <p className={`mt-1 ${adminPageSubtitle}`}>
            Manage clinical accounts, credentials, and track activation statuses.
          </p>
        </div>
        <Button
          onClick={() => navigate({ to: "/admin/providers/new" })}
          className={adminBtnPrimary}
        >
          <Plus className="mr-1.5 h-4 w-4 stroke-[3]" /> Add Provider
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2E00AB]/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, specialty..."
            className={`${adminInput} pl-10`}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className={`${adminSelect} sm:w-44`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="admin-table-wrap">
        <div className="admin-table-scroll">
        <Table className="min-w-[760px]">
          <TableHeader className="bg-[#FDFDFF]">
            <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
              <TableHead className="text-[#2E00AB] font-semibold text-[13px] h-12 px-6">Name</TableHead>
              <TableHead className="text-[#2E00AB] font-semibold text-[13px] h-12 px-6">Email</TableHead>
              <TableHead className="text-[#2E00AB] font-semibold text-[13px] h-12 px-6">Specialty</TableHead>
              <TableHead className="text-[#2E00AB] font-semibold text-[13px] h-12 px-6">Credentials</TableHead>
              <TableHead className="text-[#2E00AB] font-semibold text-[13px] h-12 px-6">Status</TableHead>
              <TableHead className="w-12 px-6" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-center text-[#6B5AE0]/60 font-medium py-12">
                  Loading provider records…
                </TableCell>
              </TableRow>
            )}
            {query.isError && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-center text-[#FF4D6D] font-semibold py-12">
                  {(query.error as Error).message}
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && query.data?.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-center text-[#6B5AE0]/60 font-medium py-12">
                  No active provider accounts found matching criteria.
                </TableCell>
              </TableRow>
            )}
            {query.data?.map((p: any) => (
              <TableRow
                key={p.id}
                className="cursor-pointer border-b border-[#EAE6FA] hover:bg-[#F5F3FF]/40 transition-colors"
                onClick={() =>
                  navigate({
                    to: "/admin/providers/$providerId",
                    params: { providerId: p.id },
                  })
                }
              >
                <TableCell className="font-semibold text-[#2E00AB] text-[14px] py-4 px-6">{p.full_name}</TableCell>
                <TableCell className="text-[#2E00AB]/70 font-medium text-[14px] py-4 px-6">{p.email}</TableCell>
                <TableCell className="text-[#2E00AB] font-medium text-[14px] py-4 px-6">{p.specialty ?? "—"}</TableCell>
                <TableCell className="text-[#2E00AB]/70 font-medium text-[14px] py-4 px-6">{p.credentials ?? "—"}</TableCell>
                <TableCell className="py-4 px-6">
                  {p.is_active ? (
                    <Badge className="bg-[#eae8ff] hover:bg-[#E8FFE8] text-[#002e8a] border border-transparent font-bold text-[12px] px-2.5 py-0.5 rounded-lg shadow-none">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-[#FFF0F2] hover:bg-[#FFF0F2] text-[#FF4D6D] border border-transparent font-bold text-[12px] px-2.5 py-0.5 rounded-lg shadow-none">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-[#6B5AE0] hover:text-[#2A00A2] hover:bg-[#F5F3FF]">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-[#E2DCFA] p-1 shadow-md bg-white">
                      <DropdownMenuItem asChild className="rounded-lg font-semibold text-[13px] text-[#2A00A2] focus:bg-[#F5F3FF] focus:text-[#2A00A2] px-3 py-2 cursor-pointer">
                        <Link to="/admin/providers/$providerId" params={{ providerId: p.id }}>
                          Edit Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => resendMut.mutate(p.id)}
                        className="rounded-lg font-semibold text-[13px] text-[#2A00A2] focus:bg-[#F5F3FF] focus:text-[#2A00A2] px-3 py-2 cursor-pointer"
                      >
                        <Mail className="mr-2 h-4 w-4 text-[#4A3AFF]" /> Resend invite
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => activeMut.mutate({ id: p.id, is_active: !p.is_active })}
                        className="rounded-lg font-semibold text-[13px] text-[#2A00A2] focus:bg-[#F5F3FF] focus:text-[#2A00A2] px-3 py-2 cursor-pointer"
                      >
                        {p.is_active ? "Deactivate Account" : "Activate Account"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[#F4F1FE]" />
                      <DropdownMenuItem
                        className="rounded-lg font-semibold text-[13px] text-[#FF4D6D] focus:bg-[#FFE8EC] focus:text-[#FF4D6D] px-3 py-2 cursor-pointer"
                        onClick={() => setConfirmDelete({ id: p.id, name: p.full_name })}
                      >
                        Delete Permanent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Confirmation Dialog System */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-[#E2DCFA] max-w-md p-6 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#2A00A2]">Delete provider context?</AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-[#6B5AE0]/80 font-medium leading-relaxed mt-2">
              This action configuration permanently removes <span className="font-bold text-[#2A00A2]">{confirmDelete?.name}</span>'s records, credentials, and platform track access metrics. This profile termination path cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="border-[#E2DCFA] text-[#6B5AE0] hover:bg-[#F5F3FF] hover:text-[#2A00A2] font-bold rounded-xl h-11 transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
              className="bg-[#FF4D6D] text-white hover:bg-[#E03B58] font-bold rounded-xl h-11 px-5 transition-colors shadow-none"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}