import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequestList } from "@/components/admin/request-list";

export const Route = createFileRoute("/_authenticated/admin/requests/")({
  head: () => ({
    meta: [
      { title: "Requests · Body Inc Admin" },
      { name: "description", content: "Requests — Admin area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
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
