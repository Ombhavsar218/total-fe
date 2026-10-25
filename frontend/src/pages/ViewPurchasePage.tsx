import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Hash,
  PackageCheck,
  Pencil,
  Trash2,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";
import { purchaseService } from "@/services/purchase.service";
import { useToast } from "@/contexts/ToastContext";
import type { Purchase } from "@/types";
import { formatCurrency, formatDate, formatDateTime, getErrorMessage, toNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { ErrorState, PageLoader } from "@/components/ui/feedback";

export function ViewPurchasePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    purchaseService
      .get(id)
      .then(setPurchase)
      .catch((err) => setError(getErrorMessage(err, "Unable to load this purchase order.")))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const handleDelete = async () => {
    if (!purchase) return;
    setDeleting(true);
    try {
      const response = await purchaseService.remove(purchase.id);
      success(response.message || "Purchase order deleted.");
      navigate("/purchase");
    } catch (err) {
      toastError(getErrorMessage(err, "Unable to delete this purchase order."));
      setDeleting(false);
    }
  };

  const toggleStatus = async () => {
    if (!purchase) return;
    setStatusBusy(true);
    try {
      const next = purchase.status === "PENDING" ? "RECEIVED" : "PENDING";
      const response = await purchaseService.updateStatus(purchase.id, next);
      setPurchase(response.purchase);
      success(response.message || "Status updated.");
    } catch (err) {
      toastError(getErrorMessage(err, "Unable to update status."));
    } finally {
      setStatusBusy(false);
    }
  };

  if (loading) return <PageLoader label="Loading purchase order…" />;
  if (error || !purchase) {
    return (
      <Card>
        <ErrorState message={error || "Purchase order not found."} onRetry={load} />
      </Card>
    );
  }

  const totalQuantity = purchase.items.reduce((sum, item) => sum + item.quantity, 0);
  const received = purchase.status === "RECEIVED";

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={purchase.invoice_number}
        subtitle={`Supplier order · ${formatDate(purchase.date, "long")}`}
        backTo="/purchase"
        backLabel="Purchases"
        actions={
          <>
            <Button variant="outline" onClick={toggleStatus} loading={statusBusy}>
              {received ? <Clock3 className="size-4" /> : <CheckCircle2 className="size-4" />}
              Mark {received ? "pending" : "received"}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/purchase/${purchase.id}/edit`)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-indigo-50/60 via-white to-white px-5 py-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                  <Truck className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">
                    Purchase order
                  </p>
                  <p className="text-base font-bold text-slate-900">{purchase.invoice_number}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {purchase.items.length} line{purchase.items.length === 1 ? "" : "s"} ·{" "}
                {totalQuantity} units received into stock
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Order total
              </p>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(purchase.total_amount, true)}
              </p>
              <Badge tone={received ? "emerald" : "amber"} dot className="mt-1">
                {received ? "Received" : "Pending"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-100 px-5 py-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Order date
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDate(purchase.date, "long")}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Created by
              </p>
              <p className="mt-1 text-sm text-slate-700">{purchase.created_by_name}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Recorded
              </p>
              <p className="mt-1 text-sm text-slate-700">{formatDateTime(purchase.created_at)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5">#</th>
                  <th className="px-3 py-2.5">Item</th>
                  <th className="px-3 py-2.5 text-center">Qty</th>
                  <th className="px-3 py-2.5 text-right">Cost</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {purchase.items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 text-[11px] text-slate-400">{index + 1}</td>
                    <td className="px-3 py-3">
                      <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400">per {item.unit}</p>
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-slate-600">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-slate-600">
                      {formatCurrency(item.price, true)}
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
                <span>Subtotal</span>
                <span className="font-medium text-slate-700">
                  {formatCurrency(purchase.subtotal, true)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Paid</span>
                <span className="font-medium text-emerald-600">
                  {formatCurrency(purchase.paid_amount, true)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Balance due</span>
                <span
                  className={
                    toNumber(purchase.due_amount) > 0
                      ? "font-semibold text-rose-600"
                      : "font-medium text-slate-700"
                  }
                >
                  {formatCurrency(purchase.due_amount, true)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-slate-300 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Grand total
                </span>
                <span className="text-base font-bold text-slate-900">
                  {formatCurrency(purchase.total_amount, true)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Details" description="Order metadata" />
            <CardBody className="space-y-3">
              <div className="flex items-center gap-3">
                <Hash className="size-4 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Invoice no.</p>
                  <p className="text-xs font-semibold text-slate-800">{purchase.invoice_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays className="size-4 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Order date</p>
                  <p className="text-xs font-semibold text-slate-800">{formatDate(purchase.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <UserRound className="size-4 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Created by</p>
                  <p className="text-xs font-semibold text-slate-800">{purchase.created_by_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="size-4 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Created at</p>
                  <p className="text-xs font-semibold text-slate-800">
                    {formatDateTime(purchase.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Wallet className="size-4 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Payment</p>
                  <p className="text-xs font-semibold text-slate-800">
                    {formatCurrency(purchase.paid_amount)} paid ·{" "}
                    {formatCurrency(purchase.due_amount)} due
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <PackageCheck className="size-4" /> Stock already received
            </p>
            <p className="mt-1 text-[11px] leading-5 text-emerald-700">
              These quantities were added to stock when the order was created. Deleting or editing
              the order reverses them, unless the stock has already been sold.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${purchase.invoice_number}?`}
        message="This removes the order and deducts the received quantities from stock. If the stock has been sold, deletion is blocked."
        confirmLabel="Delete order"
      />
    </div>
  );
}
