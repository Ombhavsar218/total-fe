import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { bottomNavForRole } from "@/lib/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function BottomNav() {
  const { user } = useAuth();
  const items = bottomNavForRole(user?.role);

  if (!items.length) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-semibold transition",
                isActive ? "text-indigo-600" : "text-slate-400 hover:text-slate-600",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "grid h-7 w-10 place-items-center rounded-lg transition",
                    isActive && "bg-indigo-50",
                  )}
                >
                  <item.icon className="size-[18px]" />
                </span>
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
