import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  FileText,
  Hash,
  Pencil,
  Printer,
  Receipt,
  Trash2,
  UserRound,
} from "lucide-react";
import { billService } from "@/services/bill.service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { isManagement } from "@/lib/roles";
import { formatCurrency, formatDate, formatDateTime, getErrorMessage, toNumber } from "@/lib/utils";
import type { Bill } from "@/types";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { ErrorState, PageLoader } from "@/components/ui/feedback";

export function ViewBillPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError("");
    billService
      .get(id)
      .then(setBill)
      .catch((err) => setError(getErrorMessage(err, "Unable to load this bill.")))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleDelete = async () => {
    if (!bill) return;
    setDeleting(true);
    try {
      const response = await billService.remove(bill.id);
      success(response.message || "Bill deleted and stock restored.");
      navigate("/bills");
    } catch (err) {
      toastError(getErrorMessage(err, "Unable to delete this bill."));
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader label="Loading bill…" />;
  if (error || !bill) {
    return (
      <Card>
        <ErrorState message={error || "Bill not found."} onRetry={load} />
      </Card>
    );
  }

  const canEdit = isManagement(user?.role) || bill.created_by_id === user?.id;
  const halfTax = toNumber(bill.tax_amount) / 2;
  const totalQuantity = bill.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={bill.invoice_number}
        subtitle={`${bill.customer_name} · ${formatDate(bill.date, "long")}`}
        backTo="/bills"
        backLabel="Bills"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => window.open(`/print/bill/${bill.id}`, "_blank", "noopener,noreferrer")}
            >
              <Printer className="size-4" /> Print
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => navigate(`/bills/${bill.id}/edit`)}>
                <Pencil className="size-4" /> Edit
              </Button>
            )}
            {canEdit && (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" /> Delete
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-indigo-50/70 via-white to-white px-5 py-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                  <Receipt className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">
                    GST Tax Invoice
                  </p>
                  <p className="text-base font-bold text-slate-900">{bill.invoice_number}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {bill.items_count} line{bill.items_count === 1 ? "" : "s"} · {totalQuantity} units
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Invoice total
              </p>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(bill.total_amount, true)}
              </p>
              <Badge tone="emerald" dot className="mt-1">
                Stock deducted
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-100 px-5 py-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Billed to
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{bill.customer_name}</p>
              <p className="mt-0.5 max-w-md text-xs leading-5 text-slate-500">
                {bill.customer_address}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {bill.customer_gst && <Badge tone="indigo">GST {bill.customer_gst}</Badge>}
                {bill.customer_fssai && <Badge tone="sky">FSSAI {bill.customer_fssai}</Badge>}
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Invoice date
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(bill.date, "long")}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Created by
              </p>
              <p className="mt-1 text-xs text-slate-600">{bill.created_by_name}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5">#</th>
                  <th className="px-3 py-2.5">Item</th>
                  <th className="px-3 py-2.5 text-center">HSN</th>
                  <th className="px-3 py-2.5 text-center">Qty</th>
                  <th className="px-3 py-2.5 text-right">Rate</th>
                  <th className="px-3 py-2.5 text-center">GST</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bill.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-[11px] text-slate-400">{index + 1}</td>
                    <td className="px-3 py-3">
                      <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400">
                        MRP {item.mrp ? `₹${toNumber(item.mrp).toFixed(2)}` : "—"} · per {item.unit}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-center text-[11px] text-slate-500">
                      {item.hsn_code || "—"}
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-slate-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-slate-600">
                      {formatCurrency(item.price, true)}
                    </td>
                    <td className="px-3 py-3 text-center text-[11px] text-slate-500">
                      {toNumber(item.gst_rate)}%
                    </td>
                    <td className="px-5 py-3 text-right text-xs font-semibold text-slate-800">
                      {formatCurrency(item.amount, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-5 py-4">
            <div className="w-full max-w-xs space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Taxable value</span>
                <span className="font-medium text-slate-700">
                  {formatCurrency(bill.subtotal, true)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>SGST</span>
                <span className="font-medium text-slate-700">{formatCurrency(halfTax, true)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>CGST</span>
                <span className="font-medium text-slate-700">{formatCurrency(halfTax, true)}</span>
              </div>
              {toNumber(bill.round_off) !== 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Round off</span>
                  <span className="font-medium text-slate-700">
                    {formatCurrency(bill.round_off, true)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-dashed border-slate-300 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Grand total
                </span>
                <span className="text-base font-bold text-slate-900">
                  {formatCurrency(bill.total_amount, true)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Details" description="Record metadata" />
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <Hash className="size-4 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Invoice no.</p>
                  <p className="text-xs font-semibold text-slate-800">{bill.invoice_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays className="size-4 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Bill date</p>
                  <p className="text-xs font-semibold text-slate-800">{formatDate(bill.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <UserRound className="size-4 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Created by</p>
                  <p className="text-xs font-semibold text-slate-800">{bill.created_by_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="size-4 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Created at</p>
                  <p className="text-xs font-semibold text-slate-800">
                    {formatDateTime(bill.created_at)}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-2">
              <Button
                className="w-full"
                onClick={() =>
                  window.open(`/print/bill/${bill.id}`, "_blank", "noopener,noreferrer")
                }
              >
                <Printer className="size-4" /> Print GST invoice
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/bills/shop/${bill.shop.id}?date=${bill.date}`)}
              >
                <Receipt className="size-4" /> All bills for {bill.shop.name}
              </Button>
            </CardBody>
          </Card>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="text-xs font-semibold text-indigo-800">Stock already updated</p>
            <p className="mt-1 text-[11px] leading-5 text-indigo-600">
              Deleting this bill restores every quantity. Editing it restores the old lines before
              deducting the new ones.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${bill.invoice_number}?`}
        message="This permanently removes the bill and restores all sold quantities to stock. This cannot be undone."
        confirmLabel="Delete bill"
      />
    </div>
  );
}
