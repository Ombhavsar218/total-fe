import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  Download,
  History,
  PackageCheck,
  PackageX,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { stockService } from "@/services/stock.service";
import { useToast } from "@/contexts/ToastContext";
import { downloadCsv } from "@/lib/csv";
import type { PaginatedWithCounts, Stock } from "@/types";
import { formatCurrency, formatNumber, getErrorMessage, toNumber } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput, Tabs, Toolbar } from "@/components/ui/toolbar";
import { StockHistoryModal } from "@/components/stock/StockHistory";

type Filter = "all" | "in" | "low" | "out";

const STATUS_META = {
  in: { label: "In stock", tone: "emerald" as const },
  low: { label: "Low stock", tone: "amber" as const },
  out: { label: "Out of stock", tone: "rose" as const },
};

function initialFilter(value: string | null): Filter {
  return value === "in" || value === "low" || value === "out" ? value : "all";
}

export function StockPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<PaginatedWithCounts<Stock> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>(() => initialFilter(searchParams.get("filter")));
  const [ordering, setOrdering] = useState("newest");
  const [page, setPage] = useState(1);
  const [historyStock, setHistoryStock] = useState<Stock | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Stock | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    stockService
      .list({
        search: search.trim() || undefined,
        filter: filter === "all" ? undefined : filter,
        ordering,
        page,
        page_size: 10,
      })
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, "Unable to load stock.")))
      .finally(() => setLoading(false));
  }, [search, filter, ordering, page]);

  useEffect(load, [load]);

  const counts = data?.counts;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await stockService.remove(deleteTarget.id);
      success(response.message || "Stock item deleted.");
      setDeleteTarget(null);
      if (data && data.results.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        load();
      }
    } catch (err) {
      toastError(getErrorMessage(err, "Unable to delete this stock item."));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows: Stock[] = [];
      let current = 1;
      let totalPages = 1;
      do {
        const response = await stockService.list({
          search: search.trim() || undefined,
          filter: filter === "all" ? undefined : filter,
          ordering,
          page: current,
          page_size: 100,
        });
        rows.push(...response.results);
        totalPages = response.total_pages;
        current += 1;
      } while (current <= totalPages);

      if (!rows.length) {
        toastError("There are no stock items to export for these filters.");
        return;
      }
      downloadCsv(
        "stock.csv",
        [
          "Name",
          "SKU",
          "Quantity",
          "Unit",
          "Price",
          "MRP",
          "HSN",
          "GST rate",
          "Minimum stock",
          "Status",
          "Owner",
          "Description",
        ],
        rows.map((item) => [
          item.name,
          item.sku,
          item.quantity,
          item.unit,
          item.price,
          item.mrp,
          item.hsn_code,
          item.gst_rate,
          item.min_stock,
          item.status,
          item.owner.full_name,
          item.description,
        ]),
      );
      success(`Exported ${rows.length} stock items.`);
    } catch (err) {
      toastError(getErrorMessage(err, "Could not export stock."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Stock"
        subtitle="Catalogue, pricing, tax rates and live quantities. Every movement is auditable."
        actions={
          <>
            <Button variant="outline" onClick={handleExport} loading={exporting}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button onClick={() => navigate("/stock/new")}>
              <Plus className="size-4" /> Add item
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Total items"
          value={formatNumber(counts?.all ?? data?.count)}
          hint="In the catalogue"
          icon={Boxes}
          tone="indigo"
          loading={loading && !data}
        />
        <StatCard
          label="In stock"
          value={formatNumber(counts?.in)}
          hint="Above zero quantity"
          icon={PackageCheck}
          tone="emerald"
          loading={loading && !data}
        />
        <StatCard
          label="Low stock"
          value={formatNumber(counts?.low)}
          hint="At or below minimum"
          icon={TrendingDown}
          tone="amber"
          loading={loading && !data}
        />
        <StatCard
          label="Out of stock"
          value={formatNumber(counts?.out)}
          hint="Need restocking now"
          icon={PackageX}
          tone="rose"
          loading={loading && !data}
        />
      </div>

      <Toolbar>
        <Tabs
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All", count: counts?.all },
            { value: "in", label: "In stock", count: counts?.in },
            { value: "low", label: "Low", count: counts?.low },
            { value: "out", label: "Out", count: counts?.out, tone: "danger" },
          ]}
        />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search name or SKU…"
            className="w-full sm:w-64"
          />
          <select
            value={ordering}
            onChange={(event) => {
              setOrdering(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600"
            aria-label="Sort stock"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="quantity">Quantity ↑</option>
            <option value="quantity-desc">Quantity ↓</option>
          </select>
        </div>
      </Toolbar>

      {error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : loading && !data ? (
        <Card>
          <TableSkeleton rows={8} cols={6} />
        </Card>
      ) : data?.results.length ? (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Item</th>
                    <th className="px-3 py-3">On hand</th>
                    <th className="px-3 py-3 text-right">Price</th>
                    <th className="px-3 py-3 text-center">GST / HSN</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Owner</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.results.map((item) => {
                    const meta = STATUS_META[item.status];
                    const percent = item.min_stock
                      ? Math.min(100, Math.round((item.quantity / Math.max(item.min_stock, 1)) * 100))
                      : item.quantity > 0
                        ? 100
                        : 0;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setHistoryStock(item)}
                        className="cursor-pointer transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${
                                item.status === "out"
                                  ? "bg-rose-50 text-rose-600"
                                  : item.status === "low"
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-indigo-50 text-indigo-600"
                              }`}
                            >
                              {item.status === "out" ? (
                                <PackageX className="size-4" />
                              ) : item.status === "low" ? (
                                <AlertTriangle className="size-4" />
                              ) : (
                                <Boxes className="size-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-800">
                                {item.name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {item.sku || "No SKU"}
                                {item.description ? ` · ${item.description}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs font-semibold text-slate-800">
                            {formatNumber(item.quantity)} {item.unit}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  item.status === "out"
                                    ? "bg-rose-500"
                                    : item.status === "low"
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.max(percent, 4)}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-400">
                              min {item.min_stock}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <p className="text-xs font-semibold text-slate-800">
                            {formatCurrency(item.price, true)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            MRP {item.mrp ? formatCurrency(item.mrp, true) : "—"}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <p className="text-[11px] font-semibold text-slate-600">
                            {toNumber(item.gst_rate ?? 5)}%
                          </p>
                          <p className="text-[10px] text-slate-400">{item.hsn_code || "—"}</p>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={meta.tone} dot>
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-[11px] text-slate-500">
                          {item.owner.full_name}
                        </td>
                        <td className="px-5 py-3">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setHistoryStock(item)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                              aria-label={`History for ${item.name}`}
                            >
                              <History className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/stock/${item.id}/edit`)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                              aria-label={`Edit ${item.name}`}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              aria-label={`Delete ${item.name}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {data.results.map((item) => {
              const meta = STATUS_META[item.status];
              return (
                <Card key={item.id} className="p-4" onClick={() => setHistoryStock(item)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{item.sku || "No SKU"}</p>
                    </div>
                    <Badge tone={meta.tone} dot>
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 px-3 py-2 text-center">
                    <div>
                      <p className="text-[9px] uppercase text-slate-400">Qty</p>
                      <p className="text-xs font-bold text-slate-800">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400">Price</p>
                      <p className="text-xs font-bold text-slate-800">{formatCurrency(item.price)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400">GST</p>
                      <p className="text-xs font-bold text-slate-800">
                        {toNumber(item.gst_rate ?? 5)}%
                      </p>
                    </div>
                  </div>
                  <div
                    className="mt-3 flex items-center justify-end gap-1"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button variant="ghost" size="sm" onClick={() => setHistoryStock(item)}>
                      <History className="size-3.5" /> History
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/stock/${item.id}/edit`)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="mt-4">
            <Pagination
              page={data.page}
              totalPages={data.total_pages}
              total={data.count}
              pageSize={data.page_size}
              onPage={setPage}
            />
          </div>
        </>
      ) : (
        <Card>
          <EmptyState
            icon={search ? SearchX : Boxes}
            title={search ? "No matching items" : filter === "low" ? "No low stock items" : "No stock yet"}
            message={
              search
                ? `Nothing matches “${search}” with these filters.`
                : filter === "low"
                  ? "Every item is above its minimum quantity. Nice work."
                  : "Add your first stock item to start billing."
            }
            action={
              !search ? (
                <Button onClick={() => navigate("/stock/new")}>
                  <Plus className="size-4" /> Add stock item
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      <StockHistoryModal
        stock={historyStock}
        open={Boolean(historyStock)}
        onClose={() => setHistoryStock(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.name ?? "stock item"}?`}
        message="Items used by bills or purchase orders cannot be deleted — the API will keep your history safe. Adjust the quantity to zero instead if you want to retire it."
        confirmLabel="Delete item"
      />
    </div>
  );
}
