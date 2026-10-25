import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  ChevronDown,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  IndianRupee,
  Layers,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  SearchX,
  Store,
} from "lucide-react";
import { billService } from "@/services/bill.service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { canManageBills, isManagement } from "@/lib/roles";
import { downloadCsv } from "@/lib/csv";
import type { BillSummary, GroupedBillsResponse, Paginated } from "@/types";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getErrorMessage,
  todayISO,
} from "@/lib/utils";
import { PageHeader, StatCard, SectionTitle } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { DateStepper, SearchInput, Tabs, Toolbar } from "@/components/ui/toolbar";

type Mode = "grouped" | "list";

function printBill(id: number) {
  window.open(`/print/bill/${id}`, "_blank", "noopener,noreferrer");
}

export function BillsPage() {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();
  const navigate = useNavigate();
  const management = isManagement(user?.role);
  const canCreate = canManageBills(user?.role);

  const [mode, setMode] = useState<Mode>(management ? "grouped" : "list");
  const [date, setDate] = useState(todayISO());
  const [allDates, setAllDates] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [grouped, setGrouped] = useState<GroupedBillsResponse | null>(null);
  const [groupedLoading, setGroupedLoading] = useState(true);
  const [groupedError, setGroupedError] = useState("");

  const [list, setList] = useState<Paginated<BillSummary> | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadGrouped = useCallback(
    (silent = false) => {
      if (!silent) {
        setGroupedLoading(true);
        setGroupedError("");
      }
      billService
        .grouped(date)
        .then((data) => {
          setGrouped(data);
          setGroupedError("");
        })
        .catch((err) => {
          if (!silent) setGroupedError(getErrorMessage(err, "Unable to load bills for this date."));
        })
        .finally(() => {
          if (!silent) setGroupedLoading(false);
        });
    },
    [date],
  );

  useEffect(() => {
    if (mode !== "grouped") return;
    loadGrouped(false);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadGrouped(true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [mode, loadGrouped]);

  const loadList = useCallback(() => {
    setListLoading(true);
    setListError("");
    billService
      .list({
        date: allDates ? undefined : date,
        search: search.trim() || undefined,
        page,
        page_size: pageSize,
      })
      .then(setList)
      .catch((err) => setListError(getErrorMessage(err, "Unable to load bills.")))
      .finally(() => setListLoading(false));
  }, [allDates, date, search, page, pageSize]);

  useEffect(() => {
    if (mode !== "list") return;
    loadList();
  }, [mode, loadList]);

  useEffect(() => {
    setPage(1);
  }, [date, allDates, pageSize]);

  const summary = grouped?.summary;
  const groups = grouped?.groups ?? [];
  const groupedBills = useMemo(() => groups.flatMap((group) => group.bills), [groups]);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (mode === "grouped" && grouped) {
        if (!grouped.groups.length) {
          info("There are no bills to export for this date.");
          return;
        }
        downloadCsv(
          `bills-${date}.csv`,
          ["Date", "Shop", "GSTIN", "Invoice", "Customer", "Created by", "Items", "Subtotal", "Tax", "Round off", "Total"],
          grouped.groups.flatMap((group) =>
            group.bills.map((bill) => [
              bill.date,
              group.shop_name,
              group.shop_gst_no,
              bill.invoice_number,
              bill.customer_name,
              bill.created_by_name,
              bill.items_count,
              bill.subtotal,
              bill.tax_amount,
              bill.round_off,
              bill.total_amount,
            ]),
          ),
        );
        success(`Exported ${grouped.summary.bills} bills for ${formatDate(date)}.`);
        return;
      }

      const rows: BillSummary[] = [];
      let current = 1;
      let totalPages = 1;
      do {
        const data = await billService.list({
          date: allDates ? undefined : date,
          search: search.trim() || undefined,
          page: current,
          page_size: 100,
        });
        rows.push(...data.results);
        totalPages = data.total_pages;
        current += 1;
      } while (current <= totalPages);

      if (!rows.length) {
        info("There are no bills to export for these filters.");
        return;
      }
      downloadCsv(
        `bills-${allDates ? "all" : date}.csv`,
        ["Date", "Invoice", "Shop", "Customer", "Created by", "Items", "Subtotal", "Tax", "Round off", "Total"],
        rows.map((bill) => [
          bill.date,
          bill.invoice_number,
          bill.shop_name,
          bill.customer_name,
          bill.created_by_name,
          bill.items_count,
          bill.subtotal,
          bill.tax_amount,
          bill.round_off,
          bill.total_amount,
        ]),
      );
      success(`Exported ${rows.length} bills.`);
    } catch (err) {
      toastError(getErrorMessage(err, "Could not export bills."));
    } finally {
      setExporting(false);
    }
  };

  const openAllPrint = () => {
    if (!summary?.bills) {
      info("No bills to print for this date.");
      return;
    }
    window.open(`/print/all?date=${date}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Bills"
        subtitle={
          management
            ? "Daily sales grouped by shop, with GST invoices ready to print."
            : "Every invoice you created, newest first. You can only see your own bills."
        }
        actions={
          <>
            <Button variant="outline" onClick={handleExport} loading={exporting}>
              <Download className="size-4" /> Export CSV
            </Button>
            {management && (
              <Button variant="outline" onClick={openAllPrint}>
                <Printer className="size-4" /> Print all
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => navigate("/bills/new")}>
                <Plus className="size-4" /> New bill
              </Button>
            )}
          </>
        }
      />

      {management && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard
            label="Revenue"
            value={formatCurrency(mode === "grouped" ? summary?.total_amount : list?.results.reduce((sum, bill) => sum + Number(bill.total_amount), 0))}
            hint={mode === "grouped" ? formatDate(date, "long") : "Current page total"}
            icon={IndianRupee}
            tone="emerald"
            loading={mode === "grouped" ? groupedLoading && !grouped : listLoading && !list}
          />
          <StatCard
            label="Bills"
            value={formatNumber(mode === "grouped" ? summary?.bills : list?.count)}
            hint={mode === "grouped" ? "Invoices raised" : "Matching your filters"}
            icon={ClipboardList}
            tone="indigo"
            loading={mode === "grouped" ? groupedLoading && !grouped : listLoading && !list}
          />
          <StatCard
            label="Shops"
            value={formatNumber(mode === "grouped" ? summary?.shops : new Set((list?.results ?? []).map((bill) => bill.shop_id)).size)}
            hint={mode === "grouped" ? "Served today" : "On this page"}
            icon={Building2}
            tone="sky"
            loading={mode === "grouped" ? groupedLoading && !grouped : listLoading && !list}
          />
          <StatCard
            label="Units sold"
            value={formatNumber(mode === "grouped" ? summary?.quantity : list?.results.reduce((sum, bill) => sum + bill.items_count, 0))}
            hint={mode === "grouped" ? `${formatNumber(summary?.lines ?? 0)} line items` : "Line items on this page"}
            icon={Layers}
            tone="violet"
            loading={mode === "grouped" ? groupedLoading && !grouped : listLoading && !list}
          />
        </div>
      )}

      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          {management && (
            <Tabs
              value={mode}
              onChange={(value) => setMode(value)}
              options={[
                { value: "grouped", label: "By shop" },
                { value: "list", label: "All bills" },
              ]}
            />
          )}
          {mode === "grouped" ? (
            <DateStepper date={date} onChange={setDate} />
          ) : (
            <>
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
            </>
          )}
        </div>
        {mode === "list" && (
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search invoice, shop or customer…"
              className="w-full sm:w-72"
            />
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600"
              aria-label="Rows per page"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        )}
        {mode === "grouped" && (
          <div className="flex items-center gap-2">
            <Badge tone="indigo" dot>
              Auto-refreshes every 5s
            </Badge>
            <button
              type="button"
              onClick={() => loadGrouped()}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
              aria-label="Refresh bills"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>
        )}
      </Toolbar>

      {mode === "grouped" ? (
        groupedError && !grouped ? (
          <Card>
            <ErrorState message={groupedError} onRetry={() => loadGrouped()} />
          </Card>
        ) : groupedLoading && !grouped ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <Card key={index}>
                <div className="border-b border-slate-100 px-5 py-4">
                  <Skeleton className="h-6 w-48" />
                </div>
                <TableSkeleton rows={3} cols={5} />
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <EmptyState
              icon={SearchX}
              title="No bills on this date"
              message={`There are no invoices dated ${formatDate(date, "long")}. Try another date or create a bill.`}
              action={
                canCreate ? (
                  <Button onClick={() => navigate("/bills/new")}>
                    <Plus className="size-4" /> Create a bill
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const isOpen = expanded[group.shop_id] !== false;
              return (
                <Card key={group.shop_id} className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-5 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                        <Store className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/bills/shop/${group.shop_id}?date=${date}`)}
                            className="truncate text-sm font-bold text-slate-900 transition hover:text-indigo-600"
                          >
                            {group.shop_name}
                          </button>
                          {group.shop_gst_no && (
                            <Badge tone="indigo">GST {group.shop_gst_no}</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 max-w-xl truncate text-[11px] text-slate-500">
                          {group.shop_address}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span>
                            <span className="font-semibold text-slate-700">{group.bills_count}</span>{" "}
                            bill{group.bills_count === 1 ? "" : "s"}
                          </span>
                          <span>
                            <span className="font-semibold text-slate-700">{group.total_items}</span>{" "}
                            lines
                          </span>
                          <span>
                            <span className="font-semibold text-slate-700">{group.total_quantity}</span>{" "}
                            units
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="mr-1 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Shop total
                        </p>
                        <p className="text-lg font-bold text-slate-900">
                          {formatCurrency(group.total_amount)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `/print/shop/${group.shop_id}?date=${date}`,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        <Printer className="size-3.5" /> Print
                      </Button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((current) => ({
                            ...current,
                            [group.shop_id]: current[group.shop_id] === false,
                          }))
                        }
                        className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                        aria-label={isOpen ? "Collapse shop" : "Expand shop"}
                      >
                        <ChevronDown
                          className={`size-4 transition ${isOpen ? "" : "-rotate-90"}`}
                        />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            <th className="px-5 py-2.5">Invoice</th>
                            <th className="px-3 py-2.5">Customer</th>
                            <th className="hidden px-3 py-2.5 sm:table-cell">Created by</th>
                            <th className="px-3 py-2.5 text-center">Items</th>
                            <th className="px-3 py-2.5 text-right">Total</th>
                            <th className="px-5 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {group.bills.map((bill) => (
                            <tr
                              key={bill.id}
                              onClick={() => navigate(`/bills/${bill.id}`)}
                              className="cursor-pointer transition hover:bg-indigo-50/30"
                            >
                              <td className="px-5 py-3">
                                <p className="text-xs font-semibold text-indigo-600">
                                  {bill.invoice_number}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {formatDate(bill.date)}
                                </p>
                              </td>
                              <td className="px-3 py-3">
                                <p className="max-w-[220px] truncate text-xs font-medium text-slate-700">
                                  {bill.customer_name}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {bill.subtotal ? `Taxable ${formatCurrency(bill.subtotal)}` : ""}
                                </p>
                              </td>
                              <td className="hidden px-3 py-3 text-[11px] text-slate-500 sm:table-cell">
                                {bill.created_by_name}
                              </td>
                              <td className="px-3 py-3 text-center text-xs text-slate-600">
                                {bill.items_count}
                              </td>
                              <td className="px-3 py-3 text-right text-xs font-bold text-slate-900">
                                {formatCurrency(bill.total_amount)}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      navigate(`/bills/${bill.id}`);
                                    }}
                                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                    aria-label="View bill"
                                  >
                                    <ExternalLink className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      printBill(bill.id);
                                    }}
                                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                                    aria-label="Print bill"
                                  >
                                    <Printer className="size-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-2.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/bills/shop/${group.shop_id}?date=${date}`)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:underline"
                        >
                          <Receipt className="size-3.5" /> Shop bill sheet
                        </button>
                        <span className="text-[10px] text-slate-400">
                          {group.total_quantity} units · {group.total_items} line items
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )
      ) : listError && !list ? (
        <Card>
          <ErrorState message={listError} onRetry={loadList} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
            <SectionTitle
              title={allDates ? "All bills" : `Bills on ${formatDate(date)}`}
              description={search ? `Results for “${search}”` : "Newest first"}
            />
            <p className="text-xs text-slate-400">
              {list ? `${formatNumber(list.count)} bill${list.count === 1 ? "" : "s"}` : "—"}
            </p>
          </div>
          {listLoading && !list ? (
            <TableSkeleton rows={6} cols={6} />
          ) : list?.results.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-2.5">Invoice</th>
                      <th className="px-3 py-2.5">Shop / customer</th>
                      {allDates && <th className="px-3 py-2.5">Date</th>}
                      <th className="hidden px-3 py-2.5 sm:table-cell">Created by</th>
                      <th className="px-3 py-2.5 text-center">Items</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                      <th className="px-5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {list.results.map((bill) => (
                      <tr
                        key={bill.id}
                        onClick={() => navigate(`/bills/${bill.id}`)}
                        className="cursor-pointer transition hover:bg-indigo-50/30"
                      >
                        <td className="px-5 py-3">
                          <p className="text-xs font-semibold text-indigo-600">
                            {bill.invoice_number}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatDate(bill.created_at)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-xs font-semibold text-slate-800">{bill.shop_name}</p>
                          <p className="text-[10px] text-slate-400">{bill.customer_name}</p>
                        </td>
                        {allDates && (
                          <td className="px-3 py-3 text-[11px] text-slate-500">
                            {formatDate(bill.date)}
                          </td>
                        )}
                        <td className="hidden px-3 py-3 text-[11px] text-slate-500 sm:table-cell">
                          {bill.created_by_name}
                        </td>
                        <td className="px-3 py-3 text-center text-xs text-slate-600">
                          {bill.items_count}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <p className="text-xs font-bold text-slate-900">
                            {formatCurrency(bill.total_amount)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            tax {formatCurrency(bill.tax_amount)}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                printBill(bill.id);
                              }}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                              aria-label="Print bill"
                            >
                              <Printer className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/bills/${bill.id}`);
                              }}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                              aria-label="View bill"
                            >
                              <ExternalLink className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 px-5 py-3">
                <Pagination
                  page={list.page}
                  totalPages={list.total_pages}
                  total={list.count}
                  pageSize={list.page_size}
                  onPage={setPage}
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={search ? SearchX : FileText}
              title={search ? "No matching bills" : "No bills found"}
              message={
                search
                  ? `Nothing matches “${search}” with the current filters.`
                  : `There are no bills for ${allDates ? "these filters" : formatDate(date, "long")}.`
              }
              action={
                canCreate && !search ? (
                  <Button onClick={() => navigate("/bills/new")}>
                    <Plus className="size-4" /> Create a bill
                  </Button>
                ) : undefined
              }
            />
          )}
        </Card>
      )}

      {management && groupedBills.length > 0 && mode === "grouped" && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-indigo-900">
              {formatNumber(summary?.bills ?? 0)} bills across {formatNumber(summary?.shops ?? 0)} shops
            </p>
            <p className="mt-0.5 text-xs text-indigo-700/80">
              Daily total {formatCurrency(summary?.total_amount)} · {formatNumber(summary?.quantity ?? 0)} units ·{" "}
              {formatNumber(summary?.lines ?? 0)} line items
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/bills/shop/${groups[0]?.shop_id}?date=${date}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
            >
              <Store className="size-3.5" /> Shop sheets
            </Link>
            <Button onClick={openAllPrint}>
              <Printer className="size-4" /> Print all shops
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
