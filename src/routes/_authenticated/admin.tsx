import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { isBrowser } from "@/lib/is-browser";
import { supabase } from "@/integrations/supabase/client";
import { ensureSession } from "@/lib/auth-session-cache";
import { cachePortalRole, readCachedPortalRole } from "@/lib/portal-role-cache";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  shouldReload: false,
  head: () => ({
    meta: [{ title: "Admin — Body Inc" }, { name: "robots", content: "noindex" }],
  }),
  beforeLoad: async ({ context }) => {
    if (!isBrowser()) {
      return;
    }

    let role = (context as { role?: string }).role;

    if (!role) {
      const session = await ensureSession();
      if (!session?.user) throw redirect({ to: "/auth" });

      const userId = session.user.id;
      role = readCachedPortalRole(userId) ?? undefined;

      if (!role) {
        const { data: fetched, error: roleError } = await supabase.rpc("get_user_portal", {
          _user_id: userId,
        });
        if (roleError) {
          console.error("[admin] get_user_portal failed:", roleError);
          throw redirect({ to: "/auth" });
        }
        role = (fetched as string) ?? undefined;
        cachePortalRole(userId, role);
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
  "/admin/providers": "Providers",
  "/admin/medicines": "Medicines",
  "/admin/patients": "Patients",
  "/admin/consultations": "Consultations",
  "/admin/orders": "Orders",
  "/admin/requests": "Requests",
  "/admin/intake-sessions": "Intake Sessions",
  "/admin/settings": "Settings",
  "/admin/billing": "Billing",
  "/admin/billing/refund-history": "Refund History",
  "/admin/medicine-changes": "Medicine Changes",
  "/admin/referrals": "Referrals",
  "/admin/feedback": "Feedback",
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
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#E8EEED] bg-white px-4 py-3 lg:hidden">
          <SidebarTrigger className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-[#152A51]/20 bg-[#152A51] text-white shadow-sm hover:bg-[#152A51]/90" />
          <span className="truncate text-base font-semibold text-[#152A51]">{title}</span>
        </div>

        <main className="h-full w-full min-w-0 overflow-y-auto p-4 sm:p-6 lg:px-8 lg:pt-6 lg:pb-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
