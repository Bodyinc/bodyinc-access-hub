import { createFileRoute } from "@tanstack/react-router";
import { ConsultationRoomPage } from "@/components/consultation/consultation-room-page";

export const Route = createFileRoute(
  "/_authenticated/admin/requests/$requestId/consultation",
)({
  head: () => ({
    meta: [
      { title: "Live consultation · Body Inc Admin" },
      {
        name: "description",
        content: "Live audio and video consultation — Admin area.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminConsultationRoute,
});

function AdminConsultationRoute() {
  const { requestId } = Route.useParams();
  return (
    <ConsultationRoomPage
      key={requestId}
      requestId={requestId}
      backTo={`/admin/requests/${requestId}`}
      clinicalOnly={false}
      canManage
    />
  );
}
