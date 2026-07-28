import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { listClaimableRequests, claimRequest } from "@/lib/provider.functions";
import { requestStatusLabel, requestStatusTone, REQUEST_STATUS_BADGE } from "@/lib/request-status";
import { adminPageTitle, adminPageSubtitle, adminInput } from "@/lib/admin-ui";

export const Route = createFileRoute("/_authenticated/provider/queue")({
  head: () => ({
    meta: [
      { title: "Order queue · Body Inc Practitioner" },
      { name: "description", content: "Order queue — Practitioner area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProviderQueuePage,
});

function ProviderQueuePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listClaimableRequests);
  const claim = useServerFn(claimRequest);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);

  const q = useQuery({
    queryKey: ["provider-claimable", debounced],
    queryFn: () => list({ data: { search: debounced || undefined } }),
  });

  const claimMut = useMutation({
    mutationFn: (id: string) => claim({ data: { requestId: id } }),
    onSuccess: () => {
      toast.success("Order claimed.");
      qc.invalidateQueries({ queryKey: ["provider-claimable"] });
      qc.invalidateQueries({ queryKey: ["provider-dashboard"] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (q.data as any[]) ?? [];

  return (
    <div className="admin-page-shell space-y-5 font-['DM_Sans',sans-serif]">
      <div className="space-y-1">
        <h1 className={adminPageTitle}>Unassigned queue</h1>
        <p className={adminPageSubtitle}>
          Open orders from patients in the states you&apos;re licensed in. Claim one to take it on.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3B4759]/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient or medicine…"
          className={`${adminInput} pl-9`}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D5DEDD] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Medication</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[14px] text-[#3B4759]/60">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[14px] text-[#3B4759]/60">
                  Nothing waiting to be claimed right now.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-[#3B4759]">{r.patient_name}</TableCell>
                  <TableCell className="text-[#3B4759]/80">{r.state_code}</TableCell>
                  <TableCell className="text-[#3B4759]/80">{r.medicine_name}</TableCell>
                  <TableCell className="text-[#3B4759]/80">
                    {r.kind === "followup" ? "Renewal" : "Initial"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`rounded-lg border-transparent px-2.5 py-0.5 text-[12px] font-semibold normal-case shadow-none ${
                        REQUEST_STATUS_BADGE[requestStatusTone(r.status)]
                      }`}
                    >
                      {requestStatusLabel(r.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 border-[#D5DEDD] text-[13px] font-semibold text-[#3B4759]"
                      onClick={() =>
                        navigate({
                          to: "/provider/requests/$requestId",
                          params: { requestId: r.id },
                        })
                      }
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 bg-[#6A9B9C] text-[13px] font-semibold text-white hover:bg-[#5B8788]"
                      disabled={claimMut.isPending}
                      onClick={() => claimMut.mutate(r.id)}
                    >
                      Claim
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
