import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/questions")({
  component: () => (
    <Card>
      <CardHeader>
        <CardTitle>Intake Questions</CardTitle>
        <CardDescription>
          Manage the screening questions shown to first-time, unauthenticated visitors.
          Supports multiple-choice and free-text formats.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Coming soon.</CardContent>
    </Card>
  ),
});