import type { Role } from "@/types";

export const MANAGEMENT_ROLES: Role[] = ["OWNER", "SUPERADMIN"];
export const BILLING_ROLES: Role[] = ["OWNER", "SUPERADMIN", "MARKETING"];
export const ALL_UI_ROLES: Role[] = ["OWNER", "SUPERADMIN", "MARKETING", "API"];

export function isManagement(role: Role | undefined | null) {
  return !!role && MANAGEMENT_ROLES.includes(role);
}

export function canManageBills(role: Role | undefined | null) {
  return !!role && BILLING_ROLES.includes(role);
}

export function landingPath(role: Role | undefined | null) {
  if (!role) return "/login";
  if (role === "MARKETING" || role === "API") return "/bills";
  return "/dashboard";
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: "Super Admin",
  OWNER: "Owner",
  MARKETING: "Marketing",
  API: "API",
};

export const ROLE_TONES: Record<Role, string> = {
  SUPERADMIN: "bg-violet-50 text-violet-700 ring-violet-200",
  OWNER: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  MARKETING: "bg-sky-50 text-sky-700 ring-sky-200",
  API: "bg-slate-100 text-slate-600 ring-slate-200",
};
