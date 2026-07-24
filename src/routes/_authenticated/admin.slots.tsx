import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { adminCard, adminSectionTitle, adminSectionSubtitle } from "@/lib/admin-ui";

export const Route = createFileRoute("/_authenticated/admin/slots")({
  component: () => (
    <div className="admin-page-shell font-['DM_Sans',sans-serif]">
      <Card className={adminCard}>
        <CardHeader className="space-y-2 p-4 sm:p-6">
          <CardTitle className={adminSectionTitle}>Available Slots</CardTitle>
          <CardDescription className={adminSectionSubtitle}>
            Define consultation availability windows. Patients see them adjusted to their current location's timezone.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 text-[16px] text-[#2E00AB]/60 sm:p-6 sm:pt-0">Coming soon.</CardContent>
      </Card>
    </div>
  ),
});
