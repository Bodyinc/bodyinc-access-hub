import { createFileRoute } from "@tanstack/react-router";
import { RequestReviewPanel } from "@/components/admin/request-review-panel";

export const Route = createFileRoute("/_authenticated/provider/requests/$requestId")({
  component: ProviderRequestDetail,
});

function ProviderRequestDetail() {
  const { requestId } = Route.useParams();
  return (
    <RequestReviewPanel requestId={requestId} backTo="/provider/requests" clinicalOnly canClaim />
  );
}