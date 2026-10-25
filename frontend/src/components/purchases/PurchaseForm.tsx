import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Info, PackagePlus, Plus, Save, Trash2 } from "lucide-react";
import { purchaseService } from "@/services/purchase.service";
import { stockService } from "@/services/stock.service";
import { useToast } from "@/contexts/ToastContext";
import type { Purchase, PurchaseStatus, Stock } from "@/types";
import { formatCurrency, getErrorMessage, round2, toNumber } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { InlineError, PageLoader } from "@/components/ui/feedback";

const itemSchema = z.object({
  stock_id: z.number().min(1, "Choose an item"),
  quantity: z.number().int("Use a whole number").min(1, "Min 1"),
  unit: z.string().min(1),
  price: z.number().min(0, "Price cannot be negative"),
});

const schema = z.object({
  date: z.string().min(1, "Choose a date"),
  invoice_number: z.string().trim().max(64, "Invoice number is too long"),
  paid_amount: z.number().min(0, "Paid amount cannot be negative"),
  status: z.enum(["PENDING", "RECEIVED"]),
  items: z.array(itemSchema).min(1, "Add at least one line item"),
});

type FormValues = z.infer<typeof schema>;
type FormLine = FormValues["items"][number];

function emptyLine(stock?: Stock): FormLine {
  return {
    stock_id: stock?.id ?? 0,
    quantity: 1,
    unit: stock?.unit ?? "pcs",
    price: stock ? toNumber(stock.price) : 0,
  };
}

export function PurchaseForm({ mode, purchase }: { mode: "create" | "edit"; purchase?: Purchase }) {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [serverError, setServerError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: purchase
      ? {
          date: purchase.date,
          invoice_number: purchase.invoice_number,
          paid_amount: toNumber(purchase.paid_amount),
          status: purchase.status,
          items: purchase.items.map((item) => ({
            stock_id: item.stock_id,
            quantity: item.quantity,
            unit: item.unit,
            price: toNumber(item.price),
          })),
        }
      : {
          date: new Date().toISOString().slice(0, 10),
          invoice_number: "",
          paid_amount: 0,
          status: "PENDING",
          items: [emptyLine()],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const paid = watch("paid_amount");

  useEffect(() => {
    setLoading(true);
    stockService
      .all()
      .then((list) => {
        setStocks(list);
        if (mode === "create") {
          setValue("items", [emptyLine(list[0])]);
        }
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Unable to load stock items.")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const stockMap = useMemo(() => new Map(stocks.map((stock) => [stock.id, stock])), [stocks]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let quantity = 0;
    (watchedItems ?? []).forEach((line) => {
      subtotal += (Number(line.price) || 0) * (Number(line.quantity) || 0);
      quantity += Number(line.quantity) || 0;
    });
    const total = round2(subtotal);
    const paidValue = Number(paid) || 0;
    return {
      subtotal: total,
      total,
      paid: round2(paidValue),
      due: round2(Math.max(total - paidValue, 0)),
      overpaid: paidValue > total + 0.001,
      quantity,
    };
  }, [watchedItems, paid]);

  const handleStockChange = (index: number, value: string) => {
    const stockId = Number(value);
    const stock = stockMap.get(stockId);
    setValue(`items.${index}.stock_id`, stockId, { shouldValidate: true });
    if (stock) {
      setValue(`items.${index}.unit`, stock.unit);
      setValue(`items.${index}.price`, toNumber(stock.price), { shouldValidate: true });
    }
  };

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    if (totals.overpaid) {
      const message = "Paid amount cannot be greater than the order total.";
      setServerError(message);
      toastError(message);
      return;
    }
    const payload = {
      date: values.date,
      invoice_number: values.invoice_number.trim(),
      paid_amount: values.paid_amount,
      items: values.items.map((item) => ({
        stock_id: item.stock_id,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
      })),
    };
    try {
      if (mode === "edit" && purchase) {
        const updated = await purchaseService.update(purchase.id, {
          ...payload,
          status: values.status as PurchaseStatus,
        });
        success(`Purchase order ${updated.invoice_number} updated.`);
        navigate(`/purchase/${updated.id}`);
      } else {
        const created = await purchaseService.create(payload);
        success(`Purchase order ${created.invoice_number} created and stock received.`);
        navigate(`/purchase/${created.id}`);
      }
    } catch (err) {
      const message = getErrorMessage(err, "Unable to save this purchase order.");
      setServerError(message);
      toastError(message);
    }
  };

  if (loading) return <PageLoader label="Preparing the purchase form…" />;

  if (loadError) {
    return (
      <Card>
        <InlineError message={loadError} />
      </Card>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={
          mode === "edit"
            ? `Edit ${purchase?.invoice_number ?? "purchase order"}`
            : "New purchase order"
        }
        subtitle={
          mode === "edit"
            ? "Editing lines reverses the old quantities before applying the new ones. Stock already sold cannot be reversed."
            : "Record incoming stock from a supplier. Quantities are added to stock as soon as you save."
        }
        backTo={mode === "edit" && purchase ? `/purchase/${purchase.id}` : "/purchase"}
        backLabel="Purchases"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Order details" description="Supplier invoice and payment" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              {serverError && (
                <div className="sm:col-span-2">
                  <InlineError message={serverError} />
                </div>
              )}
              <Field label="Order date" required error={errors.date?.message}>
                <Input type="date" {...register("date")} />
              </Field>
              <Field
                label="Supplier invoice no."
                error={errors.invoice_number?.message}
                hint="Leave blank to auto-generate PO-0001"
              >
                <Input placeholder="Optional" {...register("invoice_number")} />
              </Field>
              <Field
                label="Amount paid (₹)"
                error={errors.paid_amount?.message}
                hint="Must not exceed the order total"
              >
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register("paid_amount", { valueAsNumber: true })}
                />
              </Field>
              {mode === "edit" && (
                <Field label="Status" error={errors.status?.message}>
                  <Select {...register("status")}>
                    <option value="PENDING">Pending</option>
                    <option value="RECEIVED">Received</option>
                  </Select>
                </Field>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Incoming items"
              description="Stock increases by these quantities on save"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(emptyLine(stocks[0]))}
                >
                  <Plus className="size-3.5" /> Add item
                </Button>
              }
            />
            <div className="hidden grid-cols-[minmax(0,1fr)_74px_104px_110px_32px] gap-2 border-b border-slate-100 px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:grid">
              <span>Item</span>
              <span>Qty</span>
              <span>Cost (₹)</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="divide-y divide-slate-100">
              {fields.map((field, index) => {
                const stock = stockMap.get(Number(watchedItems?.[index]?.stock_id));
                const lineTotal =
                  toNumber(watchedItems?.[index]?.price) * toNumber(watchedItems?.[index]?.quantity);
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_74px_104px_110px_32px] sm:items-start sm:px-5"
                  >
                    <div className="col-span-2 sm:col-span-1">
                      <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400 sm:hidden">
                        Item
                      </span>
                      <Select
                        value={watchedItems?.[index]?.stock_id ?? 0}
                        onChange={(event) => handleStockChange(index, event.target.value)}
                      >
                        <option value={0}>Select item…</option>
                        {stocks.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} · {option.quantity} {option.unit}
                          </option>
                        ))}
                      </Select>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400">
                        {stock ? (
                          <>
                            <span>
                              On hand{" "}
                              <span className="font-semibold text-slate-500">
                                {stock.quantity} {stock.unit}
                              </span>
                            </span>
                            <span>·</span>
                            <span>GST {toNumber(stock.gst_rate ?? 5)}%</span>
                          </>
                        ) : (
                          <span className="text-rose-400">Select an item</span>
                        )}
                      </div>
                      {errors.items?.[index]?.stock_id && (
                        <p className="mt-1 text-[11px] font-medium text-rose-600">
                          {errors.items[index]?.stock_id?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400 sm:hidden">
                        Qty
                      </span>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        className="px-2 text-center"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="mt-1 text-[10px] font-medium text-rose-600">
                          {errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400 sm:hidden">
                        Cost
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="px-2"
                        {...register(`items.${index}.price`, { valueAsNumber: true })}
                      />
                      {errors.items?.[index]?.price && (
                        <p className="mt-1 text-[10px] font-medium text-rose-600">
                          {errors.items[index]?.price?.message}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400 sm:hidden">
                        Amount
                      </span>
                      <p className="pt-2.5 text-xs font-semibold text-slate-700">
                        {formatCurrency(lineTotal)}
                      </p>
                    </div>
                    <div className="flex justify-end pt-1.5">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                        aria-label="Remove line"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-2.5">
              <p className="text-[11px] text-slate-400">
                {totals.quantity} unit{totals.quantity === 1 ? "" : "s"} across {fields.length} line
                {fields.length === 1 ? "" : "s"}
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={() => append(emptyLine(stocks[0]))}>
                <Plus className="size-3.5" /> Add another
              </Button>
            </div>
            {errors.items?.message && (
              <p className="border-t border-rose-100 bg-rose-50 px-5 py-2 text-xs font-medium text-rose-600">
                {errors.items.message}
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="xl:sticky xl:top-20">
            <CardHeader title="Summary" description="Payment and stock impact" />
            <CardBody className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(totals.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Total</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(totals.total)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Paid</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(totals.paid)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Balance due
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(totals.due)}
                  </span>
                </div>
              </div>
              {totals.overpaid && (
                <InlineError message="Paid amount is greater than the order total. Reduce it before saving." />
              )}
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50/70 px-3 py-2.5 text-[11px] leading-4 text-emerald-800">
                <PackagePlus className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  Saving adds every quantity to stock and records a purchase movement for each item.
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-indigo-50/70 px-3 py-2.5 text-[11px] leading-4 text-indigo-700">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  Purchase totals use the cost price entered here. GST is tracked on the stock item
                  when it is sold, not on the purchase order.
                </p>
              </div>
              <Button type="submit" className="w-full" loading={isSubmitting}>
                <Save className="size-4" />
                {mode === "edit" ? "Save changes" : "Create order"}
              </Button>
              <Link
                to={mode === "edit" && purchase ? `/purchase/${purchase.id}` : "/purchase"}
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
              >
                <ArrowLeft className="size-3.5" /> Cancel
              </Link>
            </CardBody>
          </Card>
        </div>
      </form>
    </div>
  );
}
