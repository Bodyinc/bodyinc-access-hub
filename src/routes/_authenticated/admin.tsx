import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { RoutePending } from "@/components/route-pending";
import { isBrowser } from "@/lib/is-browser";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Body Inc" },
      { name: "robots", content: "noindex" },
    ],
  }),
  pendingComponent: () => <RoutePending />,
  beforeLoad: async ({ context }) => {
    if (!isBrowser()) {
      return;
    }

    let role = (context as { role?: string }).role;

    if (!role) {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) throw redirect({ to: "/auth" });

      const cacheKey = `bi_portal_role:${data.session.user.id}`;
      try {
        role = sessionStorage.getItem(cacheKey) ?? undefined;
      } catch {}

      if (!role) {
        const { data: fetched, error: roleError } = await supabase.rpc("get_user_portal", {
          _user_id: data.session.user.id,
        });
        if (roleError) {
          console.error("[admin] get_user_portal failed:", roleError);
          throw redirect({ to: "/auth" });
        }
        role = (fetched as string) ?? undefined;
        if (role) {
          try {
            sessionStorage.setItem(cacheKey, role);
          } catch {}
        }
      }
    }

    if (role !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/categories": "Categories",
  "/admin/medication-rules": "Medication Rules",
  "/admin/questionnaires": "Questionnaires",
  "/admin/slots": "Available Slots",
  "/admin/providers": "Providers",
  "/admin/medicines": "Medicines",
  "/admin/packages": "Packages",
  "/admin/patients": "Patients",
  "/admin/intake-form": "Intake Form",
};

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cleaned = pathname.replace(/\/$/, "");
  let title = TITLES[cleaned] ?? "Admin";
  if (cleaned === "/admin/providers/new") title = "Add Provider";
  else if (/^\/admin\/providers\/[^/]+$/.test(cleaned)) title = "Edit Provider";
  else if (cleaned === "/admin/medicines/new") title = "Add Medicine";
  else if (/^\/admin\/medicines\/[^/]+$/.test(cleaned)) title = "Edit Medicine";
  else if (cleaned === "/admin/packages/new") title = "Add Package";
  else if (/^\/admin\/packages\/[^/]+$/.test(cleaned)) title = "Edit Package";
  else if (/^\/admin\/patients\/[^/]+$/.test(cleaned)) title = "Patient details";
  else if (cleaned === "/admin/categories/new") title = "Add Category";
  else if (/^\/admin\/categories\/[^/]+$/.test(cleaned)) title = "Edit Category";
  else if (cleaned === "/admin/questionnaires/new") title = "Add Questionnaire";
  else if (/^\/admin\/questionnaires\/[^/]+$/.test(cleaned)) title = "Edit Questionnaire";

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      for (const k of Object.keys(sessionStorage)) {
        if (k.startsWith("bi_portal_role:")) sessionStorage.removeItem(k);
      }
    } catch {}
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b bg-background px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="h-5 w-px bg-border" />
              <h1 className="text-sm font-semibold">{title}</h1>
            </div>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}