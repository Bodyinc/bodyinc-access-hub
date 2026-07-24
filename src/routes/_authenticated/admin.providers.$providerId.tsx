import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/admin/form-skeleton";
import { getProvider, updateProvider } from "@/lib/providers.functions";

const ProviderForm = lazy(() =>
  import("@/components/admin/provider-form").then((m) => ({ default: m.ProviderForm })),
);

export const Route = createFileRoute("/_authenticated/admin/providers/$providerId")({
  component: EditProviderPage,
});

function EditProviderPage() {
  const { providerId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getProvider);
  const update = useServerFn(updateProvider);

  const query = useQuery({
    queryKey: ["providers", providerId],
    queryFn: () => get({ data: { id: providerId } }),
  });

  const mutation = useMutation({
    mutationFn: (values: any) => update({ data: { id: providerId, ...values } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Provider updated");
      navigate({ to: "/admin/providers" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (query.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading provider…</div>;
  }
  if (query.isError || !query.data) {
    return (
      <div className="text-sm text-destructive">
        {(query.error as Error)?.message ?? "Provider not found"}
      </div>
    );
  }

  const d = query.data as any;
  return (
    <Suspense fallback={<FormSkeleton />}>
      <ProviderForm
        mode="edit"
        submitting={mutation.isPending}
        defaultValues={{
          email: d.email,
          full_name: d.full_name,
          phone: d.phone ?? "",
          avatar_url: d.avatar_url ?? "",
          bio: d.bio ?? "",
          credentials: d.credentials ?? undefined,
          specialty: d.specialty ?? "",
          npi: d.npi ?? "",
          dea: d.dea ?? "",
          license_number: d.license_number ?? "",
          license_states: d.license_states ?? [],
          years_experience: d.years_experience ?? undefined,
          languages: d.languages ?? [],
          consultation_types: d.consultation_types ?? [],
          practice_states: d.practice_states ?? [],
          address_line1: d.address_line1 ?? "",
          address_line2: d.address_line2 ?? "",
          city: d.city ?? "",
          state: d.state ?? undefined,
          zip: d.zip ?? "",
          country: d.country ?? "US",
          is_active: d.is_active,
        }}
        onSubmit={(values) => mutation.mutate(values)}
        onCancel={() => navigate({ to: "/admin/providers" })}
      />
    </Suspense>
  );
}