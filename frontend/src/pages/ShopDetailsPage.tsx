import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Fingerprint,
  IndianRupee,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Printer,
  Receipt,
  Trash2,
  UserRound,
} from "lucide-react";
import { shopService } from "@/services/shop.service";
import { billService } from "@/services/bill.service";
import { useToast } from "@/contexts/ToastContext";
import type { BillSummary, Paginated, Shop } from "@/types";
import { formatCurrency, formatDate, formatDateTime, formatNumber, getErrorMessage, todayISO, toNumber } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/feedback";

interface ShopDetailData {
  shop: Shop;
  today: Paginated<BillSummary>;
  recent: Paginated<BillSummary>;
}

export function ShopDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<ShopDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    Promise.all([
      shopService.get(id),
      billService.list({ shop_id: Number(id), date: todayISO(), page: 1, page_size: 100 }),
      billService.list({ shop_id: Number(id), page: 1, page_size: 5, ordering: "newest" }),
    ])
      .then(([shop, today, recent]) => setData({ shop, today, recent }))
      .catch((err) => setError(getErrorMessage(err, "Unable to load this shop.")))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const handleDelete = async () => {
    if (!data) return;
    setDeleting(true);
    try {
      const response = await shopService.remove(data.shop.id);
      success(response.message || "Shop deleted.");
      navigate("/shops");
    } catch (err) {
      toastError(getErrorMessage(err, "Unable to delete this shop."));
      setDeleting(false);
    }
  };

  if (loading) return <PageLoader label="Loading shop…" />;
  if (error || !data) {
    return (
      <Card>
        <ErrorState message={error || "Shop not found."} onRetry={load} />
      </Card>
    );
  }

  const { shop, today, recent } = data;
  const todayRevenue = today.results.reduce((sum, bill) => sum + toNumber(bill.total_amount), 0);
  const todayTax = today.results.reduce((sum, bill) => sum + toNumber(bill.tax_amount), 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={shop.name}
        subtitle={shop.address}
        backTo="/shops"
        backLabel="Shops"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  `/print/shop/${shop.id}?date=${todayISO()}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <Printer className="size-4" /> Print today’s invoice
            </Button>
            <Button variant="outline" onClick={() => navigate(`/shops/${shop.id}/edit`)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Total invoices"
          value={formatNumber(recent.count)}
          hint="All time"
          icon={Receipt}
          tone="indigo"
        />
        <StatCard
          label="Today’s bills"
          value={formatNumber(today.count)}
          hint={formatDate(todayISO(), "long")}
          icon={CalendarDays}
          tone="sky"
        />
        <StatCard
          label="Today’s revenue"
          value={formatCurrency(todayRevenue)}
          hint={`Tax ${formatCurrency(todayTax)}`}
          icon={IndianRupee}
          tone="emerald"
        />
        <StatCard
          label="Average bill"
          value={formatCurrency(today.count ? todayRevenue / today.count : 0)}
          hint="Today only"
          icon={Building2}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-indigo-50/60 via-white to-white px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
                <Building2 className="size-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{shop.name}</h2>
                <p className="mt-0.5 flex items-start gap-1 text-xs leading-5 text-slate-500">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" /> {shop.address}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {shop.gst_no ? (
                    <Badge tone="indigo">GST {shop.gst_no}</Badge>
                  ) : (
                    <Badge tone="slate">No GSTIN</Badge>
                  )}
                  {shop.fssai_no && <Badge tone="sky">FSSAI {shop.fssai_no}</Badge>}
                  {shop.state_code && <Badge tone="violet">State {shop.state_code}</Badge>}
                </div>
              </div>
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => navigate(`/bills/shop/${shop.id}?date=${todayISO()}`)}
            >
              <Receipt className="size-3.5" /> Bill sheet
            </Button>
          </div>

          <CardBody className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Contact
              </p>
              <div className="flex items-center gap-2.5 text-sm text-slate-700">
                <Phone className="size-4 text-slate-400" />
                {shop.phone || "Phone not provided"}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-slate-700">
                <Mail className="size-4 text-slate-400" />
                {shop.email || "Email not provided"}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-slate-700">
                <Fingerprint className="size-4 text-slate-400" />
                {shop.gst_no || "GSTIN not provided"}
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Record
              </p>
              <div className="flex items-center gap-2.5 text-sm text-slate-700">
                <UserRound className="size-4 text-slate-400" />
                {shop.owner.full_name}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-slate-700">
                <CalendarDays className="size-4 text-slate-400" />
                Created {formatDate(shop.created_at)}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-slate-700">
                <CalendarDays className="size-4 text-slate-400" />
                Updated {formatDateTime(shop.updated_at)}
              </div>
            </div>
          </CardBody>

          <div className="border-t border-slate-100">
            <CardHeader
              title="Recent invoices"
              description="The five most recent bills for this shop"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/bills/shop/${shop.id}?date=${todayISO()}`)}
                >
                  Open bill sheet <ExternalLink className="size-3" />
                </Button>
              }
            />
            {recent.results.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-2.5">Invoice</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5 text-center">Items</th>
                      <th className="px-3 py-2.5">Created by</th>
                      <th className="px-5 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recent.results.map((bill) => (
                      <tr
                        key={bill.id}
                        onClick={() => navigate(`/bills/${bill.id}`)}
                        className="cursor-pointer transition hover:bg-indigo-50/30"
                      >
                        <td className="px-5 py-3 text-xs font-semibold text-indigo-600">
                          {bill.invoice_number}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-slate-500">
                          {formatDate(bill.date)}
                        </td>
                        <td className="px-3 py-3 text-center text-xs text-slate-600">
                          {bill.items_count}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-slate-500">
                          {bill.created_by_name}
                        </td>
                        <td className="px-5 py-3 text-right text-xs font-bold text-slate-900">
                          {formatCurrency(bill.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Receipt}
                title="No invoices yet"
                message="Bills raised for this shop will appear here."
                action={
                  <Button size="sm" onClick={() => navigate("/bills/new")}>
                    <Plus className="size-3.5" /> New bill
                  </Button>
                }
              />
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Quick actions" description="Jump straight into work" />
            <CardBody className="space-y-2">
              <Button className="w-full" onClick={() => navigate("/bills/new")}>
                <Plus className="size-4" /> Create a bill
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/bills/shop/${shop.id}?date=${todayISO()}`)}
              >
                <Receipt className="size-4" /> Today’s bill sheet
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(`/print/shop/${shop.id}?date=${todayISO()}`, "_blank")}
              >
                <Printer className="size-4" /> Print consolidated invoice
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/shops/${shop.id}/edit`)}
              >
                <Pencil className="size-4" /> Edit shop details
              </Button>
            </CardBody>
          </Card>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-xs font-semibold text-amber-900">Invoice snapshots stay frozen</p>
            <p className="mt-1 text-[11px] leading-5 text-amber-800/80">
              Editing this shop updates future invoices only. Bills already raised keep the name,
              address and tax details captured at the time of sale.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${shop.name}?`}
        message="This permanently removes the shop. If it has any bills attached, delete those bills first."
        confirmLabel="Delete shop"
      />
    </div>
  );
}
