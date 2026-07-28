import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequestList } from "@/components/admin/request-list";

export const Route = createFileRoute("/_authenticated/provider/requests/")({
  head: () => ({
    meta: [
      { title: "My orders · Body Inc Practitioner" },
      { name: "description", content: "My orders — Practitioner area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProviderRequestsPage,
});

function ProviderRequestsPage() {
  const navigate = useNavigate();
  return (
    <RequestList
      title="My Requests"
      subtitle="Review and approve the medication orders assigned to you."
      showProvider={false}
      onOpen={(id) => navigate({ to: "/provider/requests/$requestId", params: { requestId: id } })}
    />
  );
}
