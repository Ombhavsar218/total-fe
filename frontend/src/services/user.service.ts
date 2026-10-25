import { http } from "@/lib/api";
import type { AuthUser, Paginated, Role } from "@/types";

export interface UserPayload {
  full_name: string;
  email: string;
  password?: string;
  role: Role;
  is_active: boolean;
}

export interface UserQuery {
  search?: string;
  role?: string;
  active?: string;
  page?: number;
  page_size?: number;
}

export const userService = {
  async list(params: UserQuery = {}) {
    const { data } = await http.get<Paginated<AuthUser>>("/users/", { params });
    return data;
  },
  async get(id: number | string) {
    const { data } = await http.get<{ success: boolean; user: AuthUser }>(`/users/${id}/`);
    return data.user;
  },
  async create(payload: UserPayload) {
    const { data } = await http.post<{ success: boolean; user: AuthUser }>("/users/", payload);
    return data.user;
  },
  async update(id: number | string, payload: Partial<UserPayload>) {
    const { data } = await http.put<{ success: boolean; user: AuthUser }>(`/users/${id}/`, payload);
    return data.user;
  },
  async remove(id: number | string) {
    const { data } = await http.delete<{ success: boolean; message: string }>(`/users/${id}/`);
    return data;
  },
  async toggleStatus(id: number | string) {
    const { data } = await http.patch<{ success: boolean; message: string; user: AuthUser }>(
      `/users/${id}/toggle-status/`,
    );
    return data;
  },
};
