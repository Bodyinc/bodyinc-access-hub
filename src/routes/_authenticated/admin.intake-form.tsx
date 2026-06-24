import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/intake-form")({
  component: () => (
    <Card>
      <CardHeader>
        <CardTitle>Intake Form</CardTitle>
        <CardDescription>
          Configure the JotForm form ID used for patient intake. Update anytime to swap the embedded form.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">Coming soon.</CardContent>
    </Card>
  ),
});