import { createFileRoute } from "@tanstack/react-router";
import { RequestReviewPanel } from "@/components/admin/request-review-panel";

export const Route = createFileRoute("/_authenticated/admin/requests/$requestId")({
  head: () => ({
    meta: [
      { title: "Request review · Body Inc Admin" },
      { name: "description", content: "Request review — Admin area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRequestDetail,
});

function AdminRequestDetail() {
  const { requestId } = Route.useParams();
  return <RequestReviewPanel requestId={requestId} backTo="/admin/requests" canManage />;
}
