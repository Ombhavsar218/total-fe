import { http, TOKEN_KEY, REFRESH_KEY, USER_KEY, clearSession } from "@/lib/api";
import type { AuthUser } from "@/types";

interface LoginResponse {
  success: boolean;
  token: string;
  access: string;
  refresh: string;
  user: AuthUser;
}

export const authService = {
  async login(email: string, password: string) {
    const { data } = await http.post<LoginResponse>("/auth/login/", { email, password });
    localStorage.setItem(TOKEN_KEY, data.access ?? data.token);
    localStorage.setItem(REFRESH_KEY, data.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data;
  },

  async me() {
    const { data } = await http.get<{ success: boolean; user: AuthUser }>("/auth/me/");
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  },

  async changePassword(current_password: string, new_password: string) {
    const { data } = await http.post<{ success: boolean; message: string }>("/auth/change-password/", {
      current_password,
      new_password,
    });
    return data;
  },

  logout() {
    clearSession();
  },

  getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  hasToken() {
    return Boolean(localStorage.getItem(TOKEN_KEY));
  },
};
