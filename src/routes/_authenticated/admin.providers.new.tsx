import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ProviderForm } from "@/components/admin/provider-form";
import { createProvider } from "@/lib/providers.functions";

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
    <div className="mx-auto max-w-4xl">
      <ProviderForm
        mode="create"
        submitting={mutation.isPending}
        onSubmit={(values) => mutation.mutate(values)}
        onCancel={() => navigate({ to: "/admin/providers" })}
      />
    </div>
  );
}