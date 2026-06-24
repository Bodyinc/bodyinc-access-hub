import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/medicines")({
  component: () => (
    <Card>
      <CardHeader>
        <CardTitle>Medicines</CardTitle>
        <CardDescription>
          SKU catalog with dynamic categories, image, price, tag, rich-text description, and a "requires consultation" flag.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Coming soon.</CardContent>
    </Card>
  ),
});