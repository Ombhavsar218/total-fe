import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Download,
  Pencil,
  Plus,
  SearchX,
  ShieldCheck,
  ToggleLeft,
  Trash2,
  UserCog,
  UserX,
  Users,
} from "lucide-react";
import { userService } from "@/services/user.service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { downloadCsv } from "@/lib/csv";
import type { AuthUser, Paginated } from "@/types";
import { ROLE_LABELS, ROLE_TONES } from "@/lib/roles";
import { cn, formatDate, formatNumber, getErrorMessage } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/page";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput, Tabs, Toolbar } from "@/components/ui/toolbar";

type RoleFilter = "ALL" | "SUPERADMIN" | "OWNER" | "MARKETING" | "API";

export function UsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<Paginated<AuthUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AuthUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    userService
      .list({
        search: search.trim() || undefined,
        role: role === "ALL" ? undefined : role,
        active: active === "all" ? undefined : active,
        page,
        page_size: 10,
      })
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, "Unable to load users.")))
      .finally(() => setLoading(false));
  }, [search, role, active, page]);

  useEffect(load, [load]);

  const toggleStatus = async (member: AuthUser) => {
    setBusyId(member.id);
    try {
      const response = await userService.toggleStatus(member.id);
      success(response.message || "User status updated.");
      load();
    } catch (err) {
      toastError(getErrorMessage(err, "Unable to change this user’s status."));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await userService.remove(deleteTarget.id);
      success(response.message || "User deleted.");
      setDeleteTarget(null);
      if (data && data.results.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        load();
      }
    } catch (err) {
      toastError(getErrorMessage(err, "Unable to delete this user."));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows: AuthUser[] = [];
      let current = 1;
      let totalPages = 1;
      do {
        const response = await userService.list({
          search: search.trim() || undefined,
          role: role === "ALL" ? undefined : role,
          active: active === "all" ? undefined : active,
          page: current,
          page_size: 100,
        });
        rows.push(...response.results);
        totalPages = response.total_pages;
        current += 1;
      } while (current <= totalPages);

      if (!rows.length) {
        toastError("There are no users to export.");
        return;
      }
      downloadCsv(
        "users.csv",
        ["Name", "Email", "Role", "Status", "Created"],
        rows.map((member) => [
          member.full_name,
          member.email,
          member.role,
          member.is_active ? "Active" : "Inactive",
          member.created_at ?? "",
        ]),
      );
      success(`Exported ${rows.length} users.`);
    } catch (err) {
      toastError(getErrorMessage(err, "Could not export users."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Users"
        subtitle="Team accounts and access. Only Super Admins can create or change users."
        actions={
          <>
            <Button variant="outline" onClick={handleExport} loading={exporting}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button onClick={() => navigate("/users/new")}>
              <Plus className="size-4" /> Add user
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Users,
            title: "Owners & Super Admins",
            text: "Full access to bills, stock, shops, purchases and reports.",
            tone: "bg-indigo-50 text-indigo-600",
          },
          {
            icon: UserCog,
            title: "Marketing",
            text: "Can create bills and only sees the bills they created.",
            tone: "bg-sky-50 text-sky-600",
          },
          {
            icon: ShieldCheck,
            title: "API",
            text: "Read-only bill access for integrations and reporting tools.",
            tone: "bg-slate-100 text-slate-500",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card"
          >
            <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl", item.tone)}>
              <item.icon className="size-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">{item.title}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      <Toolbar>
        <Tabs
          value={role}
          onChange={(value) => {
            setRole(value);
            setPage(1);
          }}
          options={[
            { value: "ALL", label: "All roles" },
            { value: "SUPERADMIN", label: "Super Admin" },
            { value: "OWNER", label: "Owner" },
            { value: "MARKETING", label: "Marketing" },
            { value: "API", label: "API" },
          ]}
        />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search name, email or role…"
            className="w-full sm:w-64"
          />
          <select
            value={active}
            onChange={(event) => {
              setActive(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </Toolbar>

      {error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {loading && !data ? (
            <TableSkeleton rows={7} cols={5} />
          ) : data?.results.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3">User</th>
                      <th className="px-3 py-3">Role</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Added</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.results.map((member) => {
                      const self = member.id === currentUser?.id;
                      return (
                        <tr key={member.id} className="transition hover:bg-slate-50/70">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={member.full_name} size="sm" />
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-800">
                                  {member.full_name}
                                  {self && (
                                    <span className="rounded bg-indigo-50 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-indigo-600">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="truncate text-[10px] text-slate-400">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge className={cn("ring-1 ring-inset", ROLE_TONES[member.role])}>
                              {ROLE_LABELS[member.role]}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <Badge tone={member.is_active ? "emerald" : "rose"} dot>
                              {member.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-[11px] text-slate-500">
                            {member.created_at ? formatDate(member.created_at) : "—"}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => toggleStatus(member)}
                                disabled={self || busyId === member.id}
                                title={
                                  self
                                    ? "You cannot change your own status"
                                    : member.is_active
                                      ? "Deactivate user"
                                      : "Activate user"
                                }
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label="Toggle status"
                              >
                                {member.is_active ? (
                                  <ToggleLeft className="size-4" />
                                ) : (
                                  <CheckCircle2 className="size-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/users/${member.id}/edit`)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                                aria-label={`Edit ${member.full_name}`}
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(member)}
                                disabled={self}
                                title={self ? "You cannot delete your own account" : "Delete user"}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label={`Delete ${member.full_name}`}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 px-5 py-3">
                <Pagination
                  page={data.page}
                  totalPages={data.total_pages}
                  total={data.count}
                  pageSize={data.page_size}
                  onPage={setPage}
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={search ? SearchX : UserX}
              title={search ? "No matching users" : "No users found"}
              message={
                search
                  ? `Nothing matches “${search}” with these filters.`
                  : "Create a team account to get started."
              }
              action={
                !search ? (
                  <Button onClick={() => navigate("/users/new")}>
                    <Plus className="size-4" /> Add user
                  </Button>
                ) : undefined
              }
            />
          )}
        </Card>
      )}

      <p className="mt-4 text-center text-[11px] text-slate-400">
        {formatNumber(data?.count ?? 0)} team member{data?.count === 1 ? "" : "s"} match the current
        filters.
      </p>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.full_name ?? "user"}?`}
        message="This permanently removes the account. Users who created shops, stock, bills or purchases cannot be deleted — deactivate them instead."
        confirmLabel="Delete user"
      />
    </div>
  );
}
