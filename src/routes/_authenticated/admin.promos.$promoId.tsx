import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PromoForm, type PromoFormValues } from "@/components/admin/promo-form";
import { getPromo, updatePromo } from "@/lib/promos.functions";
import { toPromoInput } from "./admin.promos.new";

export const Route = createFileRoute("/_authenticated/admin/promos/$promoId")({
  component: EditPromoPage,
});

function toFormValues(p: any): PromoFormValues {
  return {
    code: p.code,
    discount_type: p.discount_type === "percent" ? "percent" : "amount",
    percent_off: p.percent_off ?? 10,
    amount_off: p.amount_off_cents != null ? Number(p.amount_off_cents) / 100 : 20,
    is_active: p.is_active,
    auto_apply: p.auto_apply,
    max_redemptions: p.max_redemptions != null ? String(p.max_redemptions) : "",
    redeem_by: p.redeem_by ? String(p.redeem_by).slice(0, 10) : "",
  };
}

function EditPromoPage() {
  const { promoId } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getPromo);
  const update = useServerFn(updatePromo);

  const q = useQuery({
    queryKey: ["admin-promo", promoId],
    queryFn: () => get({ data: { id: promoId } }),
  });

  const mutation = useMutation({
    mutationFn: (v: PromoFormValues) => update({ data: { id: promoId, ...toPromoInput(v) } }),
    onSuccess: () => {
      toast.success("Promo updated");
      navigate({ to: "/admin/promos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (q.isError || !q.data) {
    return <p className="text-sm text-destructive">{(q.error as Error)?.message ?? "Not found"}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PromoForm
        mode="edit"
        defaultValues={toFormValues(q.data)}
        submitting={mutation.isPending}
        onSubmit={(v) => mutation.mutate(v)}
        onCancel={() => navigate({ to: "/admin/promos" })}
      />
    </div>
  );
}
