import { createFileRoute } from "@tanstack/react-router";
import { RequestReviewPanel } from "@/components/admin/request-review-panel";

export const Route = createFileRoute("/_authenticated/provider/requests/$requestId")({
  head: () => ({
    meta: [
      { title: "Order review · Body Inc Practitioner" },
      { name: "description", content: "Order review — Practitioner area of the Body Inc portal." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProviderRequestDetail,
});

function ProviderRequestDetail() {
  const { requestId } = Route.useParams();
  return (
    <RequestReviewPanel requestId={requestId} backTo="/provider/requests" clinicalOnly canClaim />
  );
}
