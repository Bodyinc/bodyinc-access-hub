import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
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
  "/admin/patients": "Patients",
  "/admin/intake-form": "Intake Form",
  "/admin/orders": "Orders",
  "/admin/intake-sessions": "Intake Sessions",
  "/admin/settings": "Settings",
  "/admin/billing": "Billing",
  "/admin/referrals": "Referrals",
  "/admin/promos": "Promo Codes",
};

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cleaned = pathname.replace(/\/$/, "");
  const title =
    TITLES[cleaned] ??
    (cleaned.startsWith("/admin/medicines")
      ? "Medicines"
      : cleaned.startsWith("/admin/categories")
        ? "Categories"
        : cleaned.startsWith("/admin/questionnaires")
          ? "Questionnaires"
          : "Admin");

  return (
    <SidebarProvider className="font-dm-sans flex min-h-svh w-full overflow-x-hidden bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        .font-dm-sans {
          font-family: 'DM Sans', sans-serif !important;
        }
      `}</style>

      <AdminSidebar />

      <SidebarInset className="min-w-0 flex-1 overflow-x-hidden bg-white">
        {/* Mobile/tablet top bar — sidebar becomes a sheet below lg */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#EAE6FA] bg-white px-4 py-3 lg:hidden">
          <SidebarTrigger className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-[#EAE6FA] bg-[#5B21B6] text-white shadow-sm hover:bg-[#4C1D95]" />
          <span className="truncate text-base font-semibold text-[#2E00AB]">{title}</span>
        </div>

        <main className="h-full w-full min-w-0 overflow-y-auto p-4 sm:p-6 lg:px-8 lg:pt-6 lg:pb-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
