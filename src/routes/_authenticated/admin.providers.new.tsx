import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/admin/form-skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { createProvider } from "@/lib/providers.functions";
import { toastError } from "@/lib/toast-message";

const ProviderForm = lazy(() =>
  import("@/components/admin/provider-form").then((m) => ({ default: m.ProviderForm })),
);

export const Route = createFileRoute("/_authenticated/admin/providers/new")({
  head: () => ({
    meta: [
      { title: "New practitioner · Body Inc Admin" },
      { name: "description", content: "New practitioner — Admin area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
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
    onError: (e: Error) => toast.error(toastError(e)),
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1440px] overflow-x-hidden">
      <PageHeader
        backTo="/admin/providers"
        backLabel="providers"
        crumbs={[{ label: "Providers", to: "/admin/providers" }]}
        title="New practitioner"
      />
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
