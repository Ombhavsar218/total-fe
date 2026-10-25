import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Database,
  Info,
  LockKeyhole,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Users,
} from "lucide-react";
import { businessService } from "@/services/dashboard.service";
import { useAuth } from "@/contexts/AuthContext";
import { isManagement, ROLE_LABELS, ROLE_TONES } from "@/lib/roles";
import type { BusinessProfile } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/page";

export function SettingsPage() {
  const { user } = useAuth();
  const management = isManagement(user?.role);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    if (!management) return;
    businessService
      .get()
      .then(setBusiness)
      .catch(() => setBusiness(null));
  }, [management]);

  const links = [
    management
      ? {
          to: "/settings/business-profile",
          title: "Business profile",
          description: "Company name, address, GSTIN, FSSAI and bank details printed on invoices.",
          icon: Building2,
          tone: "bg-indigo-50 text-indigo-600",
        }
      : null,
    {
      to: "/profile",
      title: "My profile",
      description: "Your account, role permissions and password.",
      icon: UserCircle,
      tone: "bg-sky-50 text-sky-600",
    },
    user?.role !== "API"
      ? {
          to: "/settings/data-management",
          title: "Data management",
          description: "Download bills, stock, shops and purchases as CSV files.",
          icon: Database,
          tone: "bg-emerald-50 text-emerald-600",
        }
      : null,
    {
      to: "/settings/about",
      title: "About TotalStock",
      description: "How the workspace works, roles and the technology behind it.",
      icon: Info,
      tone: "bg-violet-50 text-violet-600",
    },
  ].filter(Boolean) as {
    to: string;
    title: string;
    description: string;
    icon: typeof Building2;
    tone: string;
  }[];

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Settings"
        subtitle="Business identity, account security and data tools."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-start gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-float"
              >
                <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", link.tone)}>
                  <link.icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between text-sm font-bold text-slate-900">
                    {link.title}
                    <ArrowUpRight className="size-4 text-slate-300 transition group-hover:text-indigo-500" />
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{link.description}</p>
                </div>
              </Link>
            ))}
          </div>

          {management && (
            <Card>
              <CardHeader
                title="Business identity"
                description="Used on every printed tax invoice"
                action={
                  <Link
                    to="/settings/business-profile"
                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    Edit
                  </Link>
                }
              />
              <CardBody>
                {business ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                        <Building2 className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{business.name}</p>
                        <p className="mt-0.5 flex items-start gap-1 text-xs leading-5 text-slate-500">
                          <MapPin className="mt-0.5 size-3.5 shrink-0" /> {business.address}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                        <Mail className="size-3.5 text-slate-400" />
                        {business.email || "Email not set"}
                      </div>
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                        <BadgeCheck className="size-3.5 text-slate-400" />
                        {business.gst_no ? `GSTIN ${business.gst_no}` : "GSTIN not set"}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Last updated {formatDate(business.updated_at)}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3.5 py-3">
                    <p className="text-xs text-amber-800">
                      Add your business details so invoices print correctly.
                    </p>
                    <Link
                      to="/settings/business-profile"
                      className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200"
                    >
                      Set up
                    </Link>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Security" description="Your account protection" />
            <CardBody className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <LockKeyhole className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800">Password</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    Passwords are hashed with Django’s PBKDF2 hasher. Change yours from My profile.
                  </p>
                </div>
                <Link
                  to="/profile"
                  className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Change
                </Link>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800">Session tokens</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    Short-lived JWT access tokens refresh automatically while you are signed in.
                  </p>
                </div>
                <Badge tone="emerald" dot>
                  Active
                </Badge>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardBody className="flex flex-col items-center py-6 text-center">
              <Avatar name={user?.full_name ?? "User"} size="lg" />
              <p className="mt-3 text-sm font-bold text-slate-900">{user?.full_name}</p>
              <p className="text-[11px] text-slate-400">{user?.email}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <Badge className={cn("ring-1 ring-inset", ROLE_TONES[user?.role ?? "API"])}>
                  {ROLE_LABELS[user?.role ?? "API"]}
                </Badge>
                <Badge tone={user?.is_active ? "emerald" : "rose"} dot>
                  {user?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="mt-3 text-[10px] text-slate-400">
                {user?.created_at ? `Member since ${formatDate(user.created_at)}` : "Team member"}
              </p>
            </CardBody>
          </Card>

          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white">
            <Sparkles className="size-5 text-indigo-200" />
            <p className="mt-2 text-sm font-bold">Built for clarity</p>
            <p className="mt-1 text-[11px] leading-5 text-indigo-100/85">
              Bills reduce stock, purchases add stock, and every movement is recorded. Your data
              stays consistent even when the team works at the same time.
            </p>
            <Link
              to="/settings/about"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-[11px] font-semibold ring-1 ring-white/20 transition hover:bg-white/25"
            >
              Read about TotalStock <ArrowUpRight className="size-3" />
            </Link>
          </div>

          {user?.role === "SUPERADMIN" && (
            <Card>
              <CardBody className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
                  <Users className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Team administration</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    You can create users, resets passwords and deactivate accounts.
                  </p>
                  <Link
                    to="/users"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    Manage users <ArrowUpRight className="size-3" />
                  </Link>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
