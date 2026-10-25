import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Store,
  UserCircle,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles: Role[];
  description?: string;
}

const ALL: Role[] = ["SUPERADMIN", "OWNER", "MARKETING", "API"];
const MANAGEMENT: Role[] = ["SUPERADMIN", "OWNER"];
const BILLING: Role[] = ["SUPERADMIN", "OWNER", "MARKETING"];

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    roles: MANAGEMENT,
    description: "Revenue, stock alerts and trends",
  },
  {
    label: "Bills",
    to: "/bills",
    icon: ClipboardList,
    roles: ALL,
    description: "Sales invoices and GST printing",
  },
  {
    label: "Purchases",
    to: "/purchase",
    icon: Store,
    roles: MANAGEMENT,
    description: "Purchase orders and stock intake",
  },
  {
    label: "Stock",
    to: "/stock",
    icon: Boxes,
    roles: MANAGEMENT,
    description: "Catalogue, pricing and quantities",
  },
  {
    label: "Shops",
    to: "/shops",
    icon: Building2,
    roles: MANAGEMENT,
    description: "Customers and GST details",
  },
  {
    label: "Users",
    to: "/users",
    icon: Users,
    roles: ["SUPERADMIN"],
    description: "Team members and access",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: Settings,
    roles: BILLING,
    description: "Business profile and account",
  },
];

export const UTILITY_ITEMS: NavItem[] = [
  {
    label: "My profile",
    to: "/profile",
    icon: UserCircle,
    roles: ALL,
  },
  {
    label: "About",
    to: "/settings/about",
    icon: ShieldCheck,
    roles: ALL,
  },
  {
    label: "Reports",
    to: "/settings/data-management",
    icon: BarChart3,
    roles: BILLING,
  },
];

export function navForRole(role: Role | undefined) {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function bottomNavForRole(role: Role | undefined): NavItem[] {
  if (!role) return [];
  if (role === "MARKETING") {
    return NAV_ITEMS.filter((item) => item.to === "/bills" || item.to === "/settings").concat(
      UTILITY_ITEMS.filter((item) => item.to === "/profile"),
    );
  }
  if (role === "API") {
    return NAV_ITEMS.filter((item) => item.to === "/bills").concat(
      UTILITY_ITEMS.filter((item) => item.to === "/profile"),
    );
  }
  if (role === "SUPERADMIN") {
    return NAV_ITEMS.filter((item) =>
      ["/dashboard", "/bills", "/stock", "/users", "/settings"].includes(item.to),
    );
  }
  return NAV_ITEMS.filter((item) =>
    ["/dashboard", "/bills", "/stock", "/shops", "/settings"].includes(item.to),
  );
}

export function pageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "Dashboard";
  if (pathname.startsWith("/bills/new")) return "New bill";
  if (pathname.startsWith("/bills/shop")) return "Shop bills";
  if (pathname.match(/^\/bills\/\d+\/edit/)) return "Edit bill";
  if (pathname.match(/^\/bills\/\d+/)) return "Bill details";
  if (pathname.startsWith("/bills")) return "Bills";
  if (pathname.startsWith("/purchase/new")) return "New purchase order";
  if (pathname.match(/^\/purchase\/\d+\/edit/)) return "Edit purchase order";
  if (pathname.match(/^\/purchase\/\d+/)) return "Purchase order";
  if (pathname.startsWith("/purchase")) return "Purchases";
  if (pathname.startsWith("/stock/new")) return "Add stock item";
  if (pathname.match(/^\/stock\/\d+/)) return "Edit stock item";
  if (pathname.startsWith("/stock")) return "Stock";
  if (pathname.startsWith("/shops/new")) return "Add shop";
  if (pathname.match(/^\/shops\/\d+\/edit/)) return "Edit shop";
  if (pathname.match(/^\/shops\/\d+/)) return "Shop details";
  if (pathname.startsWith("/shops")) return "Shops";
  if (pathname.startsWith("/users/new")) return "Add user";
  if (pathname.match(/^\/users\/\d+/)) return "Edit user";
  if (pathname.startsWith("/users")) return "Users";
  if (pathname.startsWith("/settings/business-profile")) return "Business profile";
  if (pathname.startsWith("/settings/about")) return "About";
  if (pathname.startsWith("/settings/data-management")) return "Data management";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/profile")) return "My profile";
  return "TotalStock";
}
