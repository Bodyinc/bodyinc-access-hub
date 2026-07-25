import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequestList } from "@/components/admin/request-list";

export const Route = createFileRoute("/_authenticated/provider/")({
  component: ProviderRequestsPage,
});

function ProviderRequestsPage() {
  const navigate = useNavigate();
  return (
    <RequestList
      title="My Requests"
      subtitle="Review and approve the medication orders assigned to you."
      showProvider={false}
      onOpen={(id) => navigate({ to: "/provider/$requestId", params: { requestId: id } })}
    />
  );
}
