import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Save,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { userService } from "@/services/user.service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { AuthUser, Role } from "@/types";
import { ROLE_LABELS, ROLE_TONES } from "@/lib/roles";
import { cn, formatDate, getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { InlineError } from "@/components/ui/feedback";

const ROLES: Role[] = ["SUPERADMIN", "OWNER", "MARKETING", "API"];

const ROLE_HELP: Record<Role, string> = {
  SUPERADMIN: "Full business access plus user management and account controls.",
  OWNER: "Full business access: bills, purchases, stock, shops and business profile.",
  MARKETING: "Can create and view only their own bills. No stock, shops or purchase access.",
  API: "Read-only access to bills. Intended for integrations and reporting.",
};

const schema = z
  .object({
    full_name: z.string().trim().min(2, "Enter the full name").max(150, "Name is too long"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().max(128, "Password is too long"),
    role: z.enum(["SUPERADMIN", "OWNER", "MARKETING", "API"]),
    is_active: z.boolean(),
  })
  .refine(
    (values) => !values.password || values.password.length >= 8,
    { message: "Use at least 8 characters", path: ["password"] },
  );

type FormValues = z.infer<typeof schema>;

export function UserForm({ mode, user }: { mode: "create" | "edit"; user?: AuthUser }) {
  const navigate = useNavigate();
  const { user: currentUser, refreshUser } = useAuth();
  const { success, error: toastError } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const isSelf = Boolean(user && currentUser && user.id === currentUser.id);
  const currentRole = (user?.role as Role | undefined) ?? "MARKETING";

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user?.full_name ?? "",
      email: user?.email ?? "",
      password: "",
      role: currentRole,
      is_active: user?.is_active ?? true,
    },
  });

  const selectedRole = watch("role");
  const active = watch("is_active");

  const onSubmit = async (values: FormValues) => {
    const payload = {
      full_name: values.full_name.trim(),
      email: values.email.trim().toLowerCase(),
      role: values.role,
      is_active: values.is_active,
      ...(values.password.trim() ? { password: values.password } : {}),
    };
    try {
      if (mode === "edit" && user) {
        const updated = await userService.update(user.id, payload);
        success(`${updated.full_name} updated.`);
        if (updated.id === currentUser?.id) await refreshUser();
        navigate("/users");
      } else {
        const created = await userService.create(payload);
        success(`${created.full_name} added as ${ROLE_LABELS[created.role]}.`);
        navigate("/users");
      }
    } catch (err) {
      const message = getErrorMessage(err, "Unable to save this user.");
      setError("root", { message });
      toastError(message);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={mode === "edit" ? `Edit ${user?.full_name ?? "user"}` : "Add a user"}
        subtitle={
          mode === "edit"
            ? "Update access for this team member. Leave the password blank to keep it unchanged."
            : "Create a team account and choose what they can access."
        }
        backTo="/users"
        backLabel="Users"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Account details"
              description="Login identity and status"
              action={<Users className="size-4 text-slate-300" />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              {errors.root?.message && (
                <div className="sm:col-span-2">
                  <InlineError message={errors.root.message} />
                </div>
              )}
              <Field
                label="Full name"
                htmlFor="full_name"
                required
                error={errors.full_name?.message}
                className="sm:col-span-2"
              >
                <Input id="full_name" placeholder="e.g. Priya Sharma" {...register("full_name")} />
              </Field>
              <Field label="Email address" htmlFor="email" required error={errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="off"
                  {...register("email")}
                />
              </Field>
              <Field
                label={mode === "edit" ? "New password" : "Password"}
                htmlFor="password"
                required={mode === "create"}
                error={errors.password?.message}
                hint={mode === "edit" ? "Leave blank to keep the current password" : "At least 8 characters"}
              >
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "edit" ? "Unchanged" : "Minimum 8 characters"}
                    autoComplete="new-password"
                    className="pr-10"
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
              {mode === "edit" && user && (
                <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-[11px] text-slate-500 sm:col-span-2">
                  Added {formatDate(user.created_at)} ·{" "}
                  {user.updated_at ? `Last updated ${formatDate(user.updated_at)}` : "No updates yet"}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Role & access"
              description="Controls which modules and records this user can access"
              action={<ShieldCheck className="size-4 text-slate-300" />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Role" error={errors.role?.message}>
                <Select {...register("role")} disabled={isSelf}>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <Badge className={cn("ring-1 ring-inset", ROLE_TONES[selectedRole])}>
                    {ROLE_LABELS[selectedRole]}
                  </Badge>
                </div>
                <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
                  {ROLE_HELP[selectedRole]}
                </p>
              </div>
              <div className="sm:col-span-2">
                <Checkbox
                  label="Account is active"
                  description={
                    isSelf
                      ? "You cannot deactivate your own account."
                      : active
                        ? "The user can sign in and use the workspace."
                        : "Sign-in is blocked until the account is activated again."
                  }
                  checked={active}
                  disabled={isSelf}
                  {...register("is_active")}
                />
              </div>
              {isSelf && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] leading-5 text-amber-800 sm:col-span-2">
                  You are editing your own account. Role and status changes are locked to prevent
                  locking yourself out.
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="xl:sticky xl:top-20">
            <CardHeader title="Access summary" description="What this account can do" />
            <CardBody className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    {mode === "create" ? <UserPlus className="size-4" /> : <KeyRound className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {watch("full_name")?.trim() || "Team member"}
                    </p>
                    <p className="truncate text-[10px] text-slate-400">
                      {watch("email")?.trim() || "email@company.com"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge className={cn("ring-1 ring-inset", ROLE_TONES[selectedRole])}>
                    {ROLE_LABELS[selectedRole]}
                  </Badge>
                  <Badge tone={active ? "emerald" : "rose"} dot>
                    {active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">{ROLE_HELP[selectedRole]}</p>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-indigo-50/70 px-3 py-2.5 text-[11px] leading-4 text-indigo-700">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  Passwords are hashed by Django and never returned by the API. Users can change
                  their own password from My profile.
                </p>
              </div>

              <Button type="submit" className="w-full" loading={isSubmitting}>
                <Save className="size-4" /> {mode === "edit" ? "Save changes" : "Create user"}
              </Button>
              <Link
                to="/users"
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
