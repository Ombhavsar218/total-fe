import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Building2,
  Fingerprint,
  IndianRupee,
  Layers,
  MapPin,
  Phone,
  Printer,
  Receipt,
  RefreshCw,
  ShoppingBasket,
  Store,
} from "lucide-react";
import { billService } from "@/services/bill.service";
import { isManagement } from "@/lib/roles";
import { useAuth } from "@/contexts/AuthContext";
import type { ShopBillsResponse } from "@/types";
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
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from "@/components/ui/feedback";
import { DateStepper } from "@/components/ui/toolbar";

export function ShopBillsPage() {
  const { shopId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [date, setDate] = useState(searchParams.get("date") || todayISO());
  const [data, setData] = useState<ShopBillsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const management = isManagement(user?.role);

  const load = useCallback(
    (silent = false) => {
      if (!shopId) return;
      if (!silent) {
        setLoading(true);
        setError("");
      }
      billService
        .shopBills(shopId, date)
        .then((response) => {
          setData(response);
          setError("");
        })
        .catch((err) => {
          if (!silent) setError(getErrorMessage(err, "Unable to load this shop’s bills."));
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [shopId, date],
  );

  useEffect(() => {
    load(false);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [load]);

  const print = () => {
    window.open(`/print/shop/${shopId}?date=${date}`, "_blank", "noopener,noreferrer");
  };

  if (loading && !data) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="Shop bills" subtitle="Loading the consolidated bill sheet…" backTo="/bills" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Card className="mt-4">
          <TableSkeleton rows={6} cols={6} />
        </Card>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="Shop bills" backTo="/bills" />
        <Card>
          <ErrorState message={error} onRetry={() => load()} />
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={data.shop.name}
        subtitle={`Consolidated bill sheet for ${formatDate(data.date, "long")}`}
        backTo="/bills"
        backLabel="Bills"
        actions={
          <>
            <Button variant="outline" onClick={() => load()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            {management && (
              <Button variant="outline" onClick={() => navigate(`/shops/${data.shop.id}`)}>
                <Store className="size-4" /> Shop details
              </Button>
            )}
            <Button onClick={print}>
              <Printer className="size-4" /> Print shop invoice
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardBody className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{data.shop.name}</h2>
                {data.shop.has_gst && <Badge tone="indigo">GSTIN {data.shop.gst_no}</Badge>}
                {data.shop.has_fssai && <Badge tone="sky">FSSAI {data.shop.fssai_no}</Badge>}
              </div>
              <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                <MapPin className="mt-0.5 size-3.5 shrink-0" /> {data.shop.address}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                {data.shop.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" /> {data.shop.phone}
                  </span>
                )}
                {data.shop.email && <span>{data.shop.email}</span>}
                {data.shop.state_code && (
                  <span className="inline-flex items-center gap-1">
                    <Fingerprint className="size-3" /> State {data.shop.state_code}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <DateStepper date={date} onChange={setDate} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/bills/${data.items[0]?.bill_id ?? ""}`)}
              disabled={!data.items.length}
            >
              <Receipt className="size-3.5" /> Open first bill
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Total value"
          value={formatCurrency(data.total_amount, true)}
          hint={`${data.bills_count} bill${data.bills_count === 1 ? "" : "s"} on this date`}
          icon={IndianRupee}
          tone="emerald"
        />
        <StatCard
          label="Tax collected"
          value={formatCurrency(data.tax_amount, true)}
          hint="SGST + CGST"
          icon={Receipt}
          tone="indigo"
        />
        <StatCard
          label="Line items"
          value={formatNumber(data.items_count)}
          hint={`${formatNumber(data.total_quantity)} units`}
          icon={Layers}
          tone="violet"
        />
        <StatCard
          label="Average bill"
          value={formatCurrency(data.bills_count ? toNumber(data.total_amount) / data.bills_count : 0, true)}
          hint="Across all bills shown"
          icon={ShoppingBasket}
          tone="sky"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Itemised bill sheet</h3>
            <p className="text-xs text-slate-500">
              Every line from every invoice raised for this shop on {formatDate(data.date)}.
            </p>
          </div>
          <Badge tone="slate">Taxable {formatCurrency(data.subtotal, true)}</Badge>
        </div>
        {data.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5">#</th>
                  <th className="px-3 py-2.5">Item</th>
                  <th className="px-3 py-2.5">Invoice</th>
                  <th className="px-3 py-2.5 text-center">HSN</th>
                  <th className="px-3 py-2.5 text-center">Qty</th>
                  <th className="px-3 py-2.5 text-right">Rate</th>
                  <th className="px-3 py-2.5 text-right">Taxable</th>
                  <th className="px-3 py-2.5 text-right">SGST</th>
                  <th className="px-3 py-2.5 text-right">CGST</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                  <th className="px-5 py-2.5">Created by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.items.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/bills/${item.bill_id}`)}
                    className="cursor-pointer transition hover:bg-indigo-50/30"
                  >
                    <td className="px-5 py-2.5 text-[11px] text-slate-400">{index + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400">
                        MRP {item.mrp ? formatCurrency(item.mrp, true) : "—"} · GST {toNumber(item.gst_rate)}%
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-semibold text-indigo-600">
                      {item.invoice_number}
                    </td>
                    <td className="px-3 py-2.5 text-center text-[11px] text-slate-500">
                      {item.hsn_code || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-600">
                      {formatCurrency(item.price, true)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-600">
                      {formatCurrency(item.taxable_amount, true)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-600">
                      {formatCurrency(item.sgst, true)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-600">
                      {formatCurrency(item.cgst, true)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-900">
                      {formatCurrency(
                        toNumber(item.taxable_amount) + toNumber(item.sgst) + toNumber(item.cgst),
                        true,
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-[11px] text-slate-500">{item.created_by}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={6} className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Totals
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-bold text-slate-900">
                    {formatCurrency(data.subtotal, true)}
                  </td>
                  <td colSpan={2} className="px-3 py-3 text-right text-xs font-bold text-slate-900">
                    {formatCurrency(data.tax_amount, true)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-slate-900">
                    {formatCurrency(data.total_amount, true)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={ShoppingBasket}
            title="No bills for this date"
            message={`${data.shop.name} has no invoices dated ${formatDate(data.date, "long")}. Pick another date above.`}
          />
        )}
      </Card>
    </div>
  );
}
