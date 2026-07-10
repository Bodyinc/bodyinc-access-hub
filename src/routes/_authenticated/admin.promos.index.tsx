import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshButton } from "@/components/admin/refresh-button";
import { listPromos, setPromoActive } from "@/lib/promos.functions";

export const Route = createFileRoute("/_authenticated/admin/promos/")({
  component: PromosListPage,
});

function discountLabel(p: any) {
  return p.discount_type === "percent"
    ? `${p.percent_off}% off`
    : `$${((p.amount_off_cents ?? 0) / 100).toFixed(2)} off`;
}

function PromosListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listPromos);
  const setActive = useServerFn(setPromoActive);
  const query = useQuery({ queryKey: ["admin-promos"], queryFn: () => list() });

  async function toggle(id: string, is_active: boolean) {
    try {
      await setActive({ data: { id, is_active } });
      qc.invalidateQueries({ queryKey: ["admin-promos"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    // FIX: Replaced layout wrappers with an expansive left-aligned canvas block matching other lists
    <div className="w-full text-left m-0 p-0 space-y-5 max-w-none">
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold text-[#2A00A2] tracking-tight">Promo Codes</h2>
          <p className="text-sm text-[#6B5AE0]/70 font-medium">
            Discounts applied at checkout. Auto-apply is the first-time welcome discount.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 items-center">
          <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
          <Button 
            onClick={() => navigate({ to: "/admin/promos/new" })}
            className="bg-[#2A00A2] hover:bg-[#1E0075] text-white font-bold rounded-xl h-10 px-4 shadow-sm transition-colors"
          >
            <Plus className="mr-1.5 h-4 w-4 stroke-[2.5]" /> Add Promo
          </Button>
        </div>
      </div>

      <Card className="w-full overflow-hidden border border-[#EAE6FA] bg-white shadow-sm rounded-2xl max-w-none m-0">
        <Table>
          <TableHeader className="bg-[#FDFDFF]">
            <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
              <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Code</TableHead>
              <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Discount</TableHead>
              <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Auto-apply</TableHead>
              <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Redeemed</TableHead>
              <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px]">Expires</TableHead>
              <TableHead className="text-[#2A00A2] font-bold h-11 text-[13px] w-20">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow className="border-b border-[#EAE6FA]/50">
                <TableCell colSpan={6} className="py-12 text-center text-[#6B5AE0]/60 font-semibold text-[14px]">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && query.data?.length === 0 && (
              <TableRow className="border-b border-[#EAE6FA]/50">
                <TableCell colSpan={6} className="py-12 text-center text-[#6B5AE0]/60 font-semibold text-[14px]">
                  No promo codes yet.
                </TableCell>
              </TableRow>
            )}
            {query.data?.map((p: any) => (
              <TableRow
                key={p.id}
                className="cursor-pointer border-b border-[#EAE6FA]/50 hover:bg-[#F5F3FF]/40 transition-colors"
                onClick={() =>
                  navigate({ to: "/admin/promos/$promoId", params: { promoId: p.id } })
                }
              >
                <TableCell className="font-bold text-[#2A00A2] text-[14px]">{p.code}</TableCell>
                <TableCell className="text-[#6B5AE0] font-semibold text-[14px]">{discountLabel(p)}</TableCell>
                <TableCell>
                  {p.auto_apply ? (
                    <Badge className="bg-[#2A00A2] text-white hover:bg-[#2A00A2] font-bold text-[12px] px-2.5 py-0.5 rounded-lg shadow-none normal-case tracking-normal border border-transparent">
                      Auto
                    </Badge>
                  ) : (
                    <span className="text-[#6B5AE0]/40 font-medium">—</span>
                  )}
                </TableCell>
                <TableCell className="text-[#2A00A2] font-semibold text-[14px]">
                  {p.times_redeemed}
                  {p.max_redemptions != null ? (
                    <span className="text-[#6B5AE0]/60 font-medium"> / {p.max_redemptions}</span>
                  ) : (
                    ""
                  )}
                </TableCell>
                <TableCell className="text-[#6B5AE0] font-medium text-[14px]">
                  {p.redeem_by ? String(p.redeem_by).slice(0, 10) : <span className="text-[#6B5AE0]/40">—</span>}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Switch 
                    checked={p.is_active} 
                    onCheckedChange={(x) => toggle(p.id, x)} 
                    className="data-[state=checked]:bg-[#4A3AFF]"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}