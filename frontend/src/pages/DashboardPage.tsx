import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  IndianRupee,
  Plus,
  ShoppingBag,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardService } from "@/services/dashboard.service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { DashboardStats } from "@/types";
import { currentMonth, formatCompact, formatCurrency, formatDate, formatNumber, getErrorMessage, monthLabel, shiftMonth } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/page";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as DashboardStats["daily_sales"][number];
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-float">
      <p className="text-[11px] font-semibold text-slate-500">
        {new Date(`${data.date}T00:00:00`).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        })}
      </p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{formatCurrency(data.total_amount)}</p>
      <p className="text-[10px] text-slate-400">
        {data.bills_count} bill{data.bills_count === 1 ? "" : "s"} · day {label}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const [month, setMonth] = useState(currentMonth());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();

  const load = (targetMonth: string, silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    dashboardService
      .stats(targetMonth)
      .then((data) => setStats(data))
      .catch((err) => {
        const message = getErrorMessage(err, "Unable to load dashboard stats.");
        setError(message);
        if (silent) toastError(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const chartData = stats?.daily_sales ?? [];
  const maxSold = useMemo(
    () => Math.max(1, ...(stats?.top_selling_items.map((item) => item.total_quantity) ?? [1])),
    [stats],
  );
  const isCurrentMonth = month === currentMonth();

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user?.full_name?.split(" ")[0] ?? "there"}`}
        subtitle="A live snapshot of sales, stock and customers across your business."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/bills")}>
              <ClipboardList className="size-4" /> View bills
            </Button>
            <Button onClick={() => navigate("/bills/new")}>
              <Plus className="size-4" /> New bill
            </Button>
          </>
        }
      />

      {error && !stats ? (
        <Card>
          <ErrorState message={error} onRetry={() => load(month)} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Today's revenue"
              value={formatCurrency(stats?.today_revenue)}
              hint={`${formatNumber(stats?.today_bills ?? 0)} bill${stats?.today_bills === 1 ? "" : "s"} today`}
              icon={IndianRupee}
              tone="emerald"
              loading={loading && !stats}
              onClick={() => navigate("/bills")}
            />
            <StatCard
              label="This month"
              value={formatCurrency(stats?.month_revenue)}
              hint={`${formatNumber(stats?.month_bills ?? 0)} bills in ${monthLabel(month)}`}
              icon={TrendingUp}
              tone="indigo"
              loading={loading && !stats}
            />
            <StatCard
              label="Total shops"
              value={formatNumber(stats?.total_shops)}
              hint="Customer accounts on file"
              icon={Building2}
              tone="sky"
              loading={loading && !stats}
              onClick={() => navigate("/shops")}
            />
            <StatCard
              label="Stock items"
              value={formatNumber(stats?.total_stock_items)}
              hint={
                stats?.low_stock_count
                  ? `${stats.low_stock_count} need restocking`
                  : "All items above minimum"
              }
              icon={Boxes}
              tone={stats?.low_stock_count ? "amber" : "violet"}
              loading={loading && !stats}
              onClick={() => navigate("/stock?filter=low")}
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Daily sales"
                description={`Revenue trend for ${monthLabel(month)}`}
                action={
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setMonth((value) => shiftMonth(value, -1))}
                      className="grid size-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="min-w-[112px] px-1 text-center text-xs font-semibold text-slate-700">
                      {monthLabel(month)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMonth((value) => shiftMonth(value, 1))}
                      className="grid size-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
                      aria-label="Next month"
                      disabled={isCurrentMonth}
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                }
              />
              <CardBody className="pt-2">
                {loading && !stats ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                        <defs>
                          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                        <XAxis
                          dataKey="day"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          interval={Math.max(0, Math.floor(chartData.length / 10))}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          tickFormatter={(value) => formatCompact(value)}
                          width={54}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#c7d2fe" }} />
                        <Area
                          type="monotone"
                          dataKey="total_amount"
                          stroke="#4f46e5"
                          strokeWidth={2.4}
                          fill="url(#salesFill)"
                          dot={false}
                          activeDot={{ r: 4, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <p className="text-[11px] text-slate-400">
                    Total revenue this month{" "}
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(stats?.month_revenue)}
                    </span>
                  </p>
                  <Badge tone="indigo" dot>
                    {formatNumber(stats?.month_bills ?? 0)} invoices
                  </Badge>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Low stock alerts"
                description="Items at or below minimum"
                action={
                  <Link
                    to="/stock?filter=low"
                    className="text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    View all
                  </Link>
                }
              />
              <div className="divide-y divide-slate-100">
                {loading && !stats ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-12" />
                    ))}
                  </div>
                ) : stats?.low_stock_items.length ? (
                  stats.low_stock_items.map((item) => {
                    const percent = item.min_stock
                      ? Math.min(100, Math.round((item.quantity / item.min_stock) * 100))
                      : 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigate(`/stock/${item.id}/edit`)}
                        className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50"
                      >
                        <div
                          className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                            item.quantity <= 0
                              ? "bg-rose-50 text-rose-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          <AlertTriangle className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-800">{item.name}</p>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                item.quantity <= 0 ? "bg-rose-500" : "bg-amber-500"
                              }`}
                              style={{ width: `${Math.max(percent, 4)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xs font-bold ${
                              item.quantity <= 0 ? "text-rose-600" : "text-amber-600"
                            }`}
                          >
                            {item.quantity} {item.unit}
                          </p>
                          <p className="text-[10px] text-slate-400">min {item.min_stock}</p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <EmptyState
                    icon={Boxes}
                    title="Stock looks healthy"
                    message="No items are below their minimum level."
                    className="py-10"
                  />
                )}
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Recent bills"
                description="The latest invoices created"
                action={
                  <Link
                    to="/bills"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                  >
                    All bills <ArrowUpRight className="size-3" />
                  </Link>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-2.5">Invoice</th>
                      <th className="px-3 py-2.5">Shop</th>
                      <th className="hidden px-3 py-2.5 sm:table-cell">Created by</th>
                      <th className="hidden px-3 py-2.5 md:table-cell">Date</th>
                      <th className="px-5 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading && !stats ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index}>
                          <td colSpan={5} className="px-5 py-3">
                            <Skeleton className="h-8" />
                          </td>
                        </tr>
                      ))
                    ) : stats?.recent_bills.length ? (
                      stats.recent_bills.map((bill) => (
                        <tr
                          key={bill.id}
                          onClick={() => navigate(`/bills/${bill.id}`)}
                          className="cursor-pointer transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-3">
                            <p className="text-xs font-semibold text-indigo-600">{bill.invoice_number}</p>
                            <p className="text-[10px] text-slate-400">{bill.items_count} items</p>
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-700">{bill.shop_name}</td>
                          <td className="hidden px-3 py-3 sm:table-cell">
                            <div className="flex items-center gap-1.5">
                              <Avatar name={bill.creator} size="sm" className="size-6 text-[9px]" />
                              <span className="text-[11px] text-slate-500">{bill.creator}</span>
                            </div>
                          </td>
                          <td className="hidden px-3 py-3 text-[11px] text-slate-400 md:table-cell">
                            {formatDate(bill.date)}
                          </td>
                          <td className="px-5 py-3 text-right text-xs font-bold text-slate-900">
                            {formatCurrency(bill.total_amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState
                            icon={ClipboardList}
                            title="No bills yet"
                            message="Create your first bill to see it here."
                            action={
                              <Button size="sm" onClick={() => navigate("/bills/new")}>
                                <Plus className="size-3.5" /> New bill
                              </Button>
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Top sellers"
                description="By quantity sold, all time"
                action={<Trophy className="size-4 text-amber-400" />}
              />
              <div className="space-y-3 p-5">
                {loading && !stats ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-12" />
                  ))
                ) : stats?.top_selling_items.length ? (
                  stats.top_selling_items.map((item, index) => (
                    <div key={`${item.stock_id}-${index}`} className="flex items-center gap-3">
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${
                          index === 0
                            ? "bg-amber-100 text-amber-700"
                            : index === 1
                              ? "bg-slate-200 text-slate-600"
                              : index === 2
                                ? "bg-orange-100 text-orange-700"
                                : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-slate-800">{item.name}</p>
                          <p className="shrink-0 text-[11px] font-bold text-slate-700">
                            {formatNumber(item.total_quantity)} {item.unit}
                          </p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                              style={{ width: `${Math.max(6, (item.total_quantity / maxSold) * 100)}%` }}
                            />
                          </div>
                          <span className="w-14 text-right text-[10px] text-slate-400">
                            {formatCompact(item.revenue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    icon={ShoppingBag}
                    title="No sales data"
                    message="Top sellers appear once bills are created."
                    className="py-8"
                  />
                )}
              </div>
              <div className="border-t border-slate-100 px-5 py-3">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <CalendarDays className="size-3.5" /> All-time revenue
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {formatCurrency(stats?.total_revenue)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
