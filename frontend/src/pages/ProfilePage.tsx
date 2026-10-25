import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BadgeCheck,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  ShieldX,
  Store,
  UserCircle,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ROLE_LABELS, ROLE_TONES, canManageBills, isManagement } from "@/lib/roles";
import type { Role } from "@/types";
import { cn, formatDate, getErrorMessage } from "@/lib/utils";
import { Avatar, PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { InlineError } from "@/components/ui/feedback";

const schema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    new_password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(128, "Password is too long")
      .refine((value) => /[a-zA-Z]/.test(value) && /\d/.test(value), {
        message: "Mix letters and numbers for a stronger password",
      }),
    confirm_password: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type FormValues = z.infer<typeof schema>;

interface ModuleAccess {
  label: string;
  description: string;
  icon: LucideIcon;
  roles: Role[];
  readOnlyFor?: Role[];
}

const MODULES: ModuleAccess[] = [
  {
    label: "Dashboard",
    description: "Revenue, trends and low-stock alerts",
    icon: LayoutDashboard,
    roles: ["OWNER", "SUPERADMIN"],
  },
  {
    label: "Bills",
    description: "Create, edit and print GST invoices",
    icon: ClipboardList,
    roles: ["OWNER", "SUPERADMIN", "MARKETING", "API"],
    readOnlyFor: ["API"],
  },
  {
    label: "Purchases",
    description: "Supplier orders and stock intake",
    icon: Store,
    roles: ["OWNER", "SUPERADMIN"],
  },
  {
    label: "Stock",
    description: "Catalogue, pricing and stock ledger",
    icon: Boxes,
    roles: ["OWNER", "SUPERADMIN"],
  },
  {
    label: "Shops",
    description: "Customers and GST registrations",
    icon: Building2,
    roles: ["OWNER", "SUPERADMIN"],
  },
  {
    label: "Users",
    description: "Team accounts and access control",
    icon: Users,
    roles: ["SUPERADMIN"],
  },
  {
    label: "Business profile",
    description: "Company identity printed on invoices",
    icon: BadgeCheck,
    roles: ["OWNER", "SUPERADMIN"],
  },
];

export function ProfilePage() {
  const { user, changePassword, logout } = useAuth();
  const { success, error: toastError } = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const newPassword = watch("new_password") ?? "";
  const role = user?.role ?? "API";
  const management = isManagement(user?.role);

  const requirements = [
    { label: "At least 8 characters", done: newPassword.length >= 8 },
    { label: "Contains a letter", done: /[a-zA-Z]/.test(newPassword) },
    { label: "Contains a number", done: /\d/.test(newPassword) },
  ];

  const onSubmit = async (values: FormValues) => {
    try {
      await changePassword(values.current_password, values.new_password);
      reset();
      success("Password changed. Use your new password next time you sign in.");
    } catch (err) {
      const message = getErrorMessage(err, "Unable to change your password.");
      setError("root", { message });
      toastError(message);
    }
  };

  if (!user) return null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="My profile"
        subtitle="Your account details, role permissions and password."
        backTo="/settings"
        backLabel="Settings"
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 bg-gradient-to-br from-indigo-50/70 via-white to-white px-5 py-5">
              <Avatar name={user.full_name} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{user.full_name}</h2>
                  <Badge className={cn("ring-1 ring-inset", ROLE_TONES[role])}>
                    {ROLE_LABELS[role]}
                  </Badge>
                  <Badge tone={user.is_active ? "emerald" : "rose"} dot>
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <Mail className="size-3.5 text-slate-400" /> {user.email}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Fingerprint className="size-3.5" /> User #{user.id}
                  {user.created_at ? ` · Member since ${formatDate(user.created_at, "long")}` : ""}
                </p>
              </div>
              <div className="rounded-xl bg-white px-3.5 py-2.5 text-right shadow-xs ring-1 ring-slate-200">
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Access level
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {role === "SUPERADMIN"
                    ? "Full control"
                    : role === "OWNER"
                      ? "Management"
                      : role === "MARKETING"
                        ? "Billing only"
                        : "Read-only"}
                </p>
              </div>
            </div>
            <CardBody className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Email
                </p>
                <p className="mt-1 truncate text-xs font-medium text-slate-700">{user.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Role
                </p>
                <p className="mt-1 text-xs font-medium text-slate-700">{ROLE_LABELS[role]}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Account status
                </p>
                <p className="mt-1 text-xs font-medium text-slate-700">
                  {user.is_active ? "Active" : "Deactivated"}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Change password"
              description="Choose a new password for your account"
              action={<KeyRound className="size-4 text-slate-300" />}
            />
            <CardBody>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
                {errors.root?.message && (
                  <div className="sm:col-span-2">
                    <InlineError message={errors.root.message} />
                  </div>
                )}
                <Field
                  label="Current password"
                  htmlFor="current_password"
                  required
                  error={errors.current_password?.message}
                  className="sm:col-span-2"
                >
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showCurrent ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Your current password"
                      className="pr-10"
                      {...register("current_password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((value) => !value)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-600"
                      aria-label={showCurrent ? "Hide password" : "Show password"}
                    >
                      {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
                <Field
                  label="New password"
                  htmlFor="new_password"
                  required
                  error={errors.new_password?.message}
                >
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNew ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      className="pr-10"
                      {...register("new_password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((value) => !value)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-600"
                      aria-label={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
                <Field
                  label="Confirm new password"
                  htmlFor="confirm_password"
                  required
                  error={errors.confirm_password?.message}
                >
                  <Input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat the new password"
                    {...register("confirm_password")}
                  />
                </Field>
                <div className="rounded-xl bg-slate-50 px-3.5 py-3 sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Password requirements
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                    {requirements.map((item) => (
                      <p
                        key={item.label}
                        className={cn(
                          "flex items-center gap-1.5 text-[11px]",
                          item.done ? "text-emerald-700" : "text-slate-500",
                        )}
                      >
                        {item.done ? (
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                        ) : (
                          <span className="size-3.5 rounded-full border border-slate-300" />
                        )}
                        {item.label}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-end sm:col-span-2">
                  <Button type="submit" loading={isSubmitting}>
                    <LockKeyhole className="size-4" /> Update password
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="What you can access"
              description={`Permissions for the ${ROLE_LABELS[role]} role`}
              action={<ShieldCheck className="size-4 text-slate-300" />}
            />
            <CardBody>
              <div className="grid gap-2 sm:grid-cols-2">
                {MODULES.map((module) => {
                  const allowed = module.roles.includes(role);
                  const readOnly = allowed && module.readOnlyFor?.includes(role);
                  return (
                    <div
                      key={module.label}
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3",
                        allowed
                          ? "border-slate-200 bg-white"
                          : "border-slate-100 bg-slate-50/60 opacity-80",
                      )}
                    >
                      <div
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-lg",
                          allowed ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400",
                        )}
                      >
                        <module.icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          {module.label}
                          {allowed ? (
                            <CheckCircle2 className="size-3 text-emerald-500" />
                          ) : (
                            <ShieldX className="size-3 text-slate-300" />
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                          {allowed ? module.description : "Not available for your role"}
                        </p>
                      </div>
                      {allowed && (
                        <Badge tone={readOnly ? "amber" : "emerald"}>
                          {readOnly ? "View" : "Full"}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              {!management && canManageBills(role) && (
                <p className="mt-3 rounded-xl bg-sky-50 px-3.5 py-2.5 text-[11px] leading-5 text-sky-800">
                  As a Marketing user you can create invoices, but you only see the bills you created.
                  Stock levels update automatically and are managed by Owners.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardBody className="flex flex-col items-center py-6 text-center">
              <Avatar name={user.full_name} size="lg" />
              <p className="mt-3 text-sm font-bold text-slate-900">{user.full_name}</p>
              <p className="text-[11px] text-slate-400">{user.email}</p>
              <Badge className={cn("mt-2 ring-1 ring-inset", ROLE_TONES[role])}>
                {ROLE_LABELS[role]}
              </Badge>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Session & security" description="How your sign-in works" />
            <CardBody className="space-y-3">
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 px-3.5 py-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Secure tokens</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    Short-lived JWT access tokens refresh silently in the background.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 px-3.5 py-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <LockKeyhole className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Hashed passwords</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    Django stores passwords with PBKDF2. Nobody can read your password, not even an
                    Owner.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 px-3.5 py-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600">
                  <UserCircle className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Account changes</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                    Only a Super Admin can change your role or deactivate your account.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4">
            <p className="text-xs font-semibold text-rose-900">Finished for now?</p>
            <p className="mt-1 text-[11px] leading-5 text-rose-700/80">
              Signing out clears the tokens stored in this browser. You will need your password to
              sign back in.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={logout}>
              <LogOut className="size-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
