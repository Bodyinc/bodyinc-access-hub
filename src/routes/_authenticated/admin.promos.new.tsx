import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PromoForm, type PromoFormValues } from "@/components/admin/promo-form";
import { createPromo } from "@/lib/promos.functions";

export const Route = createFileRoute("/_authenticated/admin/promos/new")({
  component: NewPromoPage,
});

export function toPromoInput(v: PromoFormValues) {
  return {
    code: v.code,
    discount_type: v.discount_type,
    percent_off: v.discount_type === "percent" ? v.percent_off : null,
    amount_off_cents: v.discount_type === "amount" ? Math.round(v.amount_off * 100) : null,
    is_active: v.is_active,
    auto_apply: v.auto_apply,
    max_redemptions: v.max_redemptions ? Number(v.max_redemptions) : null,
    redeem_by: v.redeem_by || null,
  };
}

function NewPromoPage() {
  const navigate = useNavigate();
  const create = useServerFn(createPromo);
  const mutation = useMutation({
    mutationFn: (v: PromoFormValues) => create({ data: toPromoInput(v) }),
    onSuccess: () => {
      toast.success("Promo created");
      navigate({ to: "/admin/promos" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

return (
  <div className="mx-auto w-full min-w-0 max-w-[1440px] overflow-x-hidden">
    <PromoForm
      mode="create"
      submitting={mutation.isPending}
      onSubmit={(v) => mutation.mutate(v)}
      onCancel={() => navigate({ to: "/admin/promos" })}
    />
  </div>
);
}
