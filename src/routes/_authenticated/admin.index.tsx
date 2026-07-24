import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <div className="admin-page-shell space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-[24px] font-semibold sm:text-2xl">Welcome, Administrator</h2>
        <p className="text-muted-foreground text-sm sm:text-base">Overview of platform activity will appear here.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Patients", "Providers", "Consultations", "Orders"].map((label) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">—</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Coming soon</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}