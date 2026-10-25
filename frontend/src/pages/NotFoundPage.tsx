import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Boxes, ClipboardList, Compass, Home, LifeBuoy, SearchX } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { landingPath } from "@/lib/roles";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SUGGESTIONS = [
  { to: "/bills", label: "Bills", description: "Create, review and print invoices", icon: ClipboardList },
  { to: "/stock", label: "Stock", description: "Check quantities and pricing", icon: Boxes },
  { to: "/settings", label: "Settings", description: "Business profile and account", icon: Compass },
];

export function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const home = landingPath(user?.role);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Page not found" subtitle="The link may be old, mistyped or moved." />

      <Card className="overflow-hidden">
        <div className="relative overflow-hidden bg-slate-950 px-6 py-12 text-center text-white sm:py-16">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-slate-950 to-violet-950" />
          <div className="bg-grid absolute inset-0 opacity-50" />
          <div className="relative z-10">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <SearchX className="size-7 text-indigo-200" />
            </div>
            <p className="mt-5 text-6xl font-bold tracking-tight text-white/90 sm:text-7xl">404</p>
            <h2 className="mt-2 text-lg font-bold">This shelf is empty</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-indigo-100/75">
              We couldn’t find that page. Try the dashboard, or jump straight into one of the
              workspace modules below.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => navigate(home)}>
                <Home className="size-4" /> Go to {user?.role === "MARKETING" || user?.role === "API" ? "bills" : "dashboard"}
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="size-4" /> Go back
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {SUGGESTIONS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-float"
            >
              <div className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                <item.icon className="size-4" />
              </div>
              <p className="mt-2.5 text-xs font-bold text-slate-900">{item.label}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.description}</p>
            </Link>
          ))}
        </div>
      </Card>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
        <LifeBuoy className="size-3.5" /> Still stuck? Open the guide from the top bar.
      </p>
    </div>
  );
}
