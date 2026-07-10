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
    <div className="space-y-6 max-w-[1200px] w-full mx-auto">
      {/* Top Banner Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[#2A00A2]">Medication Rules</h2>
          <p className="text-[14px] text-[#6B5AE0]/70 font-medium mt-1">
            Configure cross-incompatibilities and rules for customer selection paths.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2A00A2] hover:bg-[#1E0075] text-white font-bold h-11 px-5 rounded-xl shadow-sm transition-colors shrink-0">
              <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-[#EAE6FA] bg-white sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#2A00A2]">New Medication Rule</DialogTitle>
              <DialogDescription className="text-[#6B5AE0]/70 font-medium">
                Pick two medicines and define their selection logic behaviors.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-[#2A00A2]">Medicine A</Label>
                <Select value={a} onValueChange={setA}>
                  <SelectTrigger className="h-11 rounded-xl border-[#EAE6FA] bg-white text-[#2A00A2] font-semibold">
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#EAE6FA]">
                    {medicines.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="font-medium">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-[#2A00A2]">Medicine B</Label>
                <Select value={b} onValueChange={setB}>
                  <SelectTrigger className="h-11 rounded-xl border-[#EAE6FA] bg-white text-[#2A00A2] font-semibold">
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#EAE6FA]">
                    {medicines.filter((m) => m.id !== a).map((m) => (
                      <SelectItem key={m.id} value={m.id} className="font-medium">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-[#2A00A2]">Relationship</Label>
                <Select value={type} onValueChange={(v) => setType(v as RelationshipType)}>
                  <SelectTrigger className="h-11 rounded-xl border-[#EAE6FA] bg-white text-[#2A00A2] font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#EAE6FA]">
                    <SelectItem value="incompatible" className="font-medium">Incompatible (cannot combine)</SelectItem>
                    <SelectItem value="restricted" className="font-medium">Restricted (needs review)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-[#2A00A2]">Reason (optional)</Label>
                <Textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  rows={3} 
                  className="rounded-xl border-[#EAE6FA] focus-visible:ring-[#2A00A2] resize-none font-medium text-sm"
                  placeholder="Provide clinical justification context notes..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setOpen(false)} className="border-[#EAE6FA] text-[#6B5AE0] hover:bg-[#F9F8FF] font-semibold rounded-xl h-11">
                Cancel
              </Button>
              <Button 
                disabled={!a || !b || createMut.isPending} 
                onClick={() => createMut.mutate()}
                className="bg-[#2A00A2] hover:bg-[#1E0075] text-white font-bold rounded-xl h-11 px-5"
              >
                {createMut.isPending ? "Saving…" : "Create rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Table Interface Grid Panel */}
      <Card className="overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#FBFBFF] border-b border-[#EAE6FA]">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="h-12 font-bold text-[#2A00A2] text-[14px] px-6">Medicine A</TableHead>
                <TableHead className="h-12 font-bold text-[#2A00A2] text-[14px] px-6">Medicine B</TableHead>
                <TableHead className="h-12 font-bold text-[#2A00A2] text-[14px] px-6">Relationship</TableHead>
                <TableHead className="h-12 font-bold text-[#2A00A2] text-[14px] px-6">Reason</TableHead>
                <TableHead className="h-12 w-16 px-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rulesQ.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center font-semibold text-[#6B5AE0]/60">
                    Loading records…
                  </TableCell>
                </TableRow>
              )}
              {!rulesQ.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center font-semibold text-[#6B5AE0]/60">
                    No active restriction rules compiled yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="border-b border-[#F4F1FE]/80 last:border-none hover:bg-[#FDFDFF]/50 transition-colors">
                  <TableCell className="font-bold text-[#2A00A2] text-[14px] py-4 px-6">
                    {r.medicine_a_name ?? r.medicine_a_id}
                  </TableCell>
                  <TableCell className="font-bold text-[#2A00A2] text-[14px] py-4 px-6">
                    {r.medicine_b_name ?? r.medicine_b_id}
                  </TableCell>
                  <TableCell className="py-4 px-6">
  <Badge 
    className={`
      px-3 py-1 rounded-xl text-[14px] font-semibold tracking-normal normal-case border shadow-none
      ${r.relationship === "incompatible" 
        ? "bg-[#F5F3FF] text-[#4A3AFF] border-transparent" 
        : "bg-white text-[#4A3AFF] border-[#E2DCFA]"
      }
    `}
  >
    {r.relationship}
  </Badge>
</TableCell>
                  <TableCell className="max-w-md font-medium text-[#6B5AE0]/80 text-[14px] py-4 px-6 truncate">
                    {r.reason ?? "—"}
                  </TableCell>
                  <TableCell className="py-4 px-6 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-[#FF4D6D] hover:bg-[#FFE8EC] hover:text-[#FF4D6D] rounded-xl transition-colors"
                      onClick={() => deleteMut.mutate(r.id)}
                    >
                      <Trash2 className="h-[18px] w-[18px]" />
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