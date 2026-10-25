import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white shadow-sm ring-1 ring-inset ring-indigo-700/20 hover:bg-indigo-700 active:bg-indigo-800",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300",
  outline:
    "border border-slate-200 bg-white text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800",
  subtle: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 gap-1.5 rounded-lg px-3 text-xs font-semibold",
  md: "h-10 gap-2 rounded-xl px-4 text-sm font-semibold",
  lg: "h-11 gap-2 rounded-xl px-5 text-sm font-semibold",
  icon: "h-9 w-9 rounded-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
