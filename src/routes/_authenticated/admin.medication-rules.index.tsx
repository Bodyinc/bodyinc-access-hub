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
    <div className="w-full p-10 bg-white min-h-screen space-y-7 antialiased">
      {/* Top Banner Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[26px] font-bold text-[#2A00A2] tracking-tight">Medication Rules</h2>
          <p className="text-[14px] text-[#6152BC] font-normal mt-1">
            Configure medication compatibility rules to ensure safe treatment recommendations during patient intake.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#230094] hover:bg-[#1A0073] text-white font-medium text-[14px] h-10 px-5 rounded-lg shadow-none transition-colors shrink-0">
              <Plus className="mr-1.5 h-4 w-4 stroke-[2.5]" /> Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-[#ECE9FF] bg-white sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#230094]">New Medication Rule</DialogTitle>
              <DialogDescription className="text-[#6152BC] font-medium">
                Pick two medicines and define their selection logic behaviors.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-3">
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-[#230094]">Medicine A</Label>
                <Select value={a} onValueChange={setA}>
                  <SelectTrigger className="h-11 rounded-xl border-[#ECE9FF] bg-white text-[#230094] font-semibold">
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#ECE9FF]">
                    {medicines.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="font-medium">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-[#230094]">Medicine B</Label>
                <Select value={b} onValueChange={setB}>
                  <SelectTrigger className="h-11 rounded-xl border-[#ECE9FF] bg-white text-[#230094] font-semibold">
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#ECE9FF]">
                    {medicines.filter((m) => m.id !== a).map((m) => (
                      <SelectItem key={m.id} value={m.id} className="font-medium">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-[#230094]">Relationship</Label>
                <Select value={type} onValueChange={(v) => setType(v as RelationshipType)}>
                  <SelectTrigger className="h-11 rounded-xl border-[#ECE9FF] bg-white text-[#230094] font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#ECE9FF]">
                    <SelectItem value="incompatible" className="font-medium">Incompatible (cannot combine)</SelectItem>
                    <SelectItem value="restricted" className="font-medium">Restricted (needs review)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold text-[#230094]">Reason (optional)</Label>
                <Textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  rows={3} 
                  className="rounded-xl border-[#ECE9FF] focus-visible:ring-[#230094] resize-none font-medium text-sm"
                  placeholder="Provide clinical justification context notes..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setOpen(false)} className="border-[#ECE9FF] text-[#6152BC] hover:bg-[#F9F8FF] font-semibold rounded-xl h-11">
                Cancel
              </Button>
              <Button 
                disabled={!a || !b || createMut.isPending} 
                onClick={() => createMut.mutate()}
                className="bg-[#230094] hover:bg-[#1A0073] text-white font-bold rounded-xl h-11 px-5"
              >
                {createMut.isPending ? "Saving…" : "Create rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Table Container */}
      <Card className="overflow-hidden border border-[#ECE9FF] bg-white shadow-none rounded-2xl">
        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader className="bg-[#FBFBFF] border-b border-[#ECE9FF]">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="h-14 font-medium text-[#351AB6] text-[14px] px-8 border-r border-[#ECE9FF]">Medicine A</TableHead>
                <TableHead className="h-14 font-medium text-[#351AB6] text-[14px] px-8 border-r border-[#ECE9FF]">Medicine B</TableHead>
                <TableHead className="h-14 font-medium text-[#351AB6] text-[14px] px-8 border-r border-[#ECE9FF]">Relationship</TableHead>
                <TableHead className="h-14 font-medium text-[#351AB6] text-[14px] px-8 border-r border-[#ECE9FF]">Reason</TableHead>
                <TableHead className="h-14 w-16 px-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rulesQ.isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center font-medium text-[#6152BC]/60">
                    Loading records…
                  </TableCell>
                </TableRow>
              )}
              {!rulesQ.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center font-medium text-[#6152BC]/60">
                    No active restriction rules compiled yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="border-b border-[#ECE9FF] last:border-none hover:bg-[#FAF9FF]/20 transition-colors">
                  {/* Medicine A: Rich, darker brand purple/blue font weight */}
                  <TableCell className="font-semibold text-[#230094] text-[14px] py-5 px-8 border-r border-[#ECE9FF]">
                    {r.medicine_a_name ?? r.medicine_a_id}
                  </TableCell>
                  
                  {/* Medicine B: Muted, lighter slate-purple font weight */}
                  <TableCell className="font-normal text-[#5140AB] text-[14px] py-5 px-8 border-r border-[#ECE9FF]">
                    {r.medicine_b_name ?? r.medicine_b_id}
                  </TableCell>
                  
                  {/* Status Badges matched with borders or fills */}
                  <TableCell className="py-5 px-8 border-r border-[#ECE9FF]">
                    {r.relationship === "incompatible" ? (
                      <Badge className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium tracking-normal normal-case border-none bg-[#F3F0FF] text-[#5527E7] shadow-none">
                        incompatible
                      </Badge>
                    ) : (
                      <Badge className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium tracking-normal normal-case border border-[#E5E1FC] bg-white text-[#5527E7] shadow-none">
                        restricted
                      </Badge>
                    )}
                  </TableCell>
                  
                  {/* Description/Reason text in clean muted layout */}
                  <TableCell className="max-w-md font-normal text-[#6152BC] text-[13px] py-5 px-8 border-r border-[#ECE9FF] leading-relaxed">
                    {r.reason ?? "—"}
                  </TableCell>
                  
                  <TableCell className="py-5 px-8 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-[#5140AB] hover:bg-[#F3F0FF] rounded-lg transition-colors"
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