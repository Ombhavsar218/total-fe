import type { ComponentType, ReactNode } from "react";
import { AlertCircle, Inbox, Loader2, PackageOpen, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-indigo-600", className)} />;
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3">
      <div className="grid size-12 place-items-center rounded-2xl bg-white shadow-card">
        <Spinner />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg", className)} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((__, colIndex) => (
            <Skeleton key={colIndex} className={cn("h-9", colIndex === 0 && "w-4/5")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon: Icon = Inbox,
  className,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
        <Icon className="size-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  title = "Couldn’t load this page",
}: {
  message?: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-3.5" /> Try again
        </Button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="leading-5">{message}</div>
    </div>
  );
}

export function EmptyTable({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-400">
      <PackageOpen className="size-4" /> {message}
    </div>
  );
}
