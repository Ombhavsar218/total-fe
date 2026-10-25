import {
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types";
import { Modal } from "@/components/ui/modal";

interface GuideSection {
  title: string;
  body: string;
  icon: LucideIcon;
  roles: Role[];
}

const SECTIONS: GuideSection[] = [
  {
    title: "Dashboard",
    body: "See month-to-date revenue, today's sales, low-stock alerts, recent invoices and top-selling items. Use the arrows to move between months.",
    icon: BarChart3,
    roles: ["OWNER", "SUPERADMIN"],
  },
  {
    title: "Bills",
    body: "Create a bill, pick a shop, add line items and stock is deducted automatically. Print a single GST invoice, a consolidated shop invoice, or every shop for a date.",
    icon: ClipboardList,
    roles: ["OWNER", "SUPERADMIN", "MARKETING"],
  },
  {
    title: "Purchases",
    body: "Record incoming stock from suppliers. Stock increases as soon as the purchase order is created; track paid and due amounts and mark orders as received.",
    icon: Store,
    roles: ["OWNER", "SUPERADMIN"],
  },
  {
    title: "Stock",
    body: "Maintain your catalogue with price, MRP, HSN, GST rate and minimum stock. Low quantities are highlighted automatically. Open the history to audit every movement.",
    icon: Boxes,
    roles: ["OWNER", "SUPERADMIN"],
  },
  {
    title: "Shops",
    body: "Keep customer addresses, GSTIN and FSSAI numbers. These details are snapshotted onto invoices so historic bills never change.",
    icon: Building2,
    roles: ["OWNER", "SUPERADMIN"],
  },
  {
    title: "Users",
    body: "Create team accounts and assign roles. Super Admins manage access; Owners have full business access; Marketing users see only their own bills.",
    icon: Users,
    roles: ["SUPERADMIN"],
  },
  {
    title: "Business profile",
    body: "Company name, GSTIN, FSSAI and bank details appear on every printed invoice. Update them once and all future invoices use the new values.",
    icon: Settings,
    roles: ["OWNER", "SUPERADMIN"],
  },
  {
    title: "Security",
    body: "Passwords are hashed by Django. Sessions use short-lived access tokens with automatic refresh. Change your password from My profile.",
    icon: ShieldCheck,
    roles: ["OWNER", "SUPERADMIN", "MARKETING", "API"],
  },
];

export function HelpGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const sections = SECTIONS.filter((section) => user && section.roles.includes(user.role));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="TotalStock guide"
      description="A quick tour of what you can do in this workspace."
    >
      <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white">
        <p className="text-sm font-semibold">Welcome, {user?.full_name?.split(" ")[0] ?? "there"} 👋</p>
        <p className="mt-1 text-xs leading-5 text-indigo-100">
          Everything is connected: bills reduce stock, purchases add stock, and invoices snapshot
          tax at the moment of sale. Start with Bills if you are serving a customer.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.title}
            className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30"
          >
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <section.icon className="size-4" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">{section.title}</h4>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{section.body}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}
