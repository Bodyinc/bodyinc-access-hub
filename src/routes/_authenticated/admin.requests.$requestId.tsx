import { createFileRoute } from "@tanstack/react-router";
import { RequestReviewPanel } from "@/components/admin/request-review-panel";

export const Route = createFileRoute("/_authenticated/admin/requests/$requestId")({
  component: AdminRequestDetail,
});

function AdminRequestDetail() {
  const { requestId } = Route.useParams();
  return <RequestReviewPanel requestId={requestId} backTo="/admin/requests" canManage />;
}
