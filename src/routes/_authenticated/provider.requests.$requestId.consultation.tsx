import { createFileRoute } from "@tanstack/react-router";
import { ConsultationRoomPage } from "@/components/consultation/consultation-room-page";

export const Route = createFileRoute(
  "/_authenticated/provider/requests/$requestId/consultation",
)({
  head: () => ({
    meta: [
      { title: "Live consultation · Body Inc Practitioner" },
      {
        name: "description",
        content: "Live audio and video consultation — Practitioner area.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProviderConsultationRoute,
});

function ProviderConsultationRoute() {
  const { requestId } = Route.useParams();
  return (
    <ConsultationRoomPage
      key={requestId}
      requestId={requestId}
      backTo={`/provider/requests/${requestId}`}
      clinicalOnly
    />
  );
}
