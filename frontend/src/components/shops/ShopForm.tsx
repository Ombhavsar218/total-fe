import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Info,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
} from "lucide-react";
import { shopService } from "@/services/shop.service";
import { useToast } from "@/contexts/ToastContext";
import type { Shop } from "@/types";
import { formatDate, getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { InlineError } from "@/components/ui/feedback";

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const schema = z.object({
  name: z.string().trim().min(1, "Shop name is required").max(120, "Keep it under 120 characters"),
  address: z.string().trim().min(1, "Address is required").max(500, "Address is too long"),
  phone: z
    .string()
    .trim()
    .max(20, "Phone is too long")
    .refine((value) => !value || /^[0-9+\-()\s]{6,20}$/.test(value), "Enter a valid phone number"),
  email: z
    .string()
    .trim()
    .max(120, "Email is too long")
    .refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid email address",
    ),
  gst_no: z
    .string()
    .trim()
    .max(15, "GSTIN must be 15 characters")
    .refine((value) => !value || GSTIN.test(value.toUpperCase()), "Enter a valid 15-character GSTIN"),
  fssai_no: z
    .string()
    .trim()
    .max(14, "FSSAI licence is 14 digits")
    .refine((value) => !value || /^\d{14}$/.test(value), "FSSAI licence must be 14 digits"),
  state_code: z
    .string()
    .trim()
    .max(2, "State code is 2 digits")
    .refine((value) => !value || /^\d{2}$/.test(value), "Use the 2-digit GST state code"),
});

type FormValues = z.infer<typeof schema>;

export function ShopForm({ mode, shop }: { mode: "create" | "edit"; shop?: Shop }) {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: shop?.name ?? "",
      address: shop?.address ?? "",
      phone: shop?.phone ?? "",
      email: shop?.email ?? "",
      gst_no: shop?.gst_no ?? "",
      fssai_no: shop?.fssai_no ?? "",
      state_code: shop?.state_code ?? "",
    },
  });

  const values = watch();
  const preview = useMemo(
    () => ({
      name: values.name?.trim() || "Your shop name",
      address: values.address?.trim() || "Shop address appears on every invoice",
      gst: values.gst_no?.trim().toUpperCase() || "",
      fssai: values.fssai_no?.trim() || "",
    }),
    [values.name, values.address, values.gst_no, values.fssai_no],
  );

  const onSubmit = async (form: FormValues) => {
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      gst_no: form.gst_no.trim().toUpperCase(),
      fssai_no: form.fssai_no.trim(),
      state_code: form.state_code.trim(),
    };
    try {
      if (mode === "edit" && shop) {
        const updated = await shopService.update(shop.id, payload);
        success(`${updated.name} updated.`);
        navigate(`/shops/${updated.id}`);
      } else {
        const created = await shopService.create(payload);
        success(`${created.name} added.`);
        navigate(`/shops/${created.id}`);
      }
    } catch (err) {
      const message = getErrorMessage(err, "Unable to save this shop.");
      setError("root", { message });
      toastError(message);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={mode === "edit" ? `Edit ${shop?.name ?? "shop"}` : "Add a shop"}
        subtitle={
          mode === "edit"
            ? "Changes apply to future invoices. Existing bills keep the customer details captured at the time of sale."
            : "Customer address, GSTIN and FSSAI details are snapshotted onto every invoice you raise."
        }
        backTo={mode === "edit" && shop ? `/shops/${shop.id}` : "/shops"}
        backLabel="Shops"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Shop details"
              description="The name and address printed on invoices"
              action={<MapPin className="size-4 text-slate-300" />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              {errors.root?.message && (
                <div className="sm:col-span-2">
                  <InlineError message={errors.root.message} />
                </div>
              )}
              <Field
                label="Shop name"
                htmlFor="name"
                required
                error={errors.name?.message}
                className="sm:col-span-2"
              >
                <Input id="name" placeholder="e.g. Sharma General Store" {...register("name")} />
              </Field>
              <Field
                label="Address"
                htmlFor="address"
                required
                error={errors.address?.message}
                hint="Street, area, city and PIN code"
                className="sm:col-span-2"
              >
                <Textarea
                  id="address"
                  rows={3}
                  placeholder="12, MG Road, Near Bus Stand, Pune – 411001"
                  {...register("address")}
                />
              </Field>
              <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
                <Input id="phone" placeholder="98765 43210" {...register("phone")} />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" placeholder="shop@example.com" {...register("email")} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Tax & licences"
              description="Optional, but required for GST-compliant invoices"
              action={<ShieldCheck className="size-4 text-slate-300" />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field
                label="GSTIN"
                htmlFor="gst_no"
                error={errors.gst_no?.message}
                hint="15 characters, e.g. 27AABCU9603R1ZX"
              >
                <Input
                  id="gst_no"
                  maxLength={15}
                  placeholder="27AABCU9603R1ZX"
                  className="uppercase"
                  {...register("gst_no")}
                  onBlur={(event) => setValue("gst_no", event.target.value.toUpperCase())}
                />
              </Field>
              <Field
                label="FSSAI licence"
                htmlFor="fssai_no"
                error={errors.fssai_no?.message}
                hint="14-digit food licence number"
              >
                <Input id="fssai_no" maxLength={14} placeholder="12345678901234" {...register("fssai_no")} />
              </Field>
              <Field
                label="GST state code"
                htmlFor="state_code"
                error={errors.state_code?.message}
                hint="Place of supply, e.g. 27 for Maharashtra"
              >
                <Input id="state_code" maxLength={2} placeholder="27" {...register("state_code")} />
              </Field>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-[11px] leading-5 text-slate-500 sm:col-span-2">
                <span className="flex items-start gap-2">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                  <span>
                    GSTIN and FSSAI are optional. When present they print on the invoice and are
                    frozen into each bill’s customer snapshot, so editing this shop later never
                    rewrites history.
                  </span>
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="xl:sticky xl:top-20">
            <CardHeader title="Invoice preview" description="How the shop block will look" />
            <CardBody className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">{preview.name}</p>
                    <p className="text-[10px] text-slate-400">Billed to</p>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-[11px] leading-5 text-slate-500">
                  {preview.address}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {preview.gst ? (
                    <Badge tone="indigo">GST {preview.gst}</Badge>
                  ) : (
                    <Badge tone="slate">No GSTIN</Badge>
                  )}
                  {preview.fssai && <Badge tone="sky">FSSAI {preview.fssai}</Badge>}
                </div>
              </div>

              <div className="space-y-2 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 text-slate-400" />
                  <span>{values.phone?.trim() || "Phone not provided"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-slate-400" />
                  <span>{values.email?.trim() || "Email not provided"}</span>
                </div>
              </div>

              {mode === "edit" && shop && (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                  Added {formatDate(shop.created_at)} · Owner {shop.owner.full_name}
                </div>
              )}

              <Button type="submit" className="w-full" loading={isSubmitting}>
                <Save className="size-4" /> {mode === "edit" ? "Save changes" : "Add shop"}
              </Button>
              <Link
                to={mode === "edit" && shop ? `/shops/${shop.id}` : "/shops"}
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
