import { http } from "@/lib/api";
import type {
  Bill,
  BillSummary,
  GroupedBillsResponse,
  Paginated,
  ShopBillsResponse,
} from "@/types";

export interface BillLinePayload {
  stock_id: number;
  quantity: number;
  unit: string;
  price: number;
}

export interface BillPayload {
  shop_id: number;
  date: string;
  items: BillLinePayload[];
}

export interface BillQuery {
  date?: string;
  search?: string;
  shop_id?: number;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const billService = {
  async list(params: BillQuery = {}) {
    const { data } = await http.get<Paginated<BillSummary>>("/bills/", { params });
    return data;
  },
  async grouped(date: string) {
    const { data } = await http.get<GroupedBillsResponse>("/bills/grouped/", { params: { date } });
    return data;
  },
  async shopBills(shopId: number | string, date: string) {
    const { data } = await http.get<ShopBillsResponse>(`/bills/shop/${shopId}/`, {
      params: { date },
    });
    return data;
  },
  async get(id: number | string) {
    const { data } = await http.get<{ success: boolean; bill: Bill }>(`/bills/${id}/`);
    return data.bill;
  },
  async create(payload: BillPayload) {
    const { data } = await http.post<{ success: boolean; bill: Bill }>("/bills/", payload);
    return data.bill;
  },
  async update(id: number | string, payload: Partial<BillPayload>) {
    const { data } = await http.put<{ success: boolean; bill: Bill }>(`/bills/${id}/`, payload);
    return data.bill;
  },
  async remove(id: number | string) {
    const { data } = await http.delete<{ success: boolean; message: string }>(`/bills/${id}/`);
    return data;
  },
};
