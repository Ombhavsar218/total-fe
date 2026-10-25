import { NavLink } from "react-router-dom";
import { Boxes, LifeBuoy, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { navForRole } from "@/lib/navigation";
import { ROLE_LABELS, ROLE_TONES } from "@/lib/roles";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/page";

export function Sidebar({ onOpenHelp }: { onOpenHelp: () => void }) {
  const { user, logout } = useAuth();
  const items = navForRole(user?.role);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-slate-200/80 bg-white lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm shadow-indigo-300">
          <Boxes className="size-5 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight text-slate-900">TotalStock</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            Distributor suite
          </p>
        </div>
      </div>

      <div className="px-3 pt-4">
        <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2.5 ring-1 ring-indigo-100">
          <Sparkles className="size-3.5 text-indigo-500" />
          <span className="text-[11px] font-semibold text-indigo-700">Business workspace</span>
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Workspace
        </p>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    "size-[18px] shrink-0 transition",
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600",
                  )}
                />
                <span className="truncate">{item.label}</span>
                {isActive && <span className="ml-auto size-1.5 rounded-full bg-indigo-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-4 text-white">
          <LifeBuoy className="size-5 text-indigo-200" />
          <p className="mt-2 text-sm font-semibold">Need a hand?</p>
          <p className="mt-0.5 text-[11px] leading-4 text-indigo-100">
            Short walkthroughs for every module.
          </p>
          <button
            type="button"
            onClick={onOpenHelp}
            className="mt-3 w-full rounded-lg bg-white/15 py-1.5 text-[11px] font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/25"
          >
            Open guide
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <Avatar name={user?.full_name ?? "User"} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800">{user?.full_name}</p>
            <span
              className={cn(
                "mt-0.5 inline-flex rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset",
                ROLE_TONES[user?.role ?? "API"],
              )}
            >
              {ROLE_LABELS[user?.role ?? "API"]}
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
