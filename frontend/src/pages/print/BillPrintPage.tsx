import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { billService } from "@/services/bill.service";
import { businessService } from "@/services/dashboard.service";
import type { Bill, BusinessProfile } from "@/types";
import { formatDate, getErrorMessage } from "@/lib/utils";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { PrintShell } from "@/components/invoice/PrintShell";

export function BillPrintPage() {
  const { id } = useParams();
  const [bill, setBill] = useState<Bill | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    Promise.all([
      billService.get(id),
      businessService.get().catch(() => null),
    ])
      .then(([billData, businessData]) => {
        setBill(billData);
        setBusiness(businessData);
      })
      .catch((err) => setError(getErrorMessage(err, "Unable to prepare this invoice.")))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  return (
    <PrintShell
      title={bill ? `Invoice ${bill.invoice_number}` : "GST invoice"}
      subtitle={bill ? `${bill.customer_name} · ${formatDate(bill.date, "long")}` : undefined}
      loading={loading}
      error={error}
      onRetry={load}
    >
      {bill && (
        <div className="p-5 sm:p-8 print:p-0">
          <InvoiceDocument bill={bill} business={business} />
        </div>
      )}
    </PrintShell>
  );
}
