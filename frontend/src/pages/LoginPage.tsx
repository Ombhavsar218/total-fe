import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { landingPath } from "@/lib/roles";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { InlineError } from "@/components/ui/feedback";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

const DEMO_ACCOUNTS = [
  { label: "Owner", email: "owner@example.com", role: "Full access" },
  { label: "Marketing", email: "marketing@example.com", role: "Own bills only" },
  { label: "Super Admin", email: "superadmin@example.com", role: "User management" },
];

const FEATURES = [
  { icon: FileText, title: "GST-ready billing", text: "Invoice numbering, tax slabs and print-ready A4 invoices." },
  { icon: Boxes, title: "Live stock control", text: "Sales and purchases update stock inside a transaction." },
  { icon: BarChart3, title: "Owner dashboard", text: "Revenue, daily trends, low-stock alerts and top sellers." },
  { icon: ShieldCheck, title: "Role-based access", text: "Owners, marketing, and super admins each see only what they need." },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    try {
      const user = await login(values.email, values.password);
      navigate(landingPath(user.role), { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error, "Unable to sign in. Check your credentials."));
    }
  };

  const fillDemo = (email: string) => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", "password123", { shouldValidate: true });
    setServerError("");
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-slate-950 px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-slate-950 to-violet-950" />
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="absolute -left-24 top-1/3 size-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 right-0 size-96 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <Boxes className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">TotalStock</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-indigo-200">
              Distributor suite
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-auto max-w-lg pb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-indigo-100 ring-1 ring-white/15">
            <Sparkles className="size-3" /> Built for fast-moving distributors
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-balance">
            Every bill, every item,
            <br />
            <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
              one clean workspace.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-indigo-100/80">
            Billing, purchases, stock, shops and GST invoices — connected so your numbers always
            add up.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-sm"
              >
                <feature.icon className="size-4 text-indigo-300" />
                <p className="mt-2 text-xs font-semibold text-white">{feature.title}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-indigo-100/60">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-10 flex items-center gap-2 text-[11px] text-indigo-200/60">
          <CheckCircle2 className="size-3.5" /> Django REST · React · PostgreSQL ready
        </div>
      </div>

      <div className="flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600">
              <Boxes className="size-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">TotalStock</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">Distributor suite</p>
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in to manage bills, stock and customers.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
            {serverError && <InlineError message={serverError} />}

            <Field label="Email address" htmlFor="email" required error={errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="h-11 pl-9"
                  {...register("email")}
                />
              </div>
            </Field>

            <Field label="Password" htmlFor="password" required error={errors.password?.message}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Minimum 8 characters"
                  className="h-11 pl-9 pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Sign in <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Demo accounts · password123
            </p>
            <div className="mt-2 grid gap-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account.email)}
                  className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-left ring-1 ring-slate-200 transition hover:ring-indigo-300"
                >
                  <span>
                    <span className="block text-xs font-semibold text-slate-800">{account.label}</span>
                    <span className="block text-[10px] text-slate-400">{account.email}</span>
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-semibold text-indigo-600">
                    {account.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">
            New accounts are created by a Super Admin.{" "}
            <Link to="/settings/about" className="font-semibold text-indigo-600 hover:underline">
              About TotalStock
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] text-slate-300">
          © {new Date().getFullYear()} TotalStock · Inventory & Distributor Management
        </p>
      </div>
    </div>
  );
}
