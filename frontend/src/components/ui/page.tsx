import type { ComponentType, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Skeleton } from "./feedback";

export function PageHeader({
  title,
  subtitle,
  actions,
  backTo,
  backLabel = "Back",
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft className="size-3.5" /> {backLabel}
          </Link>
        )}
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "indigo",
  loading = false,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ComponentType<{ className?: string }>;
  tone?: "indigo" | "emerald" | "amber" | "sky" | "violet" | "rose";
  loading?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    sky: "bg-sky-50 text-sky-600 ring-sky-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
  };
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5",
        onClick && "cursor-pointer transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-float",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl ring-1", tones[tone])}>
          <Icon className="size-4" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      )}
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "size-8 text-[11px]", md: "size-9 text-xs", lg: "size-12 text-sm" };
  const parts = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white ring-2 ring-white",
        sizes[size],
        className,
      )}
    >
      {parts || "U"}
    </div>
  );
}
