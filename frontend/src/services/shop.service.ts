import { http } from "@/lib/api";
import type { PaginatedWithCounts, Shop } from "@/types";

export interface ShopPayload {
  name: string;
  address: string;
  gst_no?: string;
  fssai_no?: string;
  phone?: string;
  email?: string;
  state_code?: string;
}

export interface ShopQuery {
  search?: string;
  ordering?: string;
  filter?: string;
  page?: number;
  page_size?: number;
}

export const shopService = {
  async list(params: ShopQuery = {}) {
    const { data } = await http.get<PaginatedWithCounts<Shop>>("/shops/", { params });
    return data;
  },
  async all() {
    const collected: Shop[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const data = await shopService.list({ page, page_size: 100, ordering: "name" });
      collected.push(...data.results);
      totalPages = data.total_pages;
      page += 1;
    } while (page <= totalPages);
    return collected;
  },
  async get(id: number | string) {
    const { data } = await http.get<{ success: boolean; shop: Shop }>(`/shops/${id}/`);
    return data.shop;
  },
  async create(payload: ShopPayload) {
    const { data } = await http.post<{ success: boolean; shop: Shop }>("/shops/", payload);
    return data.shop;
  },
  async update(id: number | string, payload: Partial<ShopPayload>) {
    const { data } = await http.put<{ success: boolean; shop: Shop }>(`/shops/${id}/`, payload);
    return data.shop;
  },
  async remove(id: number | string) {
    const { data } = await http.delete<{ success: boolean; message: string }>(`/shops/${id}/`);
    return data;
  },
};
