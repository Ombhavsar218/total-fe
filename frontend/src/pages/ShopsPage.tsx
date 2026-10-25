import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Download,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  SearchX,
  ShieldCheck,
  Store,
  Trash2,
  UserRound,
} from "lucide-react";
import { shopService } from "@/services/shop.service";
import { useToast } from "@/contexts/ToastContext";
import { downloadCsv } from "@/lib/csv";
import type { PaginatedWithCounts, Shop } from "@/types";
import { formatDate, formatNumber, getErrorMessage } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/modal";
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput, Tabs, Toolbar } from "@/components/ui/toolbar";

type Filter = "all" | "gst" | "no-gst" | "fssai" | "no-fssai";

export function ShopsPage() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<PaginatedWithCounts<Shop> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [ordering, setOrdering] = useState("newest");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Shop | null>(null);
  const [deleting, setDeleting] = useState(false);
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
    shopService
      .list({
        search: search.trim() || undefined,
        filter: filter === "all" ? undefined : filter,
        ordering,
        page,
        page_size: 10,
      })
      .then(setData)
      .catch((err) => setError(getErrorMessage(err, "Unable to load shops.")))
      .finally(() => setLoading(false));
  }, [search, filter, ordering, page]);

  useEffect(load, [load]);

  const counts = data?.counts;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await shopService.remove(deleteTarget.id);
      success(response.message || "Shop deleted.");
      setDeleteTarget(null);
      if (data && data.results.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        load();
      }
    } catch (err) {
      toastError(getErrorMessage(err, "Unable to delete this shop."));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows: Shop[] = [];
      let current = 1;
      let totalPages = 1;
      do {
        const response = await shopService.list({
          search: search.trim() || undefined,
          filter: filter === "all" ? undefined : filter,
          ordering,
          page: current,
          page_size: 100,
        });
        rows.push(...response.results);
        totalPages = response.total_pages;
        current += 1;
      } while (current <= totalPages);
      if (!rows.length) {
        toastError("There are no shops to export for these filters.");
        return;
      }
      downloadCsv(
        "shops.csv",
        ["Name", "Address", "Phone", "Email", "GSTIN", "FSSAI", "State code", "Owner", "Created"],
        rows.map((shop) => [
          shop.name,
          shop.address,
          shop.phone,
          shop.email,
          shop.gst_no,
          shop.fssai_no,
          shop.state_code,
          shop.owner.full_name,
          shop.created_at,
        ]),
      );
      success(`Exported ${rows.length} shops.`);
    } catch (err) {
      toastError(getErrorMessage(err, "Could not export shops."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Shops"
        subtitle="Customer accounts with addresses, GSTIN and FSSAI details used on invoices."
        actions={
          <>
            <Button variant="outline" onClick={handleExport} loading={exporting}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button onClick={() => navigate("/shops/new")}>
              <Plus className="size-4" /> Add shop
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Total shops"
          value={formatNumber(counts?.all ?? data?.count)}
          hint="Across the business"
          icon={Building2}
          tone="indigo"
          loading={loading && !data}
        />
        <StatCard
          label="With GSTIN"
          value={formatNumber(counts?.gst)}
          hint="GST invoices enabled"
          icon={ShieldCheck}
          tone="emerald"
          loading={loading && !data}
        />
        <StatCard
          label="With FSSAI"
          value={formatNumber(counts?.fssai)}
          hint="Food licence on file"
          icon={Store}
          tone="sky"
          loading={loading && !data}
        />
        <StatCard
          label="Missing GSTIN"
          value={formatNumber(counts?.["no-gst"])}
          hint="Bills print without GSTIN"
          icon={UserRound}
          tone="amber"
          loading={loading && !data}
        />
      </div>

      <Toolbar>
        <Tabs
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All", count: counts?.all },
            { value: "gst", label: "GST", count: counts?.gst },
            { value: "fssai", label: "FSSAI", count: counts?.fssai },
            { value: "no-gst", label: "No GST", count: counts?.["no-gst"] },
            { value: "no-fssai", label: "No FSSAI", count: counts?.["no-fssai"] },
          ]}
        />
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search name, address or GSTIN…"
            className="w-full sm:w-72"
          />
          <select
            value={ordering}
            onChange={(event) => {
              setOrdering(event.target.value);
              setPage(1);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600"
            aria-label="Sort shops"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
          </select>
        </div>
      </Toolbar>

      {error && !data ? (
        <Card>
          <ErrorState message={error} onRetry={load} />
        </Card>
      ) : loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : data?.results.length ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.results.map((shop) => (
              <Card
                key={shop.id}
                className="group flex cursor-pointer flex-col p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-float"
                onClick={() => navigate(`/shops/${shop.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 ring-1 ring-indigo-100">
                      <Building2 className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-indigo-700">
                        {shop.name}
                      </h3>
                      <p className="mt-0.5 flex items-start gap-1 text-[11px] leading-4 text-slate-500">
                        <MapPin className="mt-0.5 size-3 shrink-0" />
                        <span className="line-clamp-2">{shop.address}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {shop.gst_no ? (
                    <Badge tone="indigo">GST {shop.gst_no}</Badge>
                  ) : (
                    <Badge tone="slate">No GSTIN</Badge>
                  )}
                  {shop.fssai_no && <Badge tone="sky">FSSAI {shop.fssai_no}</Badge>}
                  {shop.state_code && <Badge tone="violet">State {shop.state_code}</Badge>}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px]">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      Phone
                    </p>
                    <p className="mt-0.5 truncate text-slate-700">{shop.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      Owner
                    </p>
                    <p className="mt-0.5 truncate text-slate-700">{shop.owner.full_name}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[10px] text-slate-400">
                    Added {formatDate(shop.created_at)}
                  </span>
                  <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`/shops/${shop.id}/edit`)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                      aria-label={`Edit ${shop.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(shop)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Delete ${shop.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/shops/${shop.id}`)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                      aria-label={`Open ${shop.name}`}
                    >
                      <ExternalLink className="size-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-4">
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
        <Card>
          <EmptyState
            icon={search ? SearchX : Building2}
            title={search ? "No matching shops" : "No shops yet"}
            message={
              search
                ? `Nothing matches “${search}” with these filters.`
                : "Add your first customer shop to start raising GST invoices."
            }
            action={
              !search ? (
                <Button onClick={() => navigate("/shops/new")}>
                  <Plus className="size-4" /> Add shop
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete ${deleteTarget?.name ?? "shop"}?`}
        message="This permanently removes the shop. Shops with existing bills cannot be deleted until those bills are removed."
        confirmLabel="Delete shop"
      />
    </div>
  );
}
