import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BottomNav } from "./BottomNav";
import { HelpGuide } from "./HelpGuide";

export function AppLayout() {
  const [helpOpen, setHelpOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <Sidebar onOpenHelp={() => setHelpOpen(true)} />
      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <Topbar onOpenHelp={() => setHelpOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
          <Outlet />
        </main>
        <footer className="hidden border-t border-slate-200/60 px-8 py-4 text-center text-[11px] text-slate-400 lg:block">
          TotalStock v1.0 · Inventory & Distributor Management · Powered by Django + React
        </footer>
      </div>
      <BottomNav />
      <HelpGuide open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
