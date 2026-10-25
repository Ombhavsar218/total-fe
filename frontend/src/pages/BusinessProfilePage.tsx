import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  CircleDashed,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { businessService } from "@/services/dashboard.service";
import { useToast } from "@/contexts/ToastContext";
import type { BusinessProfile } from "@/types";
import { cn, formatDate, getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ErrorState, InlineError, PageLoader } from "@/components/ui/feedback";

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const schema = z.object({
  name: z.string().trim().min(2, "Business name is required").max(150, "Keep it under 150 characters"),
  address: z.string().trim().min(5, "Address is required").max(500, "Address is too long"),
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
  state_code: z
    .string()
    .trim()
    .max(2, "State code is 2 digits")
    .refine((value) => !value || /^\d{2}$/.test(value), "Use the 2-digit GST state code"),
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
  bank_name: z.string().trim().max(120, "Bank name is too long"),
  bank_account_no: z.string().trim().max(30, "Account number is too long"),
  bank_branch: z.string().trim().max(120, "Branch is too long"),
  bank_ifsc: z
    .string()
    .trim()
    .max(11, "IFSC is 11 characters")
    .refine(
      (value) => !value || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase()),
      "Enter a valid 11-character IFSC code",
    ),
});

type FormValues = z.infer<typeof schema>;

function toFormValues(profile: BusinessProfile): FormValues {
  return {
    name: profile.name ?? "",
    address: profile.address ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    state_code: profile.state_code ?? "",
    gst_no: profile.gst_no ?? "",
    fssai_no: profile.fssai_no ?? "",
    bank_name: profile.bank_name ?? "",
    bank_account_no: profile.bank_account_no ?? "",
    bank_branch: profile.bank_branch ?? "",
    bank_ifsc: profile.bank_ifsc ?? "",
  };
}

export function BusinessProfilePage() {
  const { success, error: toastError } = useToast();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues({
      id: 0,
      name: "",
      address: "",
      phone: "",
      email: "",
      state_code: "",
      gst_no: "",
      fssai_no: "",
      bank_name: "",
      bank_account_no: "",
      bank_branch: "",
      bank_ifsc: "",
      updated_at: "",
    }),
  });

  const load = () => {
    setLoading(true);
    setLoadError("");
    businessService
      .get()
      .then((data) => {
        setProfile(data);
        reset(toFormValues(data));
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Unable to load the business profile.")))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const values = watch();

  const completeness = useMemo(() => {
    const checks = [
      Boolean(values.name?.trim()),
      Boolean(values.address?.trim()),
      Boolean(values.phone?.trim()),
      Boolean(values.email?.trim()),
      Boolean(values.gst_no?.trim()),
      Boolean(values.fssai_no?.trim()),
      Boolean(values.bank_name?.trim()),
      Boolean(values.bank_account_no?.trim()),
      Boolean(values.bank_ifsc?.trim()),
    ];
    return { done: checks.filter(Boolean).length, total: checks.length };
  }, [values]);

  const onSubmit = async (form: FormValues) => {
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      state_code: form.state_code.trim(),
      gst_no: form.gst_no.trim().toUpperCase(),
      fssai_no: form.fssai_no.trim(),
      bank_name: form.bank_name.trim(),
      bank_account_no: form.bank_account_no.trim(),
      bank_branch: form.bank_branch.trim(),
      bank_ifsc: form.bank_ifsc.trim().toUpperCase(),
    };
    try {
      const updated = await businessService.update(payload);
      setProfile(updated);
      reset(toFormValues(updated));
      success("Business profile saved. New invoices will use these details.");
    } catch (err) {
      const message = getErrorMessage(err, "Unable to save the business profile.");
      setError("root", { message });
      toastError(message);
    }
  };

  if (loading && !profile) return <PageLoader label="Loading business profile…" />;
  if (loadError && !profile) {
    return (
      <Card>
        <ErrorState message={loadError} onRetry={load} />
      </Card>
    );
  }

  const pct = Math.round((completeness.done / completeness.total) * 100);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Business profile"
        subtitle="Your company identity, tax registrations and bank details. These print on every invoice."
        backTo="/settings"
        backLabel="Settings"
        actions={
          <Button
            variant="outline"
            onClick={() => window.open("/print/all", "_blank")}
            className="hidden sm:inline-flex"
          >
            <BadgeCheck className="size-4" /> Preview print pack
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Company identity"
              description="Shown in the invoice header"
              action={<Building2 className="size-4 text-slate-300" />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              {errors.root?.message && (
                <div className="sm:col-span-2">
                  <InlineError message={errors.root.message} />
                </div>
              )}
              <Field
                label="Business name"
                htmlFor="name"
                required
                error={errors.name?.message}
                className="sm:col-span-2"
              >
                <Input id="name" placeholder="e.g. TotalStock Distributors" {...register("name")} />
              </Field>
              <Field
                label="Registered address"
                htmlFor="address"
                required
                error={errors.address?.message}
                hint="Street, area, city, state and PIN code"
                className="sm:col-span-2"
              >
                <Textarea
                  id="address"
                  rows={3}
                  placeholder="14, Market Road, Andheri East, Mumbai – 400069"
                  {...register("address")}
                />
              </Field>
              <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
                <Input id="phone" placeholder="+91 98765 43210" {...register("phone")} />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" placeholder="billing@company.com" {...register("email")} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Tax registrations"
              description="Printed beside the business address"
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
                <Input
                  id="fssai_no"
                  maxLength={14}
                  placeholder="12345678901234"
                  {...register("fssai_no")}
                />
              </Field>
              <Field
                label="GST state code"
                htmlFor="state_code"
                error={errors.state_code?.message}
                hint="Home state used for CGST / SGST, e.g. 27"
              >
                <Input id="state_code" maxLength={2} placeholder="27" {...register("state_code")} />
              </Field>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-3 text-[11px] leading-5 text-indigo-700">
                <span className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Intra-state sales split tax into equal CGST and SGST halves. Keep the state code
                    accurate so invoices totalled here match your GST returns.
                  </span>
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Bank details"
              description="Printed in the invoice footer for NEFT / RTGS payments"
              action={<Landmark className="size-4 text-slate-300" />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Bank name" htmlFor="bank_name" error={errors.bank_name?.message}>
                <Input id="bank_name" placeholder="e.g. HDFC Bank" {...register("bank_name")} />
              </Field>
              <Field
                label="Account number"
                htmlFor="bank_account_no"
                error={errors.bank_account_no?.message}
              >
                <Input id="bank_account_no" placeholder="00012345678901" {...register("bank_account_no")} />
              </Field>
              <Field label="Branch" htmlFor="bank_branch" error={errors.bank_branch?.message}>
                <Input id="bank_branch" placeholder="Andheri East" {...register("bank_branch")} />
              </Field>
              <Field
                label="IFSC code"
                htmlFor="bank_ifsc"
                error={errors.bank_ifsc?.message}
                hint="11 characters, e.g. HDFC0001234"
              >
                <Input
                  id="bank_ifsc"
                  maxLength={11}
                  placeholder="HDFC0001234"
                  className="uppercase"
                  {...register("bank_ifsc")}
                  onBlur={(event) => setValue("bank_ifsc", event.target.value.toUpperCase())}
                />
              </Field>
              <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] leading-5 text-slate-500 sm:col-span-2">
                Bank details are optional. When present, they appear under “Payment details” on
                consolidated invoices and the daily print pack.
              </div>
            </CardBody>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-card">
            <p className="text-[11px] leading-5 text-slate-500">
              Changes apply to future invoices only. Bills already raised keep their frozen business
              snapshot.
            </p>
            <Button type="submit" loading={isSubmitting}>
              <Save className="size-4" /> Save profile
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="xl:sticky xl:top-20">
            <CardHeader title="Invoice header preview" description="How your company block prints" />
            <CardBody className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-2.5">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {values.name?.trim() || "Your business name"}
                    </p>
                    <p className="mt-0.5 whitespace-pre-line text-[11px] leading-4 text-slate-500">
                      {values.address?.trim() || "Business address appears here"}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {values.gst_no?.trim() ? (
                    <Badge tone="indigo">GSTIN {values.gst_no.trim().toUpperCase()}</Badge>
                  ) : (
                    <Badge tone="amber">GSTIN not set</Badge>
                  )}
                  {values.fssai_no?.trim() && (
                    <Badge tone="sky">FSSAI {values.fssai_no.trim()}</Badge>
                  )}
                  {values.state_code?.trim() && (
                    <Badge tone="violet">State {values.state_code.trim()}</Badge>
                  )}
                </div>
                <div className="mt-2.5 space-y-1 text-[10px] text-slate-500">
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3 text-slate-400" />
                    {values.phone?.trim() || "Phone not set"}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail className="size-3 text-slate-400" />
                    {values.email?.trim() || "Email not set"}
                  </p>
                  <p className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3 shrink-0 text-slate-400" />
                    {values.address?.trim() || "Address not set"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Profile completeness
                  </p>
                  <span className="text-[11px] font-bold text-slate-700">{pct}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      pct === 100
                        ? "bg-emerald-500"
                        : pct >= 60
                          ? "bg-indigo-500"
                          : "bg-amber-500",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {[
                    { label: "Business name", done: Boolean(values.name?.trim()) },
                    { label: "Billing address", done: Boolean(values.address?.trim()) },
                    { label: "GSTIN", done: Boolean(values.gst_no?.trim()) },
                    { label: "Bank account", done: Boolean(values.bank_account_no?.trim()) },
                  ].map((item) => (
                    <p
                      key={item.label}
                      className="flex items-center gap-1.5 text-[11px] text-slate-600"
                    >
                      {item.done ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                      ) : (
                        <CircleDashed className="size-3.5 text-slate-300" />
                      )}
                      {item.label}
                      {!item.done && <span className="text-slate-400">— not set</span>}
                    </p>
                  ))}
                </div>
              </div>

              {values.bank_account_no?.trim() && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    <Banknote className="size-3.5" /> Payment details
                  </p>
                  <p className="mt-1.5 text-[11px] leading-5 text-emerald-800">
                    {values.bank_name?.trim() || "Bank"}
                    {values.bank_branch?.trim() ? ` · ${values.bank_branch.trim()}` : ""}
                    <br />
                    A/c {values.bank_account_no.trim()}
                    {values.bank_ifsc?.trim() ? ` · IFSC ${values.bank_ifsc.trim().toUpperCase()}` : ""}
                  </p>
                </div>
              )}

              {profile?.updated_at && (
                <p className="text-[10px] text-slate-400">
                  Last saved {formatDate(profile.updated_at, "long")}
                </p>
              )}

              <Button type="submit" className="w-full" loading={isSubmitting}>
                <Save className="size-4" /> Save changes
              </Button>
              <Link
                to="/settings"
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
              >
                <ArrowLeft className="size-3.5" /> Back to settings
              </Link>
            </CardBody>
          </Card>
        </div>
      </form>
    </div>
  );
}
