from django.urls import path

from .views import (
    BillDetailView,
    BillGroupedView,
    BillListCreateView,
    BillShopView,
    BusinessProfileView,
    DashboardStatsView,
    PurchaseDetailView,
    PurchaseListCreateView,
    PurchaseStatusView,
    ShopDetailView,
    ShopListCreateView,
    StockDetailView,
    StockListCreateView,
    StockMovementListView,
    StockMovementsView,
)

urlpatterns = [
    # Shops
    path("shops/", ShopListCreateView.as_view(), name="shop-list"),
    path("shops/<int:pk>/", ShopDetailView.as_view(), name="shop-detail"),
    # Stock
    path("stocks/", StockListCreateView.as_view(), name="stock-list"),
    path("stocks/<int:pk>/", StockDetailView.as_view(), name="stock-detail"),
    path("stocks/<int:pk>/movements/", StockMovementsView.as_view(), name="stock-movements"),
    path("movements/", StockMovementListView.as_view(), name="movement-list"),
    # Bills
    path("bills/", BillListCreateView.as_view(), name="bill-list"),
    path("bills/grouped/", BillGroupedView.as_view(), name="bill-grouped"),
    path("bills/shop/<int:shop_id>/", BillShopView.as_view(), name="bill-shop"),
    path("bills/<int:pk>/", BillDetailView.as_view(), name="bill-detail"),
    # Purchases
    path("purchases/", PurchaseListCreateView.as_view(), name="purchase-list"),
    path("purchases/<int:pk>/", PurchaseDetailView.as_view(), name="purchase-detail"),
    path("purchases/<int:pk>/status/", PurchaseStatusView.as_view(), name="purchase-status"),
    # Dashboard & profile
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("business-profile/", BusinessProfileView.as_view(), name="business-profile"),
]
