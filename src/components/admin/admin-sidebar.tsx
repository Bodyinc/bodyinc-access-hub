import { Link, useRouterState } from "@tanstack/react-router";
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
  { title: "Promo Codes", url: "/admin/promos" },
  { title: "Providers", url: "/admin/providers" },
  { title: "Patients", url: "/admin/patients" },
  { title: "Intake Sessions", url: "/admin/intake-sessions" },
  { title: "Available Slots", url: "/admin/slots" },
  { title: "Intake Form", url: "/admin/intake-form" },
];


const footerItems = [
  { title: "Settings", url: "#" },
  { title: "Logout", url: "#" },
];
export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-brand-surface">
      {/* Top Brand Logo Container */}
      <SidebarHeader className="bg-brand-surface px-6 pt-7 pb-2 select-none">
  <div className="group-data-[collapsible=icon]:hidden">
    <img
      src="/logo.svg"
      alt="Body Inc"
      className="h-10 w-auto object-contain"
    />

    <div className="mt-5 h-px w-full bg-brand-border" />
  </div>

  <div className="hidden group-data-[collapsible=icon]:flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-brand-foreground font-black text-sm">
    B
  </div>
</SidebarHeader>

      {/* Main Content Area - Layout uses flex-col justify-between with overflow disabled */}
      <SidebarContent className="bg-brand-surface px-3 flex flex-col justify-between h-full pb-6 overflow-hidden">
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
          ? "bg-brand-soft !text-brand hover:bg-brand-soft hover:!text-brand"
          : "!text-brand-strong bg-transparent hover:bg-brand-soft/50 hover:!text-brand data-[active=true]:!text-brand"
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
            <div className="w-full h-px bg-brand-border" />
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {footerItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    className="w-full h-9 px-4 rounded-xl transition-all font-bold text-[15px] text-brand-strong bg-transparent hover:bg-brand-soft/50 hover:text-brand"
                  >
                    <Link to={item.url}>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}