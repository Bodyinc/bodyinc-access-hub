import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarClock,
  Stethoscope,
  Pill,
  Package,
  Users,
  ClipboardList,
  Target,
  ShieldAlert,
  FileQuestion,
  ShoppingCart,
  FileText,
  Ticket,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; exact?: boolean };
const items: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Categories", url: "/admin/categories", icon: Target },
  { title: "Medicines", url: "/admin/medicines", icon: Pill },
  { title: "Medication Rules", url: "/admin/medication-rules", icon: ShieldAlert },
  { title: "Questionnaires", url: "/admin/questionnaires", icon: FileQuestion },
  { title: "Packages", url: "/admin/packages", icon: Package },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Promo Codes", url: "/admin/promos", icon: Ticket },
  { title: "Providers", url: "/admin/providers", icon: Stethoscope },
  { title: "Patients", url: "/admin/patients", icon: Users },
  { title: "Intake Sessions", url: "/admin/intake-sessions", icon: FileText },
  { title: "Available Slots", url: "/admin/slots", icon: CalendarClock },
  { title: "Intake Form", url: "/admin/intake-form", icon: ClipboardList },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            B
          </div>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Body Inc Admin
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
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