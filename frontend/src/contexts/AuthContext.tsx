import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/auth.service";
import { clearSession } from "@/lib/api";
import { landingPath } from "@/lib/roles";
import type { AuthUser } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authService.getStoredUser());
  const [isLoading, setIsLoading] = useState(() => authService.hasToken());
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    if (!authService.hasToken()) {
      setIsLoading(false);
      return;
    }
    authService
      .me()
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        if (!cancelled) {
          clearSession();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authService.login(email, password);
    setUser(data.user);
    setIsLoading(false);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    const current = await authService.me();
    setUser(current);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(currentPassword, newPassword);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshUser,
      changePassword,
    }),
    [user, isLoading, login, logout, refreshUser, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider");
  return context;
}

export function useLandingPath() {
  const { user } = useAuth();
  return landingPath(user?.role);
}
