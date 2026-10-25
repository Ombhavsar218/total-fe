import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Boxes,
  ChevronDown,
  LifeBuoy,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { pageTitle } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/page";
import { ROLE_LABELS } from "@/lib/roles";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/feedback";

export function Topbar({ onOpenHelp }: { onOpenHelp: () => void }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 lg:hidden">
          <Boxes className="size-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">
            {pageTitle(pathname)}
          </p>
          <p className="hidden text-[11px] text-slate-400 sm:block">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenHelp}
          className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:inline-flex"
        >
          <LifeBuoy className="size-4" /> Guide
        </button>
        <button
          type="button"
          onClick={() => setNotificationsOpen(true)}
          className="relative grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label="Notifications"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>
        <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-xl p-1 pr-1.5 transition hover:bg-slate-100"
          >
            <Avatar name={user?.full_name ?? "User"} size="sm" />
            <div className="hidden text-left leading-tight md:block">
              <p className="max-w-[130px] truncate text-xs font-semibold text-slate-800">
                {user?.full_name}
              </p>
              <p className="text-[10px] text-slate-400">{ROLE_LABELS[user?.role ?? "API"]}</p>
            </div>
            <ChevronDown
              className={cn("hidden size-3.5 text-slate-400 transition md:block", menuOpen && "rotate-180")}
            />
          </button>

          {menuOpen && (
            <div className="animate-fade-in absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-float">
              <div className="border-b border-slate-100 px-2.5 py-2.5 md:hidden">
                <p className="text-xs font-semibold text-slate-800">{user?.full_name}</p>
                <p className="text-[10px] text-slate-400">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <UserCircle className="size-4 text-slate-400" /> My profile
              </button>
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <Settings className="size-4 text-slate-400" /> Settings
              </button>
              <div className="my-1 h-px bg-slate-100" />
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Notifications"
        description="Low stock alerts and activity will appear here."
        size="sm"
      >
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          message="There are no new notifications. Stock alerts are shown on the dashboard."
        />
      </Modal>
    </header>
  );
}
