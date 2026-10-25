import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Info, Plus, Save, Trash2 } from "lucide-react";
import { billService } from "@/services/bill.service";
import { shopService } from "@/services/shop.service";
import { stockService } from "@/services/stock.service";
import { useToast } from "@/contexts/ToastContext";
import type { Bill, Shop, Stock } from "@/types";
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
  shop_id: z.number().min(1, "Choose a shop"),
  date: z.string().min(1, "Choose a date"),
  items: z.array(itemSchema).min(1, "Add at least one line item"),
});

type FormValues = z.infer<typeof schema>;
type FormInput = FormValues["items"][number];

function emptyLine(stock?: Stock): FormInput {
  return {
    stock_id: stock?.id ?? 0,
    quantity: 1,
    unit: stock?.unit ?? "pcs",
    price: stock ? toNumber(stock.price) : 0,
  };
}

export function BillForm({ mode, bill }: { mode: "create" | "edit"; bill?: Bill }) {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
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
    defaultValues: bill
      ? {
          shop_id: bill.shop.id,
          date: bill.date,
          items: bill.items.map((item) => ({
            stock_id: item.stock_id,
            quantity: item.quantity,
            unit: item.unit,
            price: toNumber(item.price),
          })),
        }
      : {
          shop_id: 0,
          date: new Date().toISOString().slice(0, 10),
          items: [emptyLine()],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  useEffect(() => {
    setLoading(true);
    Promise.all([shopService.all(), stockService.all()])
      .then(([shopList, stockList]) => {
        setShops(shopList);
        setStocks(stockList);
        if (mode === "create") {
          if (shopList.length === 1) setValue("shop_id", shopList[0].id);
          setValue("items", [emptyLine(stockList[0])]);
        }
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Unable to load shops and stock.")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const stockMap = useMemo(() => new Map(stocks.map((stock) => [stock.id, stock])), [stocks]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    let quantity = 0;
    (watchedItems ?? []).forEach((line) => {
      const stock = stockMap.get(Number(line.stock_id));
      const price = Number(line.price) || 0;
      const qty = Number(line.quantity) || 0;
      const amount = price * qty;
      const rate = stock ? toNumber(stock.gst_rate ?? 5) : 5;
      subtotal += amount;
      tax += (amount * rate) / 100;
      quantity += qty;
    });
    return {
      subtotal: round2(subtotal),
      tax: round2(tax),
      total: round2(subtotal + tax),
      quantity,
    };
  }, [watchedItems, stockMap]);

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
    const payload = {
      shop_id: values.shop_id,
      date: values.date,
      items: values.items.map((item) => ({
        stock_id: item.stock_id,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
      })),
    };
    try {
      if (mode === "edit" && bill) {
        const updated = await billService.update(bill.id, payload);
        success(`Bill ${updated.invoice_number} updated.`);
        navigate(`/bills/${updated.id}`);
      } else {
        const created = await billService.create(payload);
        success(`Bill ${created.invoice_number} created and stock updated.`);
        navigate(`/bills/${created.id}`);
      }
    } catch (err) {
      const message = getErrorMessage(err, "Unable to save this bill.");
      setServerError(message);
      toastError(message);
    }
  };

  if (loading) return <PageLoader label="Preparing the bill form…" />;

  if (loadError) {
    return (
      <Card>
        <InlineError message={loadError} />
      </Card>
    );
  }

  const title = mode === "edit" ? `Edit ${bill?.invoice_number ?? "bill"}` : "Create a new bill";
  const subtitle =
    mode === "edit"
      ? "Changing line items rebalances stock automatically. Old quantities are restored before new ones are deducted."
      : "Pick a shop, add items and save. Stock is deducted in a single transaction and an invoice number is generated.";

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={title}
        subtitle={subtitle}
        backTo={mode === "edit" && bill ? `/bills/${bill.id}` : "/bills"}
        backLabel="Bills"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Bill details" description="Customer and invoice date" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Shop" required error={errors.shop_id?.message}>
                <Select
                  {...register("shop_id", {
                    setValueAs: (value) => (value === "" ? 0 : Number(value)),
                  })}
                >
                  <option value={0}>Select a shop…</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                      {shop.gst_no ? ` · GST ${shop.gst_no}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Bill date" required error={errors.date?.message}>
                <Input type="date" {...register("date")} />
              </Field>
              {!shops.length && (
                <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
                  No shops yet.{" "}
                  <Link to="/shops/new" className="font-semibold underline">
                    Add a shop
                  </Link>{" "}
                  before creating a bill.
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Line items"
              description="Price and unit prefill from stock and can be adjusted"
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
            <div className="hidden grid-cols-[minmax(0,1fr)_74px_104px_104px_32px] gap-2 border-b border-slate-100 px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:grid">
              <span>Item</span>
              <span>Qty</span>
              <span>Rate (₹)</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            <div className="divide-y divide-slate-100">
              {fields.map((field, index) => {
                const stock = stockMap.get(Number(watchedItems?.[index]?.stock_id));
                const lineTotal =
                  toNumber(watchedItems?.[index]?.price) *
                  toNumber(watchedItems?.[index]?.quantity);
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_74px_104px_104px_32px] sm:items-start sm:px-5"
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
                              Available{" "}
                              <span className="font-semibold text-slate-500">
                                {stock.quantity} {stock.unit}
                              </span>
                            </span>
                            <span>·</span>
                            <span>GST {toNumber(stock.gst_rate ?? 5)}%</span>
                            {stock.sku && (
                              <>
                                <span>·</span>
                                <span>{stock.sku}</span>
                              </>
                            )}
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
                        Rate
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
            <CardHeader title="Summary" description="Final tax is recalculated on save" />
            <CardBody className="space-y-3">
              {serverError && <InlineError message={serverError} />}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(totals.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>GST (estimated)</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(totals.tax)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Total
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(totals.total)}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-indigo-50/70 px-3 py-2.5 text-[11px] leading-4 text-indigo-700">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  Saving deducts stock immediately and snapshots MRP, HSN and GST rate onto the
                  invoice.
                </p>
              </div>
              <Button type="submit" className="w-full" loading={isSubmitting}>
                <Save className="size-4" />
                {mode === "edit" ? "Save changes" : "Create bill"}
              </Button>
              <Link
                to={mode === "edit" && bill ? `/bills/${bill.id}` : "/bills"}
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
