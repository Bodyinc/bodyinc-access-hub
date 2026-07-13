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
  "/admin/orders": "Orders",
  "/admin/intake-sessions": "Intake Sessions",
};

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cleaned = pathname.replace(/\/$/, "");
  let title = TITLES[cleaned] ?? "Admin";
  // ... Keep all your existing route title conditions exactly the same ...

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
      <div className="flex min-h-screen w-full bg-brand-surface">
        <AdminSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-brand-surface">
          <header className="sticky top-0 z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-brand-border bg-brand-surface/80 backdrop-blur px-4 sm:px-6 h-16">
            <SidebarTrigger className="h-8 w-8 border border-brand-border bg-white text-brand hover:bg-brand-soft rounded-lg shadow-sm shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight text-brand leading-tight">
                {title}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="shrink-0 text-brand-strong hover:bg-brand-soft/60 font-semibold rounded-xl"
            >
              Sign out
            </Button>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}