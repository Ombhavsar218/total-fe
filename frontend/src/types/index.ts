export type Role = "SUPERADMIN" | "OWNER" | "MARKETING" | "API";

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserBrief {
  id: number;
  full_name: string;
  email: string;
  role: Role;
}

export interface Shop {
  id: number;
  name: string;
  address: string;
  gst_no: string;
  fssai_no: string;
  phone: string;
  email: string;
  state_code: string;
  owner: UserBrief;
  owner_id: number;
  has_gst: boolean;
  has_fssai: boolean;
  created_at: string;
  updated_at: string;
}

export type StockStatus = "in" | "low" | "out";
export type StockUnit = "pcs" | "kg" | "liters" | "boxes" | "packets";

export interface Stock {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  unit: StockUnit;
  price: string;
  mrp: string | null;
  hsn_code: string;
  gst_rate: string | null;
  min_stock: number;
  description: string;
  owner: UserBrief;
  owner_id: number;
  is_low_stock: boolean;
  status: StockStatus;
  created_at: string;
  updated_at: string;
}

export interface BillItem {
  id: number;
  stock_id: number;
  name: string;
  hsn_code: string;
  mrp: string | null;
  unit: string;
  quantity: number;
  price: string;
  gst_rate: string;
  taxable_amount: string;
  sgst: string;
  cgst: string;
  amount: string;
}

export interface BillSummary {
  id: number;
  invoice_number: string;
  shop_id: number;
  shop_name: string;
  customer: string;
  customer_name: string;
  date: string;
  subtotal: string;
  tax_amount: string;
  round_off: string;
  total_amount: string;
  items_count: number;
  created_by_id: number;
  created_by_name: string;
  created_at: string;
}

export interface Bill extends BillSummary {
  shop: Shop;
  customer_address: string;
  customer_gst: string;
  customer_fssai: string;
  customer_state_code: string;
  items: BillItem[];
  updated_at: string;
}

export interface GroupedBill {
  shop_id: number;
  shop_name: string;
  shop_address: string;
  shop_gst_no: string;
  bills_count: number;
  total_items: number;
  total_quantity: number;
  total_amount: number;
  bills: BillSummary[];
}

export interface GroupedBillsResponse {
  success: boolean;
  date: string;
  groups: GroupedBill[];
  summary: {
    shops: number;
    bills: number;
    lines: number;
    quantity: number;
    total_amount: number;
  };
}

export interface ShopBillLine {
  id: number;
  bill_id: number;
  invoice_number: string;
  stock_id: number;
  name: string;
  hsn_code: string;
  mrp: string | null;
  quantity: number;
  unit: string;
  price: string;
  gst_rate: string;
  taxable_amount: string;
  sgst: string;
  cgst: string;
  amount: string;
  created_by: string;
}

export interface ShopBillsResponse {
  success: boolean;
  shop: Shop;
  date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  total_quantity: number;
  items_count: number;
  bills_count: number;
  items: ShopBillLine[];
}

export type PurchaseStatus = "PENDING" | "RECEIVED";

export interface PurchaseSummary {
  id: number;
  invoice_number: string;
  date: string;
  status: PurchaseStatus;
  subtotal: string;
  total_amount: string;
  paid_amount: string;
  due_amount: string;
  items_count: number;
  created_by_id: number;
  created_by_name: string;
  created_at: string;
}

export interface PurchaseItem {
  id: number;
  stock_id: number;
  name: string;
  unit: string;
  quantity: number;
  price: string;
  amount: string;
}

export interface Purchase extends PurchaseSummary {
  items: PurchaseItem[];
  updated_at: string;
}

export interface BusinessProfile {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  state_code: string;
  gst_no: string;
  fssai_no: string;
  bank_name: string;
  bank_account_no: string;
  bank_branch: string;
  bank_ifsc: string;
  updated_at: string;
}

export interface DashboardStats {
  success: boolean;
  month: string;
  total_shops: number;
  total_stock_items: number;
  today_bills: number;
  today_revenue: number;
  total_revenue: number;
  month_revenue: number;
  month_bills: number;
  low_stock_count: number;
  low_stock_items: {
    id: number;
    name: string;
    quantity: number;
    min_stock: number;
    unit: string;
    price: number;
  }[];
  daily_sales: { date: string; day: number; total_amount: number; bills_count: number }[];
  recent_bills: {
    id: number;
    invoice_number: string;
    shop_id: number;
    shop_name: string;
    customer_name: string;
    total_amount: number;
    items_count: number;
    creator: string;
    date: string;
  }[];
  top_selling_items: {
    stock_id: number;
    name: string;
    unit: string;
    total_quantity: number;
    revenue: number;
  }[];
}

export interface StockMovement {
  id: number;
  stock_id: number;
  stock_name: string;
  delta: number;
  quantity_after: number;
  kind: string;
  reference: string;
  note: string;
  created_by_name: string | null;
  created_at: string;
}

export interface Paginated<T> {
  success: boolean;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: T[];
}

export interface PaginatedWithCounts<T> extends Paginated<T> {
  counts?: Record<string, number>;
}

export interface ApiMessage {
  success: boolean;
  message?: string;
}
