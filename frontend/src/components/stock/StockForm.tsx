import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  History,
  Info,
  PackageCheck,
  Save,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { stockService } from "@/services/stock.service";
import { useToast } from "@/contexts/ToastContext";
import type { Stock } from "@/types";
import { cn, formatCurrency, formatNumber, getErrorMessage, toNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { InlineError } from "@/components/ui/feedback";
import { StockHistoryModal } from "@/components/stock/StockHistory";

const UNITS = ["pcs", "kg", "liters", "boxes", "packets"] as const;

const schema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(120, "Keep it under 120 characters"),
  sku: z.string().trim().max(50, "SKU is too long"),
  quantity: z.number().int("Use a whole number").min(0, "Quantity cannot be negative"),
  unit: z.enum(UNITS),
  price: z.number().min(0, "Price cannot be negative"),
  mrp: z.number().min(0, "MRP cannot be negative").nullable(),
  hsn_code: z.string().trim().max(20, "HSN is too long"),
  gst_rate: z.number().min(0, "Minimum 0%").max(100, "Maximum 100%"),
  min_stock: z.number().int("Use a whole number").min(0, "Minimum cannot be negative"),
  description: z.string().trim().max(500, "Description is too long"),
});

type FormValues = z.infer<typeof schema>;

export function StockForm({ mode, stock }: { mode: "create" | "edit"; stock?: Stock }) {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: stock?.name ?? "",
      sku: stock?.sku ?? "",
      quantity: stock?.quantity ?? 0,
      unit: (stock?.unit as (typeof UNITS)[number]) ?? "pcs",
      price: stock ? toNumber(stock.price) : 0,
      mrp: stock?.mrp ? toNumber(stock.mrp) : null,
      hsn_code: stock?.hsn_code ?? "",
      gst_rate: stock ? toNumber(stock.gst_rate ?? 5) : 5,
      min_stock: stock?.min_stock ?? 0,
      description: stock?.description ?? "",
    },
  });

  const values = watch();
  const quantity = Number(values.quantity) || 0;
  const price = Number(values.price) || 0;
  const mrp = values.mrp === null || values.mrp === undefined ? 0 : Number(values.mrp);
  const minStock = Number(values.min_stock) || 0;
  const stockValue = quantity * price;
  const margin = mrp && price ? ((mrp - price) / mrp) * 100 : 0;
  const willBeLow = minStock > 0 && quantity <= minStock;

  const statusBadge = useMemo(() => {
    if (quantity <= 0) return { label: "Out of stock", tone: "rose" as const };
    if (willBeLow) return { label: "Low stock", tone: "amber" as const };
    return { label: "In stock", tone: "emerald" as const };
  }, [quantity, willBeLow]);

  const onSubmit = async (form: FormValues) => {
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      quantity: form.quantity,
      unit: form.unit,
      price: form.price,
      mrp: form.mrp,
      hsn_code: form.hsn_code.trim(),
      gst_rate: form.gst_rate,
      min_stock: form.min_stock,
      description: form.description.trim(),
    };
    try {
      if (mode === "edit" && stock) {
        const updated = await stockService.update(stock.id, payload);
        success(`${updated.name} updated.`);
        navigate("/stock");
      } else {
        const created = await stockService.create(payload);
        success(`${created.name} added to stock.`);
        navigate("/stock");
      }
    } catch (err) {
      const message = getErrorMessage(err, "Unable to save this stock item.");
      setError("root", { message });
      toastError(message);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={mode === "edit" ? `Edit ${stock?.name ?? "stock item"}` : "Add a stock item"}
        subtitle={
          mode === "edit"
            ? "Quantity changes create a logged manual adjustment so the audit trail stays complete."
            : "Set the selling price, MRP, GST rate and minimum level used for low-stock alerts."
        }
        backTo="/stock"
        backLabel="Stock"
        actions={
          mode === "edit" && stock ? (
            <Button variant="outline" onClick={() => setHistoryOpen(true)}>
              <History className="size-4" /> Movement history
            </Button>
          ) : undefined
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Item details"
              description="How the item appears in bills and purchase orders"
              action={<Boxes className="size-4 text-slate-300" />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              {errors.root?.message && (
                <div className="sm:col-span-2">
                  <InlineError message={errors.root.message} />
                </div>
              )}
              <Field
                label="Item name"
                htmlFor="name"
                required
                error={errors.name?.message}
                className="sm:col-span-2"
              >
                <Input id="name" placeholder="e.g. Premium Basmati Rice 5kg" {...register("name")} />
              </Field>
              <Field label="SKU / code" htmlFor="sku" error={errors.sku?.message}>
                <Input id="sku" placeholder="RICE-5K" {...register("sku")} />
              </Field>
              <Field label="Unit" htmlFor="unit" error={errors.unit?.message}>
                <Select id="unit" {...register("unit")}>
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Description"
                htmlFor="description"
                error={errors.description?.message}
                className="sm:col-span-2"
              >
                <Textarea
                  id="description"
                  rows={2}
                  placeholder="Optional internal notes about this item"
                  {...register("description")}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Pricing & tax"
              description="Used to prefill bill lines and calculate GST"
              action={<TrendingUp className="size-4 text-slate-300" />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Selling price (₹)" htmlFor="price" required error={errors.price?.message}>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  {...register("price", { valueAsNumber: true })}
                />
              </Field>
              <Field label="MRP (₹)" htmlFor="mrp" error={errors.mrp?.message} hint="Optional printed MRP">
                <Input
                  id="mrp"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Optional"
                  {...register("mrp", {
                    setValueAs: (value) => (value === "" || value === null ? null : Number(value)),
                  })}
                />
              </Field>
              <Field
                label="GST rate (%)"
                htmlFor="gst_rate"
                error={errors.gst_rate?.message}
                hint="Split equally into SGST and CGST"
              >
                <Select id="gst_rate" {...register("gst_rate", { valueAsNumber: true })}>
                  {[0, 5, 12, 18, 28].map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="HSN code" htmlFor="hsn_code" error={errors.hsn_code?.message}>
                <Input id="hsn_code" placeholder="e.g. 1006" {...register("hsn_code")} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Quantity"
              description="Live on-hand count and the alert threshold"
              action={<PackageCheck className="size-4 text-slate-300" />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Quantity on hand"
                htmlFor="quantity"
                required
                error={errors.quantity?.message}
                hint={
                  mode === "edit"
                    ? "Changing this records a manual adjustment with your name."
                    : "Opening quantity is recorded as an opening-stock movement."
                }
              >
                <Input
                  id="quantity"
                  type="number"
                  min={0}
                  step={1}
                  {...register("quantity", { valueAsNumber: true })}
                />
              </Field>
              <Field
                label="Minimum stock"
                htmlFor="min_stock"
                error={errors.min_stock?.message}
                hint="Alert when quantity reaches this level"
              >
                <Input
                  id="min_stock"
                  type="number"
                  min={0}
                  step={1}
                  {...register("min_stock", { valueAsNumber: true })}
                />
              </Field>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-[11px] leading-5 text-slate-500 sm:col-span-2">
                <span className="flex items-start gap-2">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  <span>
                    Bills deduct stock inside a database transaction. If another user has already
                    sold the last unit, the save is rejected and nothing is partially applied.
                  </span>
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="xl:sticky xl:top-20">
            <CardHeader title="Live summary" description="Updates as you type" />
            <CardBody className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {values.name?.trim() || "Item name"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {values.sku?.trim() || "No SKU"} · {values.unit}
                    </p>
                  </div>
                  <Badge tone={statusBadge.tone} dot>
                    {statusBadge.label}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      On hand
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {formatNumber(quantity)} {values.unit}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      Stock value
                    </p>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(stockValue)}</p>
                  </div>
                </div>
                <div className="mt-2 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Selling price</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(price, true)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>MRP</span>
                    <span className="font-semibold text-slate-800">
                      {mrp ? formatCurrency(mrp, true) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST rate</span>
                    <span className="font-semibold text-slate-800">{values.gst_rate ?? 0}%</span>
                  </div>
                  {mrp > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Margin vs MRP</span>
                      <span
                        className={cn(
                          "font-semibold",
                          margin >= 0 ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "flex items-start gap-2 rounded-xl px-3 py-2.5 text-[11px] leading-4",
                  willBeLow
                    ? "bg-amber-50 text-amber-800"
                    : "bg-indigo-50/70 text-indigo-700",
                )}
              >
                {willBeLow ? (
                  <TrendingUp className="mt-0.5 size-3.5 shrink-0" />
                ) : (
                  <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                )}
                <p>
                  {willBeLow
                    ? "This item will trigger a low-stock alert on the dashboard."
                    : "Stock alerts use the minimum level. Keep it at zero to disable alerts."}
                </p>
              </div>

              <Button type="submit" className="w-full" loading={isSubmitting}>
                <Save className="size-4" /> {mode === "edit" ? "Save changes" : "Add to stock"}
              </Button>
              <Link
                to="/stock"
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
              >
                <ArrowLeft className="size-3.5" /> Cancel
              </Link>
            </CardBody>
          </Card>
        </div>
      </form>

      {mode === "edit" && stock && (
        <StockHistoryModal
          stock={stock}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}
