import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequestList } from "@/components/admin/request-list";

export const Route = createFileRoute("/_authenticated/admin/requests/")({
  component: AdminRequestsPage,
});

function AdminRequestsPage() {
  const navigate = useNavigate();
  return (
    <RequestList
      title="Medication Requests"
      subtitle="Approve, change, and track every medication order through fulfillment."
      showProvider
      onOpen={(id) => navigate({ to: "/admin/requests/$requestId", params: { requestId: id } })}
    />
  );
}
