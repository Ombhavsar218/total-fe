import { http } from "@/lib/api";
import type { Paginated, PaginatedWithCounts, Stock, StockMovement } from "@/types";

export interface StockPayload {
  name: string;
  sku?: string;
  quantity: number;
  unit: string;
  price: number;
  mrp?: number | null;
  hsn_code?: string;
  gst_rate?: number | null;
  min_stock?: number;
  description?: string;
}

export interface StockQuery {
  search?: string;
  ordering?: string;
  filter?: string;
  page?: number;
  page_size?: number;
}

export interface MovementQuery {
  search?: string;
  kind?: string;
  stock_id?: number | string;
  date?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const stockService = {
  async list(params: StockQuery = {}) {
    const { data } = await http.get<PaginatedWithCounts<Stock>>("/stocks/", { params });
    return data;
  },
  async all() {
    const collected: Stock[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const { data } = await http.get<Paginated<Stock>>("/stocks/", {
        params: { page, page_size: 100, ordering: "name" },
      });
      collected.push(...data.results);
      totalPages = data.total_pages;
      page += 1;
    } while (page <= totalPages);
    return collected;
  },
  async get(id: number | string) {
    const { data } = await http.get<{ success: boolean; stock: Stock }>(`/stocks/${id}/`);
    return data.stock;
  },
  async create(payload: StockPayload) {
    const { data } = await http.post<{ success: boolean; stock: Stock }>("/stocks/", payload);
    return data.stock;
  },
  async update(id: number | string, payload: Partial<StockPayload>) {
    const { data } = await http.put<{ success: boolean; stock: Stock }>(`/stocks/${id}/`, payload);
    return data.stock;
  },
  async remove(id: number | string) {
    const { data } = await http.delete<{ success: boolean; message: string }>(`/stocks/${id}/`);
    return data;
  },
  async movements(id: number | string, limit = 30) {
    const { data } = await http.get<{
      success: boolean;
      stock: Stock;
      movements: StockMovement[];
    }>(`/stocks/${id}/movements/`, { params: { limit } });
    return data;
  },
  async listMovements(params: MovementQuery = {}) {
    const { data } = await http.get<Paginated<StockMovement>>("/movements/", { params });
    return data;
  },
  async allMovements(params: Omit<MovementQuery, "page" | "page_size"> = {}) {
    const collected: StockMovement[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const { data } = await http.get<Paginated<StockMovement>>("/movements/", {
        params: { ...params, page, page_size: 100 },
      });
      collected.push(...data.results);
      totalPages = data.total_pages;
      page += 1;
    } while (page <= totalPages);
    return collected;
  },
};
