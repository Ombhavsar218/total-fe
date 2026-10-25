import axios from "axios";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://127.0.0.1:8010/api";

export const TOKEN_KEY = "totalstock.token";
export const REFRESH_KEY = "totalstock.refresh";
export const USER_KEY = "totalstock.user";

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export const http = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) throw new Error("No refresh token");
  const response = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
  const token = response.data.access as string;
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = String(original?.url ?? "");

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/refresh")
    ) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken().finally(() => (refreshPromise = null));
        const token = await refreshPromise;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      } catch {
        clearSession();
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export { API_URL };
