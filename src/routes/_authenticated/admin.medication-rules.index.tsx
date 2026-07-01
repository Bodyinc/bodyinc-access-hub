import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Medication rules</h2>
          <p className="text-sm text-muted-foreground">
            Configure which medicines cannot be selected together during intake.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" /> Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New medication rule</DialogTitle>
              <DialogDescription>Pick two medicines and how they relate.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Medicine A</Label>
                <Select value={a} onValueChange={setA}>
                  <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                  <SelectContent>
                    {medicines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Medicine B</Label>
                <Select value={b} onValueChange={setB}>
                  <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                  <SelectContent>
                    {medicines.filter((m) => m.id !== a).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Relationship</Label>
                <Select value={type} onValueChange={(v) => setType(v as RelationshipType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incompatible">Incompatible (cannot combine)</SelectItem>
                    <SelectItem value="restricted">Restricted (needs review)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Reason (optional)</Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={!a || !b || createMut.isPending} onClick={() => createMut.mutate()}>
                {createMut.isPending ? "Saving…" : "Create rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medicine A</TableHead>
              <TableHead>Medicine B</TableHead>
              <TableHead>Relationship</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rulesQ.isLoading && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!rulesQ.isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No rules yet.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.medicine_a_name ?? r.medicine_a_id}</TableCell>
                <TableCell className="font-medium">{r.medicine_b_name ?? r.medicine_b_id}</TableCell>
                <TableCell>
                  <Badge variant={r.relationship === "incompatible" ? "destructive" : "secondary"}>
                    {r.relationship}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-md text-sm text-muted-foreground">{r.reason ?? "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    onClick={() => deleteMut.mutate(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}