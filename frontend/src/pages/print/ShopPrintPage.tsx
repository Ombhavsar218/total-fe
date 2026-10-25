import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { billService } from "@/services/bill.service";
import { businessService } from "@/services/dashboard.service";
import { shopService } from "@/services/shop.service";
import type { BusinessProfile, Shop, ShopBillsResponse } from "@/types";
import { formatDate, getErrorMessage, todayISO } from "@/lib/utils";
import { ConsolidatedInvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { PrintShell } from "@/components/invoice/PrintShell";

export function ShopPrintPage() {
  const { shopId } = useParams();
  const [searchParams] = useSearchParams();
  const date = searchParams.get("date") || todayISO();
  const [shop, setShop] = useState<Shop | null>(null);
  const [data, setData] = useState<ShopBillsResponse | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!shopId) return;
    setLoading(true);
    setError("");
    Promise.all([
      shopService.get(shopId),
      billService.shopBills(shopId, date),
      businessService.get().catch(() => null),
    ])
      .then(([shopData, billsData, businessData]) => {
        setShop(shopData);
        setData(billsData);
        setBusiness(businessData);
      })
      .catch((err) => setError(getErrorMessage(err, "Unable to prepare this consolidated invoice.")))
      .finally(() => setLoading(false));
  }, [shopId, date]);

  useEffect(load, [load]);

  return (
    <PrintShell
      title={shop ? `Consolidated invoice · ${shop.name}` : "Consolidated invoice"}
      subtitle={`All bills dated ${formatDate(date, "long")}`}
      loading={loading}
      error={error}
      onRetry={load}
    >
      {shop && data && (
        <div className="p-5 sm:p-8 print:p-0">
          {data.items.length ? (
            <ConsolidatedInvoiceDocument shop={shop} data={data} business={business} />
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-800">No bills for this date</p>
              <p className="mt-1 text-xs text-slate-500">
                {shop.name} has no invoices dated {formatDate(date, "long")}.
              </p>
            </div>
          )}
        </div>
      )}
    </PrintShell>
  );
}
