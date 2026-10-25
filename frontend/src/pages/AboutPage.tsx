import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  Fingerprint,
  Gauge,
  IndianRupee,
  Layers,
  LockKeyhole,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: ClipboardList,
    title: "GST billing that adds up",
    text: "Line-level tax slabs, taxable value, CGST and SGST halves, invoice round-off and amount in words on every bill.",
    tone: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: Boxes,
    title: "Stock moves with the books",
    text: "Bills deduct stock, purchase orders add it back, and manual edits are logged. Every change runs in a transaction.",
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Printer,
    title: "A4 invoices, print ready",
    text: "Print a single tax invoice, a consolidated shop invoice or the whole day’s pack with one click.",
    tone: "bg-sky-50 text-sky-600",
  },
  {
    icon: BarChart3,
    title: "Owner dashboard",
    text: "Month revenue, daily trends, low-stock alerts, top sellers and recent invoices in one view.",
    tone: "bg-violet-50 text-violet-600",
  },
  {
    icon: Fingerprint,
    title: "Frozen snapshots",
    text: "Customer name, GSTIN, address and tax details are copied onto each bill, so history never changes.",
    tone: "bg-amber-50 text-amber-600",
  },
  {
    icon: ShieldCheck,
    title: "Roles that fit the job",
    text: "Owners run the business, marketing sees only their own bills, API accounts are read-only, super admins manage the team.",
    tone: "bg-rose-50 text-rose-600",
  },
];

const ROLE_MATRIX: {
  role: Role;
  scope: string;
  can: string[];
  cannot: string[];
}[] = [
  {
    role: "OWNER",
    scope: "Full business access",
    can: ["Dashboard", "Bills", "Purchases", "Stock", "Shops", "Business profile"],
    cannot: ["Manage users"],
  },
  {
    role: "SUPERADMIN",
    scope: "Full access + team control",
    can: ["Everything Owners can do", "Create users", "Reset roles", "Deactivate accounts"],
    cannot: [],
  },
  {
    role: "MARKETING",
    scope: "Own bills only",
    can: ["Create bills", "View and print own bills", "Export own bills"],
    cannot: ["See other users’ bills", "Stock, shops or purchases"],
  },
  {
    role: "API",
    scope: "Read-only reporting",
    can: ["List and read bills", "Print bills", "Export bill data"],
    cannot: ["Create or edit anything", "Access stock, shops or purchases"],
  },
];

const PRINCIPLES = [
  {
    icon: Database,
    title: "One source of truth",
    text: "Bill lines store the price, tax and stock snapshot used at sale time. Re-pricing a product never rewrites an old invoice.",
  },
  {
    icon: RefreshCw,
    title: "Safe to retry",
    text: "Creating, editing and deleting bills or purchase orders happens inside database transactions with row locks on stock.",
  },
  {
    icon: LockKeyhole,
    title: "Permissions at the API",
    text: "Every endpoint re-checks the signed-in role and record ownership. The UI simply mirrors those rules.",
  },
  {
    icon: IndianRupee,
    title: "Money stays exact",
    text: "Amounts use fixed-precision decimals and are rounded once, at the invoice total, then recorded as round-off.",
  },
];

const STACK = [
  { name: "Django 5", detail: "REST API & ORM" },
  { name: "Django REST Framework", detail: "Endpoints & permissions" },
  { name: "SimpleJWT", detail: "Access + refresh tokens" },
  { name: "PostgreSQL / SQLite", detail: "Production / local data" },
  { name: "React 19", detail: "Application shell" },
  { name: "TypeScript", detail: "Typed API contracts" },
  { name: "Tailwind CSS v4", detail: "Design system" },
  { name: "Recharts", detail: "Dashboard analytics" },
];

export function AboutPage() {
  const { user } = useAuth();
  const role = user?.role;
  const displayRole = role ? ROLE_LABELS[role] : "Team member";

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="About TotalStock"
        subtitle="An inventory and distributor workspace built around GST billing, live stock and clear roles."
        backTo="/settings"
        backLabel="Settings"
        actions={
          <Link to="/bills">
            <Button>
              Open bills <ArrowRight className="size-4" />
            </Button>
          </Link>
        }
      />

      <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-9">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-slate-950 to-violet-950" />
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="absolute -left-24 top-0 size-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 size-96 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-indigo-100 ring-1 ring-white/15">
              <Sparkles className="size-3" /> TotalStock v1.0
            </span>
            <h1 className="mt-4 max-w-xl text-2xl font-bold leading-tight tracking-tight text-balance sm:text-3xl">
              Every bill, every item, every rupee — connected.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100/80">
              TotalStock keeps sales, purchases and stock in step. When a bill is raised the stock
              goes down; when a purchase arrives it goes back up. Invoices freeze the customer and
              tax details at the moment of sale, so your records stay audit-friendly.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["GST invoices", "Stock ledger", "Role-based access", "CSV exports"].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-50 ring-1 ring-white/15"
                >
                  <CheckCircle2 className="size-3 text-indigo-300" /> {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Modules", value: "7", icon: Layers },
              { label: "Roles", value: "4", icon: Users },
              { label: "Invoice size", value: "A4", icon: FileText },
              { label: "Session", value: "JWT", icon: ShieldCheck },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm"
              >
                <stat.icon className="size-4 text-indigo-300" />
                <p className="mt-2 text-xl font-bold">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-indigo-200/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title} className="p-5 transition hover:-translate-y-0.5 hover:shadow-float">
            <div className={cn("grid size-10 place-items-center rounded-xl", feature.tone)}>
              <feature.icon className="size-5" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">{feature.title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{feature.text}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Who can do what"
              description={`You are signed in as ${displayRole}`}
              action={<Users className="size-4 text-slate-300" />}
            />
            <CardBody className="space-y-3">
              {ROLE_MATRIX.map((item) => {
                const current = item.role === role;
                return (
                  <div
                    key={item.role}
                    className={cn(
                      "rounded-xl border p-3.5 transition",
                      current
                        ? "border-indigo-200 bg-indigo-50/50 ring-1 ring-indigo-100"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={current ? "indigo" : "slate"} dot={current}>
                        {ROLE_LABELS[item.role]}
                      </Badge>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {item.scope}
                      </span>
                      {current && (
                        <span className="ml-auto rounded-full bg-indigo-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                          You
                        </span>
                      )}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-emerald-600">
                          Allowed
                        </p>
                        <ul className="mt-1 space-y-1">
                          {item.can.map((entry) => (
                            <li key={entry} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                              <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                              {entry}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wide text-rose-500">
                          Restricted
                        </p>
                        {item.cannot.length ? (
                          <ul className="mt-1 space-y-1">
                            {item.cannot.map((entry) => (
                              <li key={entry} className="flex items-start gap-1.5 text-[11px] text-slate-500">
                                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-300" />
                                {entry}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-1 text-[11px] text-slate-400">No restrictions.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="How the numbers stay correct"
              description="Design decisions behind every screen"
              action={<Gauge className="size-4 text-slate-300" />}
            />
            <CardBody className="grid gap-3 sm:grid-cols-2">
              {PRINCIPLES.map((principle) => (
                <div
                  key={principle.title}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-lg bg-white text-indigo-600 ring-1 ring-slate-200">
                      <principle.icon className="size-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">{principle.title}</p>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-5 text-slate-500">{principle.text}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Quick links" description="Jump back into the workspace" />
            <CardBody className="space-y-2">
              {[
                { to: "/bills", label: "Bills", icon: ClipboardList },
                { to: "/stock", label: "Stock", icon: Boxes },
                { to: "/shops", label: "Shops", icon: Building2 },
                { to: "/purchase", label: "Purchases", icon: Store },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group flex items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/40 hover:text-indigo-700"
                >
                  <link.icon className="size-4 text-slate-400 group-hover:text-indigo-500" />
                  {link.label}
                  <ArrowRight className="ml-auto size-3.5 text-slate-300 group-hover:text-indigo-400" />
                </Link>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Technology" description="What powers this build" />
            <CardBody className="grid gap-1.5">
              {STACK.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2"
                >
                  <span className="text-[11px] font-semibold text-slate-700">{item.name}</span>
                  <span className="text-[10px] text-slate-400">{item.detail}</span>
                </div>
              ))}
            </CardBody>
          </Card>

          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white">
            <ClipboardList className="size-5 text-indigo-200" />
            <p className="mt-2 text-sm font-bold">Start with a bill</p>
            <p className="mt-1 text-[11px] leading-5 text-indigo-100/85">
              Pick a shop, add items and print. Stock, dashboard totals and the stock ledger update
              instantly.
            </p>
            <Link
              to="/bills/new"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold ring-1 ring-white/20 transition hover:bg-white/25"
            >
              Create a bill <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
