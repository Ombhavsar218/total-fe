import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  IndianRupee,
  PackageCheck,
  Pencil,
  Plus,
  SearchX,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import { purchaseService } from "@/services/purchase.service";
import { useToast } from "@/contexts/ToastContext";
import { downloadCsv } from "@/lib/csv";
import type { PaginatedWithCounts, PurchaseStatus, PurchaseSummary } from "@/types";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getErrorMessage,
  toNumber,
  todayISO,
} from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { DateStepper, SearchInput, Tabs, Toolbar } from "@/components/ui/toolbar";

type StatusFilter = "ALL" | PurchaseStatus;

const STATUS_META: Record<PurchaseStatus, { label: string; tone: "emerald" | "amber"; icon: typeof Clock3 }> = {
  RECEIVED: { label: "Received", tone: "emerald", icon: CheckCircle2 },
  PENDING: { label: "Pending", tone: "amber", icon: Clock3 },
};

export function PurchasePage() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<PaginatedWithCounts<PurchaseSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState(todayISO());
  const [allDates, setAllDates] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [date, allDates, status]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    purchaseService
      .list({
        date: allDates ? "all" : date,
        status: status === "ALL" ? undefined : status,
        search: search.trim() || undefined,
        page,
        page_size: 10,
      })
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, "Unable to load purchase orders.")))
      .finally(() => setLoading(false));
  }, [allDates, date, status, search, page]);

  useEffect(load, [load]);

  const counts = data?.counts;
  const pageValue = data?.results.reduce((sum, order) => sum + toNumber(order.total_amount), 0) ?? 0;
  const pageDue = data?.results.reduce((sum, order) => sum + toNumber(order.due_amount), 0) ?? 0;

  const toggleStatus = async (order: PurchaseSummary) => {
    setStatusBusy(order.id);
    try {
      const next = order.status === "PENDING" ? "RECEIVED" : "PENDING";
      const response = await purchaseService.updateStatus(order.id, next);
      success(response.message || `Purchase order marked ${next.toLowerCase()}.`);
      load();
    } catch (err) {
      toastError(getErrorMessage(err, "Unable to update this purchase order."));
    } finally {
      setStatusBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await purchaseService.remove(deleteTarget.id);
      success(response.message || "Purchase order deleted.");
      setDeleteTarget(null);
      if (data && data.results.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        load();
      }
    } catch (err) {
      toastError(getErrorMessage(err, "Unable to delete this purchase order."));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows: PurchaseSummary[] = [];
      let current = 1;
      let totalPages = 1;
      do {
        const response = await purchaseService.list({
          date: allDates ? "all" : date,
          status: status === "ALL" ? undefined : status,
          search: search.trim() || undefined,
          page: current,
          page_size: 100,
        });
        rows.push(...response.results);
        totalPages = response.total_pages;
        current += 1;
      } while (current <= totalPages);

      if (!rows.length) {
        toastError("There are no purchase orders to export for these filters.");
        return;
      }
      downloadCsv(
        `purchases-${allDates ? "all" : date}.csv`,
        ["Date", "Invoice", "Status", "Items", "Subtotal", "Total", "Paid", "Due", "Created by", "Created at"],
        rows.map((order) => [
          order.date,
          order.invoice_number,
          order.status,
          order.items_count,
          order.subtotal,
          order.total_amount,
          order.paid_amount,
          order.due_amount,
          order.created_by_name,
          order.created_at,
        ]),
      );
      success(`Exported ${rows.length} purchase orders.`);
    } catch (err) {
      toastError(getErrorMessage(err, "Could not export purchase orders."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Purchases"
        subtitle="Supplier orders and stock intake. Creating an order adds stock immediately and records an audit trail."
        actions={
          <>
            <Button variant="outline" onClick={handleExport} loading={exporting}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button onClick={() => navigate("/purchase/new")}>
              <Plus className="size-4" /> New purchase
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Orders"
          value={formatNumber(counts?.ALL ?? data?.count)}
          hint={allDates ? "All dates" : formatDate(date, "long")}
          icon={Truck}
          tone="indigo"
          loading={loading && !data}
        />
        <StatCard
          label="Received"
          value={formatNumber(counts?.RECEIVED)}
          hint="Stock intake confirmed"
          icon={PackageCheck}
          tone="emerald"
          loading={loading && !data}
        />
        <StatCard
          label="Pending"
          value={formatNumber(counts?.PENDING)}
          hint="Awaiting delivery"
          icon={Clock3}
          tone="amber"
          loading={loading && !data}
        />
        <StatCard
          label="Value on page"
          value={formatCurrency(pageValue)}
          hint={`Due ${formatCurrency(pageDue)}`}
          icon={IndianRupee}
          tone="violet"
          loading={loading && !data}
        />
      </div>

      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={status}
            onChange={(value) => setStatus(value)}
            options={[
              { value: "ALL", label: "All", count: counts?.ALL },
              { value: "PENDING", label: "Pending", count: counts?.PENDING },
              { value: "RECEIVED", label: "Received", count: counts?.RECEIVED },
            ]}
          />
          <DateStepper date={date} onChange={setDate} />
          <button
            type="button"
            onClick={() => setAllDates((value) => !value)}
            className={
              allDates
                ? "rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200"
                : "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
            }
          >
            All dates
          </button>
        </div>
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search invoice or creator…"
          className="w-full sm:w-64"
        />
      </Toolbar>

      {error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {loading && !data ? (
            <TableSkeleton rows={7} cols={7} />
          ) : data?.results.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3">Invoice</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-center">Items</th>
                      <th className="px-3 py-3 text-right">Total</th>
                      <th className="px-3 py-3 text-right">Paid</th>
                      <th className="px-3 py-3 text-right">Due</th>
                      <th className="px-3 py-3">Created by</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.results.map((order) => {
                      const meta = STATUS_META[order.status];
                      const StatusIcon = meta.icon;
                      return (
                        <tr
                          key={order.id}
                          onClick={() => navigate(`/purchase/${order.id}`)}
                          className="cursor-pointer transition hover:bg-indigo-50/30"
                        >
                          <td className="px-5 py-3">
                            <p className="text-xs font-semibold text-indigo-600">
                              {order.invoice_number}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatNumber(order.items_count)} line
                              {order.items_count === 1 ? "" : "s"}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-[11px] text-slate-500">
                            {formatDate(order.date)}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleStatus(order);
                              }}
                              disabled={statusBusy === order.id}
                              className="disabled:opacity-60"
                              title={`Mark as ${order.status === "PENDING" ? "received" : "pending"}`}
                            >
                              <Badge tone={meta.tone} dot>
                                <StatusIcon className="size-3" />
                                {meta.label}
                              </Badge>
                            </button>
                          </td>
                          <td className="px-3 py-3 text-center text-xs text-slate-600">
                            {order.items_count}
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-bold text-slate-900">
                            {formatCurrency(order.total_amount)}
                          </td>
                          <td className="px-3 py-3 text-right text-xs text-emerald-600">
                            {formatCurrency(order.paid_amount)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span
                              className={
                                toNumber(order.due_amount) > 0
                                  ? "text-xs font-semibold text-rose-600"
                                  : "text-xs font-semibold text-slate-400"
                              }
                            >
                              {formatCurrency(order.due_amount)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-[11px] text-slate-500">
                            {order.created_by_name}
                          </td>
                          <td className="px-5 py-3">
                            <div
                              className="flex items-center justify-end gap-1"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => navigate(`/purchase/${order.id}`)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                                aria-label="View purchase order"
                              >
                                <ExternalLink className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/purchase/${order.id}/edit`)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                                aria-label="Edit purchase order"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(order)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                aria-label="Delete purchase order"
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
              <div className="border-t border-slate-100 px-5 py-3">
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
            <EmptyState
              icon={search ? SearchX : Store}
              title={search ? "No matching purchase orders" : "No purchase orders"}
              message={
                search
                  ? `Nothing matches “${search}” with these filters.`
                  : allDates
                    ? "Create a purchase order to receive stock from a supplier."
                    : `No purchase orders dated ${formatDate(date, "long")}. Try another date or show all dates.`
              }
              action={
                !search ? (
                  <Button onClick={() => navigate("/purchase/new")}>
                    <Plus className="size-4" /> New purchase
                  </Button>
                ) : undefined
              }
            />
          )}
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.invoice_number ?? "purchase order"}?`}
        message="Deleting removes the received quantities from stock. If that stock has already been sold, the order cannot be deleted."
        confirmLabel="Delete order"
      />
    </div>
  );
}
