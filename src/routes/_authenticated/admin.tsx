import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { RoutePending } from "@/components/route-pending";
import { isBrowser } from "@/lib/is-browser";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin — Body Inc" }, { name: "robots", content: "noindex" }],
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
  "/admin/orders": "Orders",
  "/admin/intake-sessions": "Intake Sessions",
  "/admin/settings": "Settings",
};

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cleaned = pathname.replace(/\/$/, "");
  const title = TITLES[cleaned] ?? "Admin";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-white">
        <AdminSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-white">
          {/* Relative header container allowing absolute trigger overlay positioning */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-[#F4F1FE] bg-white pl-12 pr-6">
            <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              {/* Trigger positioned exactly over the sidebar vertical border boundary line */}
              <SidebarTrigger className="h-7 w-7 border border-[#E2DCFA] bg-white text-[#4A3AFF] hover:bg-[#F5F3FF] rounded-lg shadow-sm transition-transform" />
            </div>
          </header>

          <main className="flex-1 px-3 py-4 sm:px-6 sm:py-5">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
