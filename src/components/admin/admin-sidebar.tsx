import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = { title: string; url: string; exact?: boolean };

const items: NavItem[] = [
  { title: "Dashboard", url: "/admin", exact: true },
  { title: "Categories", url: "/admin/categories" },
  { title: "Medications", url: "/admin/medicines" },
  { title: "Medication Rules", url: "/admin/medication-rules" },
  { title: "Questionnaires", url: "/admin/questionnaires" },
  { title: "Packages", url: "/admin/packages" },
  { title: "Orders", url: "/admin/orders" },
  { title: "Billing", url: "/admin/billing" },
  { title: "Referrals", url: "/admin/referrals" },
  { title: "Promo Codes", url: "/admin/promos" },
  { title: "Providers", url: "/admin/providers" },
  { title: "Patients", url: "/admin/patients" },
  { title: "Intake Sessions", url: "/admin/intake-sessions" },
  { title: "Available Slots", url: "/admin/slots" },
  { title: "Intake Form", url: "/admin/intake-form" },
  { title: "Settings", url: "/admin/settings" },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  async function handleLogout() {
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
    <Sidebar collapsible="icon" className="border-r border-[#E2DCFA] bg-[#F5F3FF]">
      {/* Top Brand Logo Container */}
      <SidebarHeader className="bg-[#F5F3FF] px-6 pt-7 pb-2 select-none">
        <div className="group-data-[collapsible=icon]:hidden">
          <img src="/logo.svg" alt="Body Inc" className="h-10 w-auto object-contain" />

          <div className="mt-5 h-px w-full bg-[#E2DCFA]" />
        </div>

        <div className="hidden group-data-[collapsible=icon]:flex h-8 w-8 items-center justify-center rounded-xl bg-[#2A00A2] text-white font-black text-sm">
          B
        </div>
      </SidebarHeader>

      {/* Main Content Area - Layout uses flex-col justify-between with overflow disabled */}
      <SidebarContent className="bg-[#F5F3FF] px-3 flex flex-col justify-between h-full pb-6 overflow-hidden">
        {/* Navigation Items Link Stack */}
        <SidebarGroup className="p-0 mt-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.map((item) => {
                const active = isActive(item.url, item.exact);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={`
      w-full h-9 px-4 rounded-xl transition-all font-semibold text-[14px] flex items-center
      ${
        active
          ? "bg-[#EAE6FA] !text-[#2A00A2] hover:bg-[#EAE6FA] hover:!text-[#2A00A2]"
          : "!text-[#4A3AFF] bg-transparent hover:bg-[#EAE6FA]/50 hover:!text-[#2A00A2] data-[active=true]:!text-[#2A00A2]"
      }
    `}
                    >
                      <Link to={item.url}>
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Actions Menu separated by Light Purple Line Divider */}
        <SidebarGroup className="p-0 mt-auto group-data-[collapsible=icon]:hidden">
          <div className="px-3 mb-3">
            <div className="w-full h-px bg-[#E2DCFA]" />
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="w-full h-9 px-4 rounded-xl transition-all font-bold text-[15px] text-[#4A3AFF] bg-transparent hover:bg-[#EAE6FA]/50 hover:text-[#2A00A2] cursor-pointer"
                >
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
