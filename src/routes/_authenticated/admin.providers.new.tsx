import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/admin/form-skeleton";
import { createProvider } from "@/lib/providers.functions";

const ProviderForm = lazy(() =>
  import("@/components/admin/provider-form").then((m) => ({ default: m.ProviderForm })),
);

export const Route = createFileRoute("/_authenticated/admin/providers/new")({
  component: NewProviderPage,
});

function NewProviderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createProvider);

  const mutation = useMutation({
    mutationFn: (values: any) =>
      create({
        data: {
          ...values,
          redirect_to: `${window.location.origin}/reset-password`,
        },
      }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      toast.success(res.invite_sent ? "Provider created — invite sent" : "Provider created");
      navigate({ to: "/admin/providers" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-0xl">
      <Suspense fallback={<FormSkeleton />}>
        <ProviderForm
          mode="create"
          submitting={mutation.isPending}
          onSubmit={(values) => mutation.mutate(values)}
          onCancel={() => navigate({ to: "/admin/providers" })}
        />
      </Suspense>
    </div>
  );
}