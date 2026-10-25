import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { landingPath } from "@/lib/roles";
import type { Role } from "@/types";
import { PageLoader } from "@/components/ui/feedback";
import { ProtectedRoute, PublicRoute } from "@/components/RouteGuards";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";

const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const BillsPage = lazy(() =>
  import("@/pages/BillsPage").then((m) => ({ default: m.BillsPage })),
);
const CreateBillPage = lazy(() =>
  import("@/pages/CreateBillPage").then((m) => ({ default: m.CreateBillPage })),
);
const EditBillPage = lazy(() =>
  import("@/pages/EditBillPage").then((m) => ({ default: m.EditBillPage })),
);
const ViewBillPage = lazy(() =>
  import("@/pages/ViewBillPage").then((m) => ({ default: m.ViewBillPage })),
);
const ShopBillsPage = lazy(() =>
  import("@/pages/ShopBillsPage").then((m) => ({ default: m.ShopBillsPage })),
);
const PurchasePage = lazy(() =>
  import("@/pages/PurchasePage").then((m) => ({ default: m.PurchasePage })),
);
const AddPurchasePage = lazy(() =>
  import("@/pages/AddPurchasePage").then((m) => ({ default: m.AddPurchasePage })),
);
const EditPurchasePage = lazy(() =>
  import("@/pages/EditPurchasePage").then((m) => ({ default: m.EditPurchasePage })),
);
const ViewPurchasePage = lazy(() =>
  import("@/pages/ViewPurchasePage").then((m) => ({ default: m.ViewPurchasePage })),
);
const StockPage = lazy(() =>
  import("@/pages/StockPage").then((m) => ({ default: m.StockPage })),
);
const AddStockPage = lazy(() =>
  import("@/pages/AddStockPage").then((m) => ({ default: m.AddStockPage })),
);
const EditStockPage = lazy(() =>
  import("@/pages/EditStockPage").then((m) => ({ default: m.EditStockPage })),
);
const ShopsPage = lazy(() =>
  import("@/pages/ShopsPage").then((m) => ({ default: m.ShopsPage })),
);
const AddShopPage = lazy(() =>
  import("@/pages/AddShopPage").then((m) => ({ default: m.AddShopPage })),
);
const EditShopPage = lazy(() =>
  import("@/pages/EditShopPage").then((m) => ({ default: m.EditShopPage })),
);
const ShopDetailsPage = lazy(() =>
  import("@/pages/ShopDetailsPage").then((m) => ({ default: m.ShopDetailsPage })),
);
const UsersPage = lazy(() =>
  import("@/pages/UsersPage").then((m) => ({ default: m.UsersPage })),
);
const AddUserPage = lazy(() =>
  import("@/pages/AddUserPage").then((m) => ({ default: m.AddUserPage })),
);
const EditUserPage = lazy(() =>
  import("@/pages/EditUserPage").then((m) => ({ default: m.EditUserPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const BusinessProfilePage = lazy(() =>
  import("@/pages/BusinessProfilePage").then((m) => ({ default: m.BusinessProfilePage })),
);
const DataManagementPage = lazy(() =>
  import("@/pages/DataManagementPage").then((m) => ({ default: m.DataManagementPage })),
);
const ProfilePage = lazy(() =>
  import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const AboutPage = lazy(() =>
  import("@/pages/AboutPage").then((m) => ({ default: m.AboutPage })),
);
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);
const BillPrintPage = lazy(() =>
  import("@/pages/print/BillPrintPage").then((m) => ({ default: m.BillPrintPage })),
);
const ShopPrintPage = lazy(() =>
  import("@/pages/print/ShopPrintPage").then((m) => ({ default: m.ShopPrintPage })),
);
const AllPrintPage = lazy(() =>
  import("@/pages/print/AllPrintPage").then((m) => ({ default: m.AllPrintPage })),
);

const MANAGEMENT: Role[] = ["OWNER", "SUPERADMIN"];
const BILLING: Role[] = ["OWNER", "SUPERADMIN", "MARKETING"];
const EVERYONE: Role[] = ["OWNER", "SUPERADMIN", "MARKETING", "API"];

function page(element: ReactNode, label = "Loading page…") {
  return <Suspense fallback={<PageLoader label={label} />}>{element}</Suspense>;
}

function guard(roles: Role[], element: ReactNode) {
  return <ProtectedRoute roles={roles}>{page(element)}</ProtectedRoute>;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={landingPath(user?.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/print/bill/:id" element={page(<BillPrintPage />, "Preparing the invoice…")} />
        <Route
          path="/print/shop/:shopId"
          element={page(<ShopPrintPage />, "Preparing the invoices…")}
        />
        <Route path="/print/all" element={page(<AllPrintPage />, "Preparing the invoices…")} />

        <Route element={<AppLayout />}>
          <Route index element={<HomeRedirect />} />
          <Route path="/dashboard" element={guard(MANAGEMENT, <DashboardPage />)} />

          <Route path="/bills" element={guard(EVERYONE, <BillsPage />)} />
          <Route path="/bills/new" element={guard(BILLING, <CreateBillPage />)} />
          <Route path="/bills/shop/:shopId" element={guard(EVERYONE, <ShopBillsPage />)} />
          <Route path="/bills/:id" element={guard(EVERYONE, <ViewBillPage />)} />
          <Route path="/bills/:id/edit" element={guard(BILLING, <EditBillPage />)} />

          <Route path="/purchase" element={guard(MANAGEMENT, <PurchasePage />)} />
          <Route path="/purchase/new" element={guard(MANAGEMENT, <AddPurchasePage />)} />
          <Route path="/purchase/:id" element={guard(MANAGEMENT, <ViewPurchasePage />)} />
          <Route path="/purchase/:id/edit" element={guard(MANAGEMENT, <EditPurchasePage />)} />

          <Route path="/stock" element={guard(MANAGEMENT, <StockPage />)} />
          <Route path="/stock/new" element={guard(MANAGEMENT, <AddStockPage />)} />
          <Route path="/stock/:id/edit" element={guard(MANAGEMENT, <EditStockPage />)} />

          <Route path="/shops" element={guard(MANAGEMENT, <ShopsPage />)} />
          <Route path="/shops/new" element={guard(MANAGEMENT, <AddShopPage />)} />
          <Route path="/shops/:id" element={guard(MANAGEMENT, <ShopDetailsPage />)} />
          <Route path="/shops/:id/edit" element={guard(MANAGEMENT, <EditShopPage />)} />

          <Route path="/users" element={guard(["SUPERADMIN"], <UsersPage />)} />
          <Route path="/users/new" element={guard(["SUPERADMIN"], <AddUserPage />)} />
          <Route path="/users/:id/edit" element={guard(["SUPERADMIN"], <EditUserPage />)} />

          <Route path="/settings" element={guard(BILLING, <SettingsPage />)} />
          <Route
            path="/settings/business-profile"
            element={guard(MANAGEMENT, <BusinessProfilePage />)}
          />
          <Route path="/settings/data-management" element={guard(BILLING, <DataManagementPage />)} />
          <Route path="/settings/about" element={guard(EVERYONE, <AboutPage />)} />
          <Route path="/profile" element={guard(EVERYONE, <ProfilePage />)} />

          <Route path="*" element={page(<NotFoundPage />)} />
        </Route>
      </Route>
    </Routes>
  );
}
