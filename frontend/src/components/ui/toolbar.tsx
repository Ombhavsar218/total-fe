import type { ChangeEvent, ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn, shiftDate, todayISO } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 shadow-xs transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  tone?: "default" | "danger";
}

export function Tabs<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: TabOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xs",
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
              active
                ? option.tone === "danger"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function DateStepper({
  date,
  onChange,
  label = "Date",
  max,
  allowFuture = false,
  showToday = true,
  className,
}: {
  date: string;
  onChange: (date: string) => void;
  label?: string;
  max?: string;
  allowFuture?: boolean;
  showToday?: boolean;
  className?: string;
}) {
  const limit = max ?? (allowFuture ? undefined : todayISO());
  const atLimit = Boolean(limit && date >= limit);
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
        <button
          type="button"
          onClick={() => onChange(shiftDate(date, -1))}
          className="grid size-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
          aria-label="Previous day"
        >
          <ChevronLeft className="size-4" />
        </button>
        <label className="relative flex items-center">
          <CalendarDays className="pointer-events-none absolute left-1 size-3.5 text-slate-400" />
          <input
            type="date"
            value={date}
            max={limit}
            aria-label={label}
            onChange={(event) => event.target.value && onChange(event.target.value)}
            className="h-7 w-[126px] cursor-pointer rounded-md border-0 bg-transparent pl-5 pr-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </label>
        <button
          type="button"
          onClick={() => onChange(shiftDate(date, 1))}
          disabled={atLimit}
          className="grid size-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Next day"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      {showToday && date !== todayISO() && (
        <button
          type="button"
          onClick={() => onChange(todayISO())}
          className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-indigo-600 transition hover:bg-indigo-50"
        >
          Today
        </button>
      )}
    </div>
  );
}

export function Toolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-card sm:p-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
