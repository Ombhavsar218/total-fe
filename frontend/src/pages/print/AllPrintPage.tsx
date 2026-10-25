import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { billService } from "@/services/bill.service";
import { businessService } from "@/services/dashboard.service";
import { shopService } from "@/services/shop.service";
import type {
  BusinessProfile,
  GroupedBillsResponse,
  Shop,
  ShopBillsResponse,
} from "@/types";
import { formatCurrency, formatDate, getErrorMessage, todayISO } from "@/lib/utils";
import { ConsolidatedInvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { PrintShell } from "@/components/invoice/PrintShell";

interface ShopSection {
  shop: Shop;
  data: ShopBillsResponse;
}

function SummarySheet({
  grouped,
  business,
}: {
  grouped: GroupedBillsResponse;
  business: BusinessProfile | null;
}) {
  return (
    <article className="invoice-sheet invoice-page-break mx-auto w-full bg-white text-slate-900">
      <header className="flex items-start justify-between gap-6 border-b-2 border-slate-800 pb-4">
        <div>
          <h1 className="text-[19px] font-bold leading-tight tracking-tight">
            {business?.name || "TotalStock Distributors"}
          </h1>
          <p className="mt-1 max-w-[110mm] whitespace-pre-line text-[10px] leading-4 text-slate-600">
            {business?.address || "Business address not configured"}
          </p>
          <p className="mt-1 text-[10px] text-slate-600">
            {business?.phone}
            {business?.phone && business?.email && " · "}
            {business?.email}
          </p>
          <div className="mt-1.5 flex gap-4 text-[10px] font-semibold text-slate-700">
            {business?.gst_no && <span>GSTIN: {business.gst_no}</span>}
            {business?.fssai_no && <span>FSSAI: {business.fssai_no}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block rounded border border-slate-800 px-4 py-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Daily Sales Summary</p>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-slate-700">
            {formatDate(grouped.date, "long")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "Shops", value: grouped.summary.shops },
          { label: "Bills", value: grouped.summary.bills },
          { label: "Line items", value: grouped.summary.lines },
          { label: "Total quantity", value: grouped.summary.quantity },
        ].map((stat) => (
          <div key={stat.label} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
              {stat.label}
            </p>
            <p className="mt-0.5 text-base font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <table className="mt-4 w-full border-collapse text-[10px]">
        <thead>
          <tr className="bg-slate-100 text-[8px] font-bold uppercase tracking-wide text-slate-500">
            <th className="border border-slate-300 px-2 py-1.5 text-left">#</th>
            <th className="border border-slate-300 px-2 py-1.5 text-left">Shop</th>
            <th className="border border-slate-300 px-2 py-1.5 text-left">GSTIN</th>
            <th className="border border-slate-300 px-2 py-1.5 text-center">Bills</th>
            <th className="border border-slate-300 px-2 py-1.5 text-center">Qty</th>
            <th className="border border-slate-300 px-2 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {grouped.groups.map((group, index) => (
            <tr key={group.shop_id}>
              <td className="border border-slate-300 px-2 py-1.5 text-slate-400">{index + 1}</td>
              <td className="border border-slate-300 px-2 py-1.5">
                <p className="font-semibold text-slate-900">{group.shop_name}</p>
                <p className="text-[8px] text-slate-400">{group.shop_address}</p>
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-slate-600">
                {group.shop_gst_no || "—"}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-700">
                {group.bills_count}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-700">
                {group.total_quantity}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right font-semibold text-slate-900">
                {formatCurrency(group.total_amount, true)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50">
            <td colSpan={5} className="border border-slate-300 px-2 py-2 text-right text-[9px] font-bold uppercase tracking-wide text-slate-500">
              Total for the day
            </td>
            <td className="border border-slate-300 px-2 py-2 text-right text-[12px] font-bold text-slate-900">
              {formatCurrency(grouped.summary.total_amount, true)}
            </td>
          </tr>
        </tfoot>
      </table>

      <p className="mt-4 text-[9px] leading-4 text-slate-500">
        This summary is followed by a consolidated tax invoice for each shop. Every individual
        invoice remains a statutory document and stock has already been deducted against each sale.
      </p>

      <footer className="mt-6 flex items-center justify-between border-t border-slate-200 pt-2 text-[8px] text-slate-400">
        <span>Daily sales summary · {formatDate(grouped.date)}</span>
        <span>TotalStock · Inventory &amp; Distributor Management</span>
      </footer>
    </article>
  );
}

export function AllPrintPage() {
  const [searchParams] = useSearchParams();
  const date = searchParams.get("date") || todayISO();
  const [grouped, setGrouped] = useState<GroupedBillsResponse | null>(null);
  const [sections, setSections] = useState<ShopSection[]>([]);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([billService.grouped(date), businessService.get().catch(() => null)])
      .then(async ([groupedData, businessData]) => {
        const loaded = await Promise.all(
          groupedData.groups.map(async (group) => {
            const [shop, data] = await Promise.all([
              shopService.get(group.shop_id),
              billService.shopBills(group.shop_id, date),
            ]);
            return { shop, data };
          }),
        );
        setGrouped(groupedData);
        setSections(loaded);
        setBusiness(businessData);
      })
      .catch((err) => setError(getErrorMessage(err, "Unable to prepare the daily print pack.")))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(load, [load]);

  return (
    <PrintShell
      title="All shops · consolidated invoices"
      subtitle={`Daily print pack for ${formatDate(date, "long")}`}
      loading={loading}
      error={error}
      onRetry={load}
    >
      {grouped && (
        <div className="p-5 sm:p-8 print:p-0">
          {grouped.groups.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-800">No bills for this date</p>
              <p className="mt-1 text-xs text-slate-500">
                There are no invoices dated {formatDate(date, "long")} to print.
              </p>
            </div>
          ) : (
            <>
              <SummarySheet grouped={grouped} business={business} />
              {sections.map((section, index) => (
                <div
                  key={section.shop.id}
                  className="mt-6 print:mt-0"
                >
                  <ConsolidatedInvoiceDocument
                    shop={section.shop}
                    data={section.data}
                    business={business}
                    pageBreak={index < sections.length - 1}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </PrintShell>
  );
}
