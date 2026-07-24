import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { adminPageTitle, adminPageSubtitle, adminBtnPrimary } from "@/lib/admin-ui";

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
    <div className="admin-page-shell space-y-5 sm:space-y-6 font-['DM_Sans',sans-serif]">
      <div className="admin-page-header">
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <h2 className={adminPageTitle}>Promo Codes</h2>
          <p className={adminPageSubtitle}>
            Discounts applied at checkout. Auto-apply is the first-time welcome discount.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
          <Button
            onClick={() => navigate({ to: "/admin/promos/new" })}
            className={adminBtnPrimary}
          >
            <Plus className="mr-1.5 h-4 w-4 stroke-[2.5]" /> Add Promo
          </Button>
        </div>
      </div>

      <div className="admin-table-wrap m-0 w-full">
        <div className="admin-table-scroll">
        <Table className="min-w-[720px]">
          <TableHeader className="bg-[#FDFDFF]">
            <TableRow className="border-b border-[#EAE6FA] hover:bg-transparent">
              <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">Code</TableHead>
              <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">Discount</TableHead>
              <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">Auto-apply</TableHead>
              <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">Redeemed</TableHead>
              <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px]">Expires</TableHead>
              <TableHead className="text-[#2E00AB] font-semibold h-11 text-[13px] w-20">Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow className="border-b border-[#EAE6FA]">
                <TableCell colSpan={6} className="py-12 text-center text-[#2E00AB]/60 font-medium text-[14px]">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && query.data?.length === 0 && (
              <TableRow className="border-b border-[#EAE6FA]">
                <TableCell colSpan={6} className="py-12 text-center text-[#2E00AB]/60 font-medium text-[14px]">
                  No promo codes yet.
                </TableCell>
              </TableRow>
            )}
            {query.data?.map((p: any) => (
              <TableRow
                key={p.id}
                className="cursor-pointer border-b border-[#EAE6FA] hover:bg-[#F5F3FF]/40 transition-colors"
                onClick={() =>
                  navigate({ to: "/admin/promos/$promoId", params: { promoId: p.id } })
                }
              >
                <TableCell className="font-semibold text-[#2E00AB] text-[14px]">{p.code}</TableCell>
                <TableCell className="text-[#2E00AB]/70 font-medium text-[14px]">{discountLabel(p)}</TableCell>
                <TableCell>
                  {p.auto_apply ? (
                    <Badge className="bg-[#2E00AB] text-white hover:bg-[#2E00AB] font-semibold text-[12px] px-2.5 py-0.5 rounded-lg shadow-none normal-case tracking-normal border border-transparent">
                      Auto
                    </Badge>
                  ) : (
                    <span className="text-[#2E00AB]/40 font-medium">—</span>
                  )}
                </TableCell>
                <TableCell className="text-[#2E00AB] font-medium text-[14px]">
                  {p.times_redeemed}
                  {p.max_redemptions != null ? (
                    <span className="text-[#2E00AB]/60 font-medium"> / {p.max_redemptions}</span>
                  ) : (
                    ""
                  )}
                </TableCell>
                <TableCell className="text-[#2E00AB]/70 font-medium text-[14px]">
                  {p.redeem_by ? String(p.redeem_by).slice(0, 10) : <span className="text-[#2E00AB]/40">—</span>}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(x) => toggle(p.id, x)}
                    
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}