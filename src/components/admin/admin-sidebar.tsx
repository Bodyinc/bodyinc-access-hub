import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clearCachedPortalRoles } from "@/lib/portal-role-cache";
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
  { title: "Requests", url: "/admin/requests" },
  { title: "Orders", url: "/admin/orders" },
  { title: "Billing", url: "/admin/billing" },
  { title: "Refund History", url: "/admin/billing/refund-history" },
  { title: "Medicine Changes", url: "/admin/medicine-changes" },
  { title: "Referrals", url: "/admin/referrals" },
  { title: "Promo Codes", url: "/admin/promos" },
  { title: "Providers", url: "/admin/providers" },
  { title: "Patients", url: "/admin/patients" },
  { title: "Intake Sessions", url: "/admin/intake-sessions" },
];

const navItemBase =
  "flex h-8 w-full items-center rounded-[8px] px-3 text-[14px] font-medium !text-[#152A51] transition-all";

const navActive =
  "!bg-[#F2F7F6] data-[active=true]:!bg-[#F2F7F6] hover:!bg-[#F2F7F6] data-[active=true]:hover:!bg-[#F2F7F6]";

const navIdle = "bg-transparent hover:!bg-[#F2F7F6]/70";

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  async function handleLogout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    clearCachedPortalRoles();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="font-['DM_Sans'] border-[#E8EEED] bg-white shadow-none [&_[data-sidebar=sidebar]]:bg-white"
    >
      {/* Desktop collapse toggle */}
      <div className="absolute -right-2.5 top-6 z-50 hidden md:block">
        <SidebarTrigger className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[4px] border-0 bg-[#152A51] p-5 text-white shadow-md transition-all hover:bg-[#152A51]/90">
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="2"
              y="2"
              width="16"
              height="16"
              rx="2"
              stroke="white"
              strokeWidth="2"
              fill="none"
            />
            <line x1="8" y1="2" x2="8" y2="18" stroke="white" strokeWidth="2" />
          </svg>
        </SidebarTrigger>
      </div>

      <SidebarHeader className="flex-shrink-0 select-none bg-transparent px-0 pb-1 pt-5">
        <div className="flex flex-col items-start px-4 group-data-[collapsible=icon]:hidden">
          <img
            src="/logo.svg"
            alt="Body Inc"
            className="h-auto max-h-[60px] w-full max-w-[160px] object-contain sm:max-w-[190px]"
          />
        </div>
        {/* Full-width rule under logo (Figma) */}
        <div className="mt-3 h-px w-full bg-[#E8EEED] group-data-[collapsible=icon]:hidden" />

        <div className="mx-auto hidden h-8 w-8 items-center justify-center rounded-md bg-[#152A51] text-sm font-black text-white group-data-[collapsible=icon]:flex">
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
                      className={`${navItemBase} ${active ? navActive : navIdle}`}
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

        {/* No divider above Settings — matches Figma */}
        <SidebarGroup className="mt-auto flex-shrink-0 p-0 group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/admin/settings")}
                  className={`${navItemBase} ${
                    isActive("/admin/settings") ? navActive : navIdle
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
                  className={`${navItemBase} cursor-pointer ${navIdle}`}
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
