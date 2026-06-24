import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/slots")({
  component: () => (
    <Card>
      <CardHeader>
        <CardTitle>Available Slots</CardTitle>
        <CardDescription>
          Define consultation availability windows. Patients see them adjusted to their current location's timezone.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Coming soon.</CardContent>
    </Card>
  ),
});