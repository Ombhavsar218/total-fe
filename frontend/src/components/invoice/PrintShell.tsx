import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, PageLoader } from "@/components/ui/feedback";

export function PrintShell({
  title,
  subtitle,
  children,
  loading = false,
  error,
  onRetry,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (title) document.title = `${title} · TotalStock`;
    return () => {
      document.title = "TotalStock";
    };
  }, [title]);

  return (
    <div className="min-h-screen bg-slate-100 py-5 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-3.5" /> Back
          </Button>
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" /> Print / Save as PDF
        </Button>
      </div>

      {loading ? (
        <div className="mx-auto max-w-[210mm] rounded-xl bg-white p-8 shadow-card print:shadow-none">
          <PageLoader label="Preparing the invoice…" />
        </div>
      ) : error ? (
        <div className="mx-auto max-w-[210mm] rounded-xl bg-white p-8 shadow-card print:shadow-none">
          <ErrorState message={error} onRetry={onRetry} />
        </div>
      ) : (
        <div className="mx-auto max-w-[210mm] px-2 sm:px-4 print:max-w-none print:p-0">
          <div className="overflow-hidden rounded-xl bg-white shadow-float print:rounded-none print:shadow-none">
            {children}
          </div>
        </div>
      )}

      <p className="no-print mt-4 text-center text-[10px] text-slate-400 print:hidden">
        Use your browser’s print dialog to choose a printer or “Save as PDF”. Page size: A4.
      </p>
    </div>
  );
}
