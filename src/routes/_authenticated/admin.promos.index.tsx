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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Promo Codes</h2>
          <p className="text-sm text-muted-foreground">
            Discounts applied at checkout. Auto-apply is the first-time welcome discount.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <RefreshButton onClick={() => query.refetch()} loading={query.isFetching} />
          <Button onClick={() => navigate({ to: "/admin/promos/new" })}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Promo
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Auto-apply</TableHead>
              <TableHead>Redeemed</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!query.isLoading && query.data?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No promo codes yet.
                </TableCell>
              </TableRow>
            )}
            {query.data?.map((p: any) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({ to: "/admin/promos/$promoId", params: { promoId: p.id } })
                }
              >
                <TableCell className="font-medium">{p.code}</TableCell>
                <TableCell>{discountLabel(p)}</TableCell>
                <TableCell>{p.auto_apply ? <Badge>Auto</Badge> : "—"}</TableCell>
                <TableCell>
                  {p.times_redeemed}
                  {p.max_redemptions != null ? ` / ${p.max_redemptions}` : ""}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.redeem_by ? String(p.redeem_by).slice(0, 10) : "—"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Switch checked={p.is_active} onCheckedChange={(x) => toggle(p.id, x)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
