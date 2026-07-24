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
  SidebarTrigger,
} from "@/components/ui/sidebar";

type NavItem = { title: string; url: string; exact?: boolean };

const items: NavItem[] = [
  { title: "Dashboard", url: "/admin", exact: true },
  { title: "Categories", url: "/admin/categories" },
  { title: "Medications", url: "/admin/medicines" },
  { title: "Medication Rules", url: "/admin/medication-rules" },
  { title: "Questionnaires", url: "/admin/questionnaires" },
  { title: "Orders", url: "/admin/orders" },
  { title: "Billing", url: "/admin/billing" },
  { title: "Referrals", url: "/admin/referrals" },
  { title: "Promo Codes", url: "/admin/promos" },
  { title: "Providers", url: "/admin/providers" },
  { title: "Patients", url: "/admin/patients" },
  { title: "Intake Sessions", url: "/admin/intake-sessions" },
  { title: "Available Slots", url: "/admin/slots" },
  { title: "Intake Form", url: "/admin/intake-form" },
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
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="font-['DM_Sans'] border-0 bg-transparent shadow-none [&_[data-sidebar=sidebar]]: [&_[data-sidebar=sidebar]]:border [&_[data-sidebar=sidebar]]:border-[#E2DCFA] [&_[data-sidebar=sidebar]]:bg-[#F5F3FF] [&_[data-sidebar=sidebar]]:shadow-sm"
    >
      {/* Desktop collapse toggle — half over the card edge */}
      <div className="absolute -right-2.5 top-6 z-50 hidden md:block">
        <SidebarTrigger className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[4px] border-0 bg-[#5833BC] p-5 text-white shadow-md transition-all hover:bg-[#4C1D95]">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="16" height="16" rx="2" stroke="white" strokeWidth="2" fill="none" />
            <line x1="8" y1="2" x2="8" y2="18" stroke="white" strokeWidth="2" />
          </svg>
        </SidebarTrigger>
      </div>

      <SidebarHeader className="flex-shrink-0 select-none bg-transparent px-4 pb-1 pt-5">
        <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
          <img
            src="/logo.svg"
            alt="Body Inc"
            className="h-auto max-h-[60px] w-full max-w-[160px] object-contain sm:max-w-[190px]"
          />
          <div className="mt-3 h-px w-full bg-[#E2DCFA]" />
        </div>

        <div className="hidden h-8 w-8 items-center justify-center rounded-md bg-[#2E00AB] text-sm font-black text-white group-data-[collapsible=icon]:flex">
          B
        </div>
      </SidebarHeader>

      <SidebarContent className="flex flex-1 flex-col justify-between overflow-y-auto bg-transparent px-2 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <SidebarGroup className="p-0">
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
                      className={`flex h-8 w-full items-center rounded-[6px] px-3 text-[14px] font-medium text-[#2E00AB] transition-all ${
                        active
                          ? "bg-[#EAE6FA] !text-[#2E00AB]"
                          : "bg-transparent hover:bg-[#EAE6FA]/80 !text-[#2E00AB]"
                      }`}
                    >
                      <Link to={item.url}>
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto flex-shrink-0 p-0 group-data-[collapsible=icon]:hidden">
          <div className="my-2 px-3">
            <div className="h-px w-full bg-[#E2DCFA]" />
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/admin/settings")}
                  className={`flex h-8 w-full items-center rounded-[6px] px-3 text-[14px] font-medium text-[#2E00AB] transition-all ${
                    isActive("/admin/settings")
                      ? "bg-[#EAE6FA] !text-[#2E00AB]"
                      : "bg-transparent hover:bg-[#EAE6FA]/50 !text-[#2E00AB]"
                  }`}
                >
                  <Link to="/admin/settings">
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="flex h-8 w-full cursor-pointer items-center rounded-[6px] px-3 text-[14px] font-medium text-[#2E00AB] transition-all hover:bg-[#EAE6FA]/50 !text-[#2E00AB]"
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
