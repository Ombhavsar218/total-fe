import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  History,
  PackageCheck,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { stockService } from "@/services/stock.service";
import type { Stock, StockMovement } from "@/types";
import { formatDateTime, getErrorMessage } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";

const KIND_META: Record<string, { label: string; tone: "emerald" | "rose" | "indigo" | "amber" | "sky" }> = {
  OPENING: { label: "Opening stock", tone: "sky" },
  BILL: { label: "Sale", tone: "rose" },
  BILL_EDIT: { label: "Bill edit", tone: "amber" },
  BILL_DELETE: { label: "Bill reversal", tone: "emerald" },
  PURCHASE: { label: "Purchase received", tone: "emerald" },
  PURCHASE_EDIT: { label: "Purchase edit", tone: "indigo" },
  PURCHASE_DELETE: { label: "Purchase reversal", tone: "rose" },
  ADJUSTMENT: { label: "Manual adjustment", tone: "amber" },
};

export function StockHistoryModal({
  stock,
  open,
  onClose,
}: {
  stock: Stock | null;
  open: boolean;
  onClose: () => void;
}) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [current, setCurrent] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    if (!stock) return;
    setLoading(true);
    setError("");
    stockService
      .movements(stock.id, 50)
      .then((data) => {
        setMovements(data.movements);
        setCurrent(data.stock);
      })
      .catch((err) => setError(getErrorMessage(err, "Unable to load stock history.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open && stock) {
      setMovements([]);
      setCurrent(stock);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stock?.id]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={stock ? `Movement history · ${stock.name}` : "Stock history"}
      description="Every sale, purchase and manual change is recorded here."
      footer={
        <>
          <Button variant="outline" onClick={load} loading={loading}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      {current && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">On hand</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {current.quantity} {current.unit}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Minimum</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">
              {current.min_stock} {current.unit}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">GST rate</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{Number(current.gst_rate ?? 5)}%</p>
          </div>
        </div>
      )}

      {loading && !movements.length ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : movements.length ? (
        <ol className="relative space-y-2 border-l border-slate-200 pl-4">
          {movements.map((movement) => {
            const positive = movement.delta > 0;
            const meta = KIND_META[movement.kind] ?? { label: movement.kind, tone: "slate" as const };
            const Icon = movement.kind.startsWith("PURCHASE")
              ? PackageCheck
              : movement.kind === "ADJUSTMENT" || movement.kind === "OPENING"
                ? SlidersHorizontal
                : positive
                  ? ArrowUpRight
                  : ArrowDownRight;
            return (
              <li key={movement.id} className="relative rounded-xl border border-slate-200 bg-white p-3">
                <span
                  className={`absolute -left-[23px] top-4 grid size-3.5 place-items-center rounded-full ring-4 ring-white ${
                    positive ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                        positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {movement.reference && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            {movement.reference}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {movement.note || "Stock quantity updated"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {formatDateTime(movement.created_at)}
                        {movement.created_by_name ? ` · ${movement.created_by_name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        positive ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {movement.delta}
                    </p>
                    <p className="text-[10px] text-slate-400">after {movement.quantity_after}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState
          icon={History}
          title="No movements recorded"
          message="Sales, purchases and adjustments will appear here as they happen."
        />
      )}
    </Modal>
  );
}
