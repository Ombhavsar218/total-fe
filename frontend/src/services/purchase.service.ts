import { http } from "@/lib/api";
import type { PaginatedWithCounts, Purchase, PurchaseStatus, PurchaseSummary } from "@/types";

export interface PurchaseLinePayload {
  stock_id: number;
  quantity: number;
  unit: string;
  price: number;
}

export interface PurchasePayload {
  date: string;
  invoice_number?: string;
  paid_amount?: number;
  items: PurchaseLinePayload[];
}

export interface PurchaseQuery {
  date?: string;
  status?: string;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const purchaseService = {
  async list(params: PurchaseQuery = {}) {
    const { data } = await http.get<PaginatedWithCounts<PurchaseSummary>>("/purchases/", { params });
    return data;
  },
  async get(id: number | string) {
    const { data } = await http.get<{ success: boolean; purchase: Purchase }>(`/purchases/${id}/`);
    return data.purchase;
  },
  async create(payload: PurchasePayload) {
    const { data } = await http.post<{ success: boolean; purchase: Purchase }>("/purchases/", payload);
    return data.purchase;
  },
  async update(id: number | string, payload: Partial<PurchasePayload> & { status?: PurchaseStatus }) {
    const { data } = await http.put<{ success: boolean; purchase: Purchase }>(
      `/purchases/${id}/`,
      payload,
    );
    return data.purchase;
  },
  async remove(id: number | string) {
    const { data } = await http.delete<{ success: boolean; message: string }>(`/purchases/${id}/`);
    return data;
  },
  async updateStatus(id: number | string, status: PurchaseStatus) {
    const { data } = await http.patch<{
      success: boolean;
      message: string;
      purchase: Purchase;
    }>(`/purchases/${id}/status/`, { status });
    return data;
  },
};
