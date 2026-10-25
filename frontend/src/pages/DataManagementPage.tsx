import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  History,
  Info,
  RefreshCw,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { billService } from "@/services/bill.service";
import { purchaseService } from "@/services/purchase.service";
import { shopService } from "@/services/shop.service";
import { stockService } from "@/services/stock.service";
import { userService } from "@/services/user.service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { downloadCsv } from "@/lib/csv";
import { isManagement } from "@/lib/roles";
import type { AuthUser, BillSummary, PurchaseSummary } from "@/types";
import { cn, formatNumber, getErrorMessage, todayISO } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Dataset {
  key: "bills" | "stock" | "shops" | "purchases" | "movements" | "users";
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  columns: string;
  managementOnly?: boolean;
  superadminOnly?: boolean;
}

const DATASETS: Dataset[] = [
  {
    key: "bills",
    title: "Sales bills",
    description:
      "Every invoice with its shop, customer, taxable value, tax, round-off and grand total.",
    icon: ClipboardList,
    tone: "bg-indigo-50 text-indigo-600",
    columns: "10 columns",
  },
  {
    key: "stock",
    title: "Stock catalogue",
    description:
      "Item name, SKU, quantity, unit, selling price, MRP, HSN, GST rate and reorder level.",
    icon: Boxes,
    tone: "bg-emerald-50 text-emerald-600",
    columns: "12 columns",
    managementOnly: true,
  },
  {
    key: "shops",
    title: "Shops",
    description: "Customer accounts with address, phone, email, GSTIN, FSSAI and state code.",
    icon: Building2,
    tone: "bg-sky-50 text-sky-600",
    columns: "9 columns",
    managementOnly: true,
  },
  {
    key: "purchases",
    title: "Purchase orders",
    description: "Supplier orders with status, line counts, subtotal, paid and balance due.",
    icon: Store,
    tone: "bg-violet-50 text-violet-600",
    columns: "9 columns",
    managementOnly: true,
  },
  {
    key: "movements",
    title: "Stock movement ledger",
    description:
      "Every opening balance, sale, purchase, reversal and manual adjustment with the resulting quantity.",
    icon: History,
    tone: "bg-amber-50 text-amber-600",
    columns: "8 columns",
    managementOnly: true,
  },
  {
    key: "users",
    title: "Team members",
    description: "Team accounts with role, status and creation date.",
    icon: Users,
    tone: "bg-rose-50 text-rose-600",
    columns: "5 columns",
    superadminOnly: true,
  },
];

async function exportBills() {
  const rows: BillSummary[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await billService.list({ date: "all", page, page_size: 100 });
    rows.push(...data.results);
    totalPages = data.total_pages;
    page += 1;
  } while (page <= totalPages);

  if (!rows.length) return 0;
  downloadCsv(
    `bills-${todayISO()}.csv`,
    [
      "Date",
      "Invoice number",
      "Shop",
      "Customer",
      "Created by",
      "Items",
      "Subtotal",
      "Tax",
      "Round off",
      "Total",
    ],
    rows.map((bill) => [
      bill.date,
      bill.invoice_number,
      bill.shop_name,
      bill.customer_name,
      bill.created_by_name,
      bill.items_count,
      bill.subtotal,
      bill.tax_amount,
      bill.round_off,
      bill.total_amount,
    ]),
  );
  return rows.length;
}

async function exportStock() {
  const rows = await stockService.all();
  if (!rows.length) return 0;
  downloadCsv(
    `stock-${todayISO()}.csv`,
    [
      "Name",
      "SKU",
      "Quantity",
      "Unit",
      "Price",
      "MRP",
      "HSN",
      "GST rate",
      "Min stock",
      "Status",
      "Owner",
      "Updated",
    ],
    rows.map((item) => [
      item.name,
      item.sku,
      item.quantity,
      item.unit,
      item.price,
      item.mrp ?? "",
      item.hsn_code,
      item.gst_rate ?? "",
      item.min_stock,
      item.status,
      item.owner.full_name,
      item.updated_at,
    ]),
  );
  return rows.length;
}

async function exportShops() {
  const rows = await shopService.all();
  if (!rows.length) return 0;
  downloadCsv(
    `shops-${todayISO()}.csv`,
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
  return rows.length;
}

async function exportPurchases() {
  const rows: PurchaseSummary[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await purchaseService.list({ date: "all", page, page_size: 100 });
    rows.push(...data.results);
    totalPages = data.total_pages;
    page += 1;
  } while (page <= totalPages);

  if (!rows.length) return 0;
  downloadCsv(
    `purchases-${todayISO()}.csv`,
    [
      "Invoice number",
      "Date",
      "Status",
      "Items",
      "Subtotal",
      "Total",
      "Paid",
      "Balance due",
      "Created by",
    ],
    rows.map((order) => [
      order.invoice_number,
      order.date,
      order.status,
      order.items_count,
      order.subtotal,
      order.total_amount,
      order.paid_amount,
      order.due_amount,
      order.created_by_name,
    ]),
  );
  return rows.length;
}

async function exportMovements() {
  const rows = await stockService.allMovements();
  if (!rows.length) return 0;
  downloadCsv(
    `stock-movements-${todayISO()}.csv`,
    ["Date", "Item", "Change", "Balance after", "Kind", "Reference", "Note", "By"],
    rows.map((movement) => [
      movement.created_at,
      movement.stock_name,
      movement.delta,
      movement.quantity_after,
      movement.kind,
      movement.reference,
      movement.note,
      movement.created_by_name ?? "",
    ]),
  );
  return rows.length;
}

async function exportUsers() {
  const rows: AuthUser[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await userService.list({ page, page_size: 100 });
    rows.push(...data.results);
    totalPages = data.total_pages;
    page += 1;
  } while (page <= totalPages);

  if (!rows.length) return 0;
  downloadCsv(
    `users-${todayISO()}.csv`,
    ["Name", "Email", "Role", "Status", "Created"],
    rows.map((member) => [
      member.full_name,
      member.email,
      member.role,
      member.is_active ? "Active" : "Inactive",
      member.created_at ?? "",
    ]),
  );
  return rows.length;
}

const RUNNERS: Record<Dataset["key"], () => Promise<number>> = {
  bills: exportBills,
  stock: exportStock,
  shops: exportShops,
  purchases: exportPurchases,
  movements: exportMovements,
  users: exportUsers,
};

export function DataManagementPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const management = isManagement(user?.role);
  const superadmin = user?.role === "SUPERADMIN";

  const [counts, setCounts] = useState<Partial<Record<Dataset["key"], number>>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [busy, setBusy] = useState<Dataset["key"] | null>(null);

  const loadCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const [bills, stock, shops, purchases, movements, users] = await Promise.all([
        billService.list({ date: "all", page: 1, page_size: 1 }).then((data) => data.count),
        management ? stockService.list({ page: 1, page_size: 1 }).then((data) => data.count) : null,
        management ? shopService.list({ page: 1, page_size: 1 }).then((data) => data.count) : null,
        management
          ? purchaseService.list({ date: "all", page: 1, page_size: 1 }).then((data) => data.count)
          : null,
        management
          ? stockService.listMovements({ page: 1, page_size: 1 }).then((data) => data.count)
          : null,
        superadmin ? userService.list({ page: 1, page_size: 1 }).then((data) => data.count) : null,
      ]);
      setCounts({
        bills,
        ...(stock !== null ? { stock } : {}),
        ...(shops !== null ? { shops } : {}),
        ...(purchases !== null ? { purchases } : {}),
        ...(movements !== null ? { movements } : {}),
        ...(users !== null ? { users } : {}),
      });
    } catch (err) {
      toastError(getErrorMessage(err, "Unable to count the available records."));
    } finally {
      setCountsLoading(false);
    }
  }, [management, superadmin, toastError]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const runExport = async (dataset: Dataset) => {
    setBusy(dataset.key);
    try {
      const count = await RUNNERS[dataset.key]();
      if (!count) {
        toastError(`There is no ${dataset.title.toLowerCase()} data to export yet.`);
        return;
      }
      success(`Exported ${count} ${dataset.title.toLowerCase()} record${count === 1 ? "" : "s"}.`);
    } catch (err) {
      toastError(getErrorMessage(err, `Could not export ${dataset.title.toLowerCase()}.`));
    } finally {
      setBusy(null);
    }
  };

  const visible = DATASETS.filter((dataset) => {
    if (dataset.superadminOnly) return superadmin;
    if (dataset.managementOnly) return management;
    return true;
  });

  const totalRecords = visible.reduce((sum, dataset) => sum + (counts[dataset.key] ?? 0), 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Data management"
        subtitle={
          management
            ? "Download a clean CSV of any part of the workspace. Files open directly in Excel or Google Sheets."
            : "Download a CSV of every bill you created. Files open directly in Excel or Google Sheets."
        }
        backTo="/settings"
        backLabel="Settings"
        actions={
          <Button variant="outline" onClick={loadCounts} loading={countsLoading}>
            <RefreshCw className="size-4" /> Refresh counts
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Datasets"
          value={visible.length}
          hint="Ready to download"
          icon={Database}
          tone="indigo"
          loading={countsLoading && !visible.length}
        />
        <StatCard
          label="Records"
          value={formatNumber(totalRecords)}
          hint="Across available datasets"
          icon={FileSpreadsheet}
          tone="emerald"
          loading={countsLoading}
        />
        <StatCard
          label="Bill rows"
          value={formatNumber(counts.bills)}
          hint="All invoices, all dates"
          icon={ClipboardList}
          tone="sky"
          loading={countsLoading}
        />
        <StatCard
          label="Format"
          value="CSV"
          hint="UTF-8 with Excel BOM"
          icon={ArrowDownToLine}
          tone="violet"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {visible.map((dataset) => (
          <Card
            key={dataset.key}
            className="flex flex-col p-5 transition hover:border-slate-300 hover:shadow-float"
          >
            <div className="flex items-start gap-3">
              <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", dataset.tone)}>
                <dataset.icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{dataset.title}</h3>
                  <Badge tone="slate">{dataset.columns}</Badge>
                  {dataset.managementOnly && <Badge tone="indigo">Management</Badge>}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{dataset.description}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-slate-50/80 px-3.5 py-2.5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                  Records available
                </p>
                <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">
                  {countsLoading
                    ? "—"
                    : counts[dataset.key] === undefined
                      ? "Not counted"
                      : formatNumber(counts[dataset.key])}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => runExport(dataset)}
                loading={busy === dataset.key}
                disabled={busy !== null && busy !== dataset.key}
              >
                <Download className="size-3.5" /> Export CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="How the files behave"
            description="Safe, repeatable exports"
            action={<Info className="size-4 text-slate-300" />}
          />
          <CardBody className="space-y-2.5">
            {[
              "Each export fetches every page from the API, not just the rows on screen.",
              "Amounts are written exactly as stored, so totals reconcile with the app.",
              "Stock, shop and purchase exports are limited to Owners and Super Admins.",
              "Marketing users can export only the bills they created.",
              "CSV files are UTF-8 with a BOM so Excel renders ₹ and Indian names correctly.",
            ].map((line) => (
              <p key={line} className="flex items-start gap-2 text-[11px] leading-5 text-slate-600">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                {line}
              </p>
            ))}
          </CardBody>
        </Card>

        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
          <ShieldCheck className="size-5 text-indigo-600" />
          <p className="mt-2 text-sm font-bold text-indigo-900">Your data stays yours</p>
          <p className="mt-1 text-[11px] leading-5 text-indigo-700/80">
            Exports are generated in your browser from the signed-in session. Nothing is emailed or
            copied to a third party, and every request is scoped by your role. Treat CSV files as
            sensitive — they can contain customer GSTINs and bank details.
          </p>
          <LinkRow />
        </div>
      </div>
    </div>
  );
}

function LinkRow() {
  return (
    <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-indigo-500">
      <ShieldCheck className="size-3" /> Role-scoped · Transaction-safe · Encrypted in transit
    </div>
  );
}
