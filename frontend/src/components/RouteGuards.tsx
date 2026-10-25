import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { landingPath } from "@/lib/roles";
import { PageLoader } from "@/components/ui/feedback";
import type { Role } from "@/types";

export function ProtectedRoute({ roles, children }: { roles?: Role[]; children?: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader label="Checking your session…" />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={landingPath(user.role)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function PublicRoute({ children }: { children?: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader label="Starting TotalStock…" />;
  if (user) return <Navigate to={landingPath(user.role)} replace />;

  return children ? <>{children}</> : <Outlet />;
}
