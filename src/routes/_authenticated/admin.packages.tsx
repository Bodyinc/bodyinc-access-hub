import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/packages")({
  component: () => (
    <Card>
      <CardHeader>
        <CardTitle>Packages</CardTitle>
        <CardDescription>
          Build 1-month, 2-month, N-month bundles per medicine with configurable discount percentages.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Coming soon.</CardContent>
    </Card>
  ),
});