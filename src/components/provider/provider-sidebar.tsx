import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/lib/use-notifications";
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

const items = [
  { title: "Dashboard", url: "/provider", exact: true },
  { title: "My Requests", url: "/provider/requests" },
  { title: "Unassigned queue", url: "/provider/queue" },
  { title: "Notifications", url: "/provider/notifications", badge: true },
  { title: "My Patients", url: "/provider/patients" },
  { title: "My Profile", url: "/provider/profile" },
];

export function ProviderSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { unread } = useNotifications();

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
      variant="floating"
      className="font-['DM_Sans'] border-0 bg-transparent shadow-none [&_[data-sidebar=sidebar]]:border [&_[data-sidebar=sidebar]]:border-[#D5DEDD] [&_[data-sidebar=sidebar]]:bg-[#E8EEED] [&_[data-sidebar=sidebar]]:shadow-sm"
    >
      <div className="absolute -right-2.5 top-6 z-50 hidden md:block">
        <SidebarTrigger className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[4px] border-0 bg-[#5B8788] p-5 text-white shadow-md transition-all hover:bg-[#5B8788]">
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

      <SidebarHeader className="flex-shrink-0 select-none bg-transparent px-4 pb-1 pt-5">
        <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
          <img
            src="/logo.svg"
            alt="Body Inc"
            className="h-auto max-h-[60px] w-full max-w-[160px] object-contain sm:max-w-[190px]"
          />
          <div className="mt-3 h-px w-full bg-[#D5DEDD]" />
        </div>
        <div className="hidden h-8 w-8 items-center justify-center rounded-md bg-[#6A9B9C] text-sm font-black text-white group-data-[collapsible=icon]:flex">
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
                      className={`flex h-8 w-full items-center rounded-[6px] px-3 text-[14px] font-medium text-[#3B4759] transition-all ${
                        active
                          ? "bg-[#D5DEDD] !text-[#3B4759]"
                          : "bg-transparent hover:bg-[#D5DEDD]/80 !text-[#3B4759]"
                      }`}
                    >
                      <Link to={item.url}>
                        <span className="truncate">{item.title}</span>
                        {item.badge && unread > 0 && (
                          <>
                            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B8684B] px-1.5 text-[11px] font-semibold text-white group-data-[collapsible=icon]:hidden">
                              {unread > 9 ? "9+" : unread}
                            </span>
                            <span className="hidden h-2 w-2 shrink-0 rounded-full bg-[#B8684B] group-data-[collapsible=icon]:block" />
                          </>
                        )}
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
            <div className="h-px w-full bg-[#D5DEDD]" />
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  className="flex h-8 w-full cursor-pointer items-center rounded-[6px] px-3 text-[14px] font-medium text-[#3B4759] transition-all hover:bg-[#D5DEDD]/50 !text-[#3B4759]"
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
