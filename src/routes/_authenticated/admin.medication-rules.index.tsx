import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { medicinesQueryOptions } from "@/lib/query-options/medicines";
import {
  createRelationship, deleteRelationship, listRelationships,
  type RelationshipType,
} from "@/lib/medication-rules.store";
import {
  adminPageTitle,
  adminPageSubtitle,
  adminLabel,
  adminTextarea,
  adminSelect,
  adminBtnPrimary,
  adminBtnSecondary,
  adminCard,
} from "@/lib/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/medication-rules/")({
  component: MedicationRulesPage,
});

const relationshipsKey = ["medication-relationships"] as const;
const relationshipsQO = queryOptions({
  queryKey: relationshipsKey,
  queryFn: () => listRelationships(),
  staleTime: Number.POSITIVE_INFINITY,
});

function MedicationRulesPage() {
  const qc = useQueryClient();
  const rulesQ = useQuery(relationshipsQO);
  const medsQ = useQuery(medicinesQueryOptions());

  const [open, setOpen] = useState(false);
  const [a, setA] = useState<string>("");
  const [b, setB] = useState<string>("");
  const [type, setType] = useState<RelationshipType>("incompatible");
  const [reason, setReason] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      createRelationship({ medicine_a_id: a, medicine_b_id: b, relationship: type, reason: reason || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: relationshipsKey });
      toast.success("Rule created");
      setOpen(false);
      setA(""); setB(""); setReason(""); setType("incompatible");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRelationship(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: relationshipsKey });
      toast.success("Rule deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = rulesQ.data ?? [];
  const medicines = medsQ.data ?? [];

  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h2 className={adminPageTitle}>Medication Rules</h2>
          <p className={`mt-1 ${adminPageSubtitle}`}>
            Configure medication compatibility rules to ensure safe treatment recommendations during patient intake.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className={adminBtnPrimary}>
              <Plus className="mr-1.5 h-4 w-4 stroke-[2.5]" /> Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border border-[#EAE6FA] bg-white sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className={adminPageTitle}>New Medication Rule</DialogTitle>
              <DialogDescription className={adminPageSubtitle}>
                Pick two medicines and define their selection logic behaviors.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="grid gap-2">
                <Label className={adminLabel}>Medicine A</Label>
                <Select value={a} onValueChange={setA}>
                  <SelectTrigger className={adminSelect}>
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className={adminLabel}>Medicine B</Label>
                <Select value={b} onValueChange={setB}>
                  <SelectTrigger className={adminSelect}>
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicines.filter((m) => m.id !== a).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className={adminLabel}>Relationship</Label>
                <Select value={type} onValueChange={(v) => setType(v as RelationshipType)}>
                  <SelectTrigger className={adminSelect}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incompatible">Incompatible (cannot combine)</SelectItem>
                    <SelectItem value="restricted">Restricted (needs review)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className={adminLabel}>Reason (optional)</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className={adminTextarea}
                  placeholder="Provide clinical justification context notes..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setOpen(false)} className={adminBtnSecondary}>
                Cancel
              </Button>
              <Button
                disabled={!a || !b || createMut.isPending}
                onClick={() => createMut.mutate()}
                className={adminBtnPrimary}
              >
                {createMut.isPending ? "Saving…" : "Create rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className={adminCard}>
        <div className="admin-table-scroll">
          <Table className="min-w-[720px] border-collapse">
            <TableHeader className="border-b border-[#EAE6FA] bg-[#FBFBFF]">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="h-12 border-r border-[#EAE6FA] px-4 text-[13px] font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-[14px] lg:px-8">Medicine A</TableHead>
                <TableHead className="h-12 border-r border-[#EAE6FA] px-4 text-[13px] font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-[14px] lg:px-8">Medicine B</TableHead>
                <TableHead className="h-12 border-r border-[#EAE6FA] px-4 text-[13px] font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-[14px] lg:px-8">Relationship</TableHead>
                <TableHead className="h-12 border-r border-[#EAE6FA] px-4 text-[13px] font-medium text-[#2E00AB] sm:h-14 sm:px-6 sm:text-[14px] lg:px-8">Reason</TableHead>
                <TableHead className="h-12 w-14 px-2 sm:h-14 sm:px-4 lg:px-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rulesQ.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center font-medium text-[#2E00AB]/60">
                    Loading records…
                  </TableCell>
                </TableRow>
              )}
              {!rulesQ.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center font-medium text-[#2E00AB]/60">
                    No active restriction rules compiled yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="border-b border-[#EAE6FA] last:border-none hover:bg-[#FAF9FF]/20 transition-colors">
                  <TableCell className="border-r border-[#EAE6FA] px-4 py-4 text-[14px] font-semibold text-[#2E00AB] sm:px-6 sm:py-5 lg:px-8">
                    {r.medicine_a_name ?? r.medicine_a_id}
                  </TableCell>
                  <TableCell className="border-r border-[#EAE6FA] px-4 py-4 text-[14px] font-normal text-[#2E00AB]/80 sm:px-6 sm:py-5 lg:px-8">
                    {r.medicine_b_name ?? r.medicine_b_id}
                  </TableCell>
                  <TableCell className="border-r border-[#EAE6FA] px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                    {r.relationship === "incompatible" ? (
                      <Badge className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium tracking-normal normal-case border-none bg-[#F3F0FF] text-[#2E00AB] shadow-none">
                        incompatible
                      </Badge>
                    ) : (
                      <Badge className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium tracking-normal normal-case border border-[#EAE6FA] bg-white text-[#2E00AB] shadow-none">
                        restricted
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs border-r border-[#EAE6FA] px-4 py-4 text-[13px] font-normal leading-relaxed text-[#2E00AB]/80 sm:px-6 sm:py-5 lg:px-8">
                    {r.reason ?? "—"}
                  </TableCell>
                  <TableCell className="px-2 py-4 text-right sm:px-4 sm:py-5 lg:px-8">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#2E00AB]/70 hover:bg-[#F3F0FF] rounded-lg transition-colors"
                      onClick={() => deleteMut.mutate(r.id)}
                    >
                      <Trash2 className="h-4 w-4 stroke-[2.2]" />
                    </Button>
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