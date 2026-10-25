import calendar
from datetime import date

from django.db.models import Count, F, ProtectedError, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role
from accounts.permissions import IsManagement, ReadOnlyForApiRole
from config.api import paginate, parse_date, today
from config.exceptions import BusinessError

from .models import (
    Bill,
    BusinessProfile,
    PurchaseOrder,
    PurchaseStatus,
    Shop,
    Stock,
    StockMovement,
)
from .serializers import (
    BillCreateSerializer,
    BillDetailSerializer,
    BillListSerializer,
    BillUpdateSerializer,
    BusinessProfileSerializer,
    PurchaseCreateSerializer,
    PurchaseDetailSerializer,
    PurchaseListSerializer,
    PurchaseUpdateSerializer,
    ShopSerializer,
    StockMovementSerializer,
    StockSerializer,
)
from .services import (
    create_bill,
    create_purchase,
    delete_bill,
    delete_purchase,
    update_bill,
    update_purchase,
)

MANAGEMENT = {Role.OWNER, Role.SUPERADMIN}


def is_management(user):
    return bool(user and user.is_authenticated and user.role in MANAGEMENT)


def can_manage_record(user, record):
    if is_management(user):
        return True
    owner_id = getattr(record, "owner_id", None) or getattr(record, "created_by_id", None)
    return owner_id == user.id


def can_read_all_bills(user):
    """Owners and super admins see every bill; API accounts read bills for reporting."""
    return is_management(user) or getattr(user, "role", None) == Role.API


def _not_found(message="Record not found."):
    return Response({"success": False, "message": message}, status=status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# Shops
# ---------------------------------------------------------------------------
class ShopListCreateView(APIView):
    permission_classes = [IsAuthenticated, ReadOnlyForApiRole]

    def get(self, request):
        qs = Shop.objects.select_related("owner").all()
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(address__icontains=search)
                | Q(gst_no__icontains=search)
            )

        counts = {
            "all": qs.count(),
            "gst": qs.exclude(gst_no="").count(),
            "no-gst": qs.filter(gst_no="").count(),
            "fssai": qs.exclude(fssai_no="").count(),
            "no-fssai": qs.filter(fssai_no="").count(),
        }

        filter_by = request.query_params.get("filter", "all")
        if filter_by == "gst":
            qs = qs.exclude(gst_no="")
        elif filter_by == "no-gst":
            qs = qs.filter(gst_no="")
        elif filter_by == "fssai":
            qs = qs.exclude(fssai_no="")
        elif filter_by == "no-fssai":
            qs = qs.filter(fssai_no="")

        ordering = request.query_params.get("ordering", "newest")
        ordering_map = {
            "newest": "-created_at",
            "oldest": "created_at",
            "name": "name",
            "name-desc": "-name",
        }
        qs = qs.order_by(ordering_map.get(ordering, "-created_at"), "id")
        return paginate(request, qs, ShopSerializer, extra={"counts": counts})

    def post(self, request):
        serializer = ShopSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shop = serializer.save(owner=request.user)
        return Response(
            {"success": True, "shop": ShopSerializer(shop).data},
            status=status.HTTP_201_CREATED,
        )


class ShopDetailView(APIView):
    permission_classes = [IsAuthenticated, ReadOnlyForApiRole]

    def get_object(self, pk):
        return Shop.objects.select_related("owner").filter(pk=pk).first()

    def get(self, request, pk):
        shop = self.get_object(pk)
        if not shop:
            return _not_found("Shop not found.")
        return Response({"success": True, "shop": ShopSerializer(shop).data})

    def put(self, request, pk):
        shop = self.get_object(pk)
        if not shop:
            return _not_found("Shop not found.")
        if not can_manage_record(request.user, shop):
            return Response(
                {"success": False, "message": "You can only edit shops you created."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = ShopSerializer(shop, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "shop": serializer.data})

    def delete(self, request, pk):
        shop = self.get_object(pk)
        if not shop:
            return _not_found("Shop not found.")
        if not can_manage_record(request.user, shop):
            return Response(
                {"success": False, "message": "You can only delete shops you created."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            shop.delete()
        except ProtectedError:
            return Response(
                {
                    "success": False,
                    "message": "This shop has bills attached. Delete those bills first.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"success": True, "message": "Shop deleted."})


# ---------------------------------------------------------------------------
# Stock
# ---------------------------------------------------------------------------
class StockListCreateView(APIView):
    permission_classes = [IsAuthenticated, ReadOnlyForApiRole]

    def get(self, request):
        qs = Stock.objects.select_related("owner").all()
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(sku__icontains=search))

        counts = {
            "all": qs.count(),
            "in": qs.filter(quantity__gt=0).count(),
            "low": qs.filter(min_stock__gt=0, quantity__lte=F("min_stock")).count(),
            "out": qs.filter(quantity__lte=0).count(),
        }

        filter_by = request.query_params.get("filter", "all")
        if filter_by == "in":
            qs = qs.filter(quantity__gt=0)
        elif filter_by == "out":
            qs = qs.filter(quantity__lte=0)
        elif filter_by == "low":
            qs = qs.filter(min_stock__gt=0, quantity__lte=F("min_stock"))

        ordering = request.query_params.get("ordering", "newest")
        ordering_map = {
            "newest": "-created_at",
            "oldest": "created_at",
            "name": "name",
            "name-desc": "-name",
            "quantity": "quantity",
            "quantity-desc": "-quantity",
        }
        qs = qs.order_by(ordering_map.get(ordering, "-created_at"), "id")
        return paginate(request, qs, StockSerializer, extra={"counts": counts})

    def post(self, request):
        serializer = StockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        stock = serializer.save(owner=request.user)
        if stock.quantity:
            StockMovement.objects.create(
                stock=stock,
                delta=stock.quantity,
                quantity_after=stock.quantity,
                kind=StockMovement.Kind.OPENING,
                reference="OPENING",
                note="Opening stock",
                created_by=request.user,
            )
        return Response(
            {"success": True, "stock": StockSerializer(stock).data},
            status=status.HTTP_201_CREATED,
        )


class StockDetailView(APIView):
    permission_classes = [IsAuthenticated, ReadOnlyForApiRole]

    def get_object(self, pk):
        return Stock.objects.select_related("owner").filter(pk=pk).first()

    def get(self, request, pk):
        stock = self.get_object(pk)
        if not stock:
            return _not_found("Stock item not found.")
        return Response({"success": True, "stock": StockSerializer(stock).data})

    def put(self, request, pk):
        stock = self.get_object(pk)
        if not stock:
            return _not_found("Stock item not found.")
        if not can_manage_record(request.user, stock):
            return Response(
                {"success": False, "message": "You can only edit stock items you created."},
                status=status.HTTP_403_FORBIDDEN,
            )
        previous_quantity = stock.quantity
        serializer = StockSerializer(stock, data=request.data)
        serializer.is_valid(raise_exception=True)
        stock = serializer.save()
        if stock.quantity != previous_quantity:
            StockMovement.objects.create(
                stock=stock,
                delta=stock.quantity - previous_quantity,
                quantity_after=stock.quantity,
                kind=StockMovement.Kind.ADJUSTMENT,
                reference="MANUAL",
                note="Manual quantity adjustment",
                created_by=request.user,
            )
        return Response({"success": True, "stock": serializer.data})

    def delete(self, request, pk):
        stock = self.get_object(pk)
        if not stock:
            return _not_found("Stock item not found.")
        if not can_manage_record(request.user, stock):
            return Response(
                {"success": False, "message": "You can only delete stock items you created."},
                status=status.HTTP_403_FORBIDDEN,
            )
        try:
            stock.delete()
        except ProtectedError:
            return Response(
                {
                    "success": False,
                    "message": "This item is used by bills or purchase orders and cannot be deleted.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"success": True, "message": "Stock item deleted."})


class StockMovementsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        stock = Stock.objects.filter(pk=pk).first()
        if not stock:
            return _not_found("Stock item not found.")
        try:
            limit = min(int(request.query_params.get("limit", 30)), 200)
        except (TypeError, ValueError):
            limit = 30
        movements = stock.movements.select_related("created_by")[:limit]
        return Response(
            {
                "success": True,
                "stock": StockSerializer(stock).data,
                "movements": StockMovementSerializer(movements, many=True).data,
            }
        )


class StockMovementListView(APIView):
    """Workspace-wide stock movement ledger with paging, search and filters."""

    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        qs = StockMovement.objects.select_related("stock", "created_by").all()

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(stock__name__icontains=search)
                | Q(stock__sku__icontains=search)
                | Q(reference__icontains=search)
                | Q(note__icontains=search)
                | Q(created_by__full_name__icontains=search)
            )

        kind = request.query_params.get("kind", "").strip()
        if kind:
            qs = qs.filter(kind=kind)

        stock_id = request.query_params.get("stock_id")
        if stock_id:
            qs = qs.filter(stock_id=stock_id)

        date_value = request.query_params.get("date")
        if date_value not in (None, "", "all"):
            parsed = parse_date(date_value)
            if parsed:
                qs = qs.filter(created_at__date=parsed)

        ordering = request.query_params.get("ordering", "newest")
        qs = qs.order_by("created_at", "id") if ordering == "oldest" else qs.order_by(
            "-created_at", "-id"
        )

        return paginate(request, qs, StockMovementSerializer)


# ---------------------------------------------------------------------------
# Bills
# ---------------------------------------------------------------------------
class BillListCreateView(APIView):
    permission_classes = [IsAuthenticated, ReadOnlyForApiRole]

    def get(self, request):
        qs = (
            Bill.objects.select_related("shop", "created_by")
            .annotate(items_count=Count("items"))
            .all()
        )
        if not can_read_all_bills(request.user):
            qs = qs.filter(created_by=request.user)

        date_value = request.query_params.get("date")
        if date_value not in (None, "", "all"):
            parsed = parse_date(date_value)
            if parsed:
                qs = qs.filter(date=parsed)

        shop_id = request.query_params.get("shop_id")
        if shop_id:
            qs = qs.filter(shop_id=shop_id)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(invoice_number__icontains=search)
                | Q(customer_name__icontains=search)
                | Q(shop__name__icontains=search)
                | Q(created_by__full_name__icontains=search)
            )

        ordering = request.query_params.get("ordering", "newest")
        order = "created_at" if ordering == "oldest" else "-created_at"
        qs = qs.order_by(order, "-id")
        return paginate(request, qs, BillListSerializer)

    def post(self, request):
        serializer = BillCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        shop = Shop.objects.filter(pk=data["shop_id"]).first()
        if not shop:
            return _not_found("Shop not found.")
        bill = create_bill(
            shop=shop,
            date=data.get("date") or today(),
            items=data["items"],
            user=request.user,
        )
        bill = Bill.objects.select_related("shop", "created_by").prefetch_related("items").get(pk=bill.pk)
        return Response(
            {"success": True, "bill": BillDetailSerializer(bill).data},
            status=status.HTTP_201_CREATED,
        )


class BillGroupedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_value = parse_date(request.query_params.get("date"), today())
        bills = (
            Bill.objects.filter(date=date_value)
            .select_related("shop", "created_by")
            .prefetch_related("items")
            .order_by("-created_at", "-id")
        )
        if not can_read_all_bills(request.user):
            bills = bills.filter(created_by=request.user)

        groups = {}
        total_amount = 0
        total_lines = 0
        total_quantity = 0
        for bill in bills:
            items = list(bill.items.all())
            group = groups.setdefault(
                bill.shop_id,
                {
                    "shop_id": bill.shop_id,
                    "shop_name": bill.shop.name,
                    "shop_address": bill.shop.address,
                    "shop_gst_no": bill.shop.gst_no,
                    "bills_count": 0,
                    "total_items": 0,
                    "total_quantity": 0,
                    "total_amount": 0.0,
                    "bills": [],
                },
            )
            group["bills_count"] += 1
            group["total_items"] += len(items)
            group["total_quantity"] += sum(item.quantity for item in items)
            group["total_amount"] = float(
                round(float(group["total_amount"]) + float(bill.total_amount), 2)
            )
            group["bills"].append(BillListSerializer(bill).data)
            total_amount += float(bill.total_amount)
            total_lines += len(items)
            total_quantity += sum(item.quantity for item in items)

        ordered = sorted(groups.values(), key=lambda item: item["total_amount"], reverse=True)
        return Response(
            {
                "success": True,
                "date": date_value.isoformat(),
                "groups": ordered,
                "summary": {
                    "shops": len(ordered),
                    "bills": sum(group["bills_count"] for group in ordered),
                    "lines": total_lines,
                    "quantity": total_quantity,
                    "total_amount": round(total_amount, 2),
                },
            }
        )


class BillShopView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, shop_id):
        shop = Shop.objects.filter(pk=shop_id).first()
        if not shop:
            return _not_found("Shop not found.")
        date_value = parse_date(request.query_params.get("date"), today())
        bills = (
            Bill.objects.filter(shop_id=shop_id, date=date_value)
            .select_related("created_by")
            .prefetch_related("items")
            .order_by("created_at", "id")
        )
        if not can_read_all_bills(request.user):
            bills = bills.filter(created_by=request.user)

        items = []
        subtotal = 0.0
        tax_amount = 0.0
        total_amount = 0.0
        total_quantity = 0
        for bill in bills:
            for item in bill.items.all():
                items.append(
                    {
                        "id": item.id,
                        "bill_id": bill.id,
                        "invoice_number": bill.invoice_number,
                        "stock_id": item.stock_id,
                        "name": item.name,
                        "hsn_code": item.hsn_code,
                        "mrp": item.mrp,
                        "quantity": item.quantity,
                        "unit": item.unit,
                        "price": item.price,
                        "gst_rate": item.gst_rate,
                        "taxable_amount": item.taxable_amount,
                        "sgst": item.sgst,
                        "cgst": item.cgst,
                        "amount": item.amount,
                        "created_by": bill.created_by.full_name,
                    }
                )
                total_quantity += item.quantity
                subtotal += float(item.taxable_amount)
                tax_amount += float(item.sgst) + float(item.cgst)
            total_amount += float(bill.total_amount)

        return Response(
            {
                "success": True,
                "shop": ShopSerializer(shop).data,
                "date": date_value.isoformat(),
                "subtotal": round(subtotal, 2),
                "tax_amount": round(tax_amount, 2),
                "total_amount": round(total_amount, 2),
                "total_quantity": total_quantity,
                "items_count": len(items),
                "bills_count": bills.count(),
                "items": items,
            }
        )


class BillDetailView(APIView):
    permission_classes = [IsAuthenticated, ReadOnlyForApiRole]

    def get_object(self, pk):
        return (
            Bill.objects.select_related("shop", "created_by")
            .prefetch_related("items")
            .filter(pk=pk)
            .first()
        )

    def get(self, request, pk):
        bill = self.get_object(pk)
        if not bill:
            return _not_found("Bill not found.")
        if not can_read_all_bills(request.user) and not can_manage_record(request.user, bill):
            return Response(
                {"success": False, "message": "You can only view your own bills."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({"success": True, "bill": BillDetailSerializer(bill).data})

    def put(self, request, pk):
        bill = self.get_object(pk)
        if not bill:
            return _not_found("Bill not found.")
        if not can_manage_record(request.user, bill):
            return Response(
                {"success": False, "message": "You can only edit your own bills."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = BillUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        shop = None
        if "shop_id" in data:
            shop = Shop.objects.filter(pk=data["shop_id"]).first()
            if not shop:
                return _not_found("Shop not found.")

        bill = update_bill(
            bill=bill,
            shop=shop,
            date=data.get("date"),
            items=data.get("items"),
            user=request.user,
        )
        bill = self.get_object(bill.pk)
        return Response({"success": True, "bill": BillDetailSerializer(bill).data})

    def delete(self, request, pk):
        bill = self.get_object(pk)
        if not bill:
            return _not_found("Bill not found.")
        if not can_manage_record(request.user, bill):
            return Response(
                {"success": False, "message": "You can only delete your own bills."},
                status=status.HTTP_403_FORBIDDEN,
            )
        invoice_number = delete_bill(bill=bill, user=request.user)
        return Response(
            {"success": True, "message": f"Bill {invoice_number} deleted and stock restored."}
        )


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated, IsManagement]

    def get(self, request):
        today_value = timezone.localdate()
        month_param = request.query_params.get("month") or today_value.strftime("%Y-%m")
        try:
            year, month = [int(part) for part in month_param.split("-")[:2]]
            month_start = date(year, month, 1)
        except (ValueError, IndexError):
            month_start = today_value.replace(day=1)
            year, month = month_start.year, month_start.month

        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)

        month_bills = Bill.objects.filter(date__gte=month_start, date__lt=month_end)
        month_revenue = month_bills.aggregate(total=Sum("total_amount"))["total"] or 0

        daily_rows = (
            month_bills.values("date")
            .annotate(total_amount=Sum("total_amount"), bills_count=Count("id"))
            .order_by("date")
        )
        daily_map = {
            row["date"]: {
                "total_amount": float(row["total_amount"] or 0),
                "bills_count": row["bills_count"],
            }
            for row in daily_rows
        }
        days_in_month = calendar.monthrange(year, month)[1]
        daily_sales = []
        for day in range(1, days_in_month + 1):
            current = date(year, month, day)
            entry = daily_map.get(current, {"total_amount": 0.0, "bills_count": 0})
            daily_sales.append({"date": current.isoformat(), "day": day, **entry})

        low_stock = Stock.objects.filter(min_stock__gt=0, quantity__lte=F("min_stock")).order_by(
            "quantity", "name"
        )
        low_stock_items = [
            {
                "id": stock.id,
                "name": stock.name,
                "quantity": stock.quantity,
                "min_stock": stock.min_stock,
                "unit": stock.unit,
                "price": stock.price,
            }
            for stock in low_stock[:8]
        ]

        recent = (
            Bill.objects.select_related("shop", "created_by")
            .annotate(items_count=Count("items"))
            .order_by("-created_at", "-id")[:5]
        )
        recent_bills = [
            {
                "id": bill.id,
                "invoice_number": bill.invoice_number,
                "shop_id": bill.shop_id,
                "shop_name": bill.shop.name,
                "customer_name": bill.customer_name,
                "total_amount": bill.total_amount,
                "items_count": bill.items_count,
                "creator": bill.created_by.full_name,
                "date": bill.date.isoformat(),
            }
            for bill in recent
        ]

        top_rows = (
            Bill.objects.values("items__stock_id", "items__name", "items__unit")
            .annotate(
                total_quantity=Sum("items__quantity"),
                revenue=Sum("items__taxable_amount"),
            )
            .order_by("-total_quantity")[:5]
        )
        top_selling_items = [
            {
                "stock_id": row["items__stock_id"],
                "name": row["items__name"],
                "unit": row["items__unit"],
                "total_quantity": row["total_quantity"] or 0,
                "revenue": row["revenue"] or 0,
            }
            for row in top_rows
        ]

        today_bills = Bill.objects.filter(date=today_value)
        today_totals = today_bills.aggregate(total=Sum("total_amount"))["total"] or 0

        return Response(
            {
                "success": True,
                "month": f"{year:04d}-{month:02d}",
                "total_shops": Shop.objects.count(),
                "total_stock_items": Stock.objects.count(),
                "today_bills": today_bills.count(),
                "today_revenue": today_totals,
                "total_revenue": Bill.objects.aggregate(total=Sum("total_amount"))["total"] or 0,
                "month_revenue": month_revenue,
                "month_bills": month_bills.count(),
                "low_stock_count": low_stock.count(),
                "low_stock_items": low_stock_items,
                "daily_sales": daily_sales,
                "recent_bills": recent_bills,
                "top_selling_items": top_selling_items,
            }
        )


# ---------------------------------------------------------------------------
# Business profile
# ---------------------------------------------------------------------------
class BusinessProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = BusinessProfile.load()
        return Response({"success": True, "profile": BusinessProfileSerializer(profile).data})

    def put(self, request):
        if not is_management(request.user):
            return Response(
                {"success": False, "message": "Only owners and super admins can edit the business profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        profile = BusinessProfile.load()
        serializer = BusinessProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "profile": serializer.data})


# ---------------------------------------------------------------------------
# Purchases
# ---------------------------------------------------------------------------
class PurchaseListCreateView(APIView):
    permission_classes = [IsAuthenticated, ReadOnlyForApiRole]

    def get(self, request):
        qs = (
            PurchaseOrder.objects.select_related("created_by")
            .annotate(items_count=Count("items"))
            .all()
        )
        if not is_management(request.user):
            qs = qs.filter(created_by=request.user)

        date_param = request.query_params.get("date")
        if date_param is None:
            date_value = today()
        elif date_param in ("", "all"):
            date_value = None
        else:
            date_value = parse_date(date_param, today())
        if date_value:
            qs = qs.filter(date=date_value)

        status_filter = request.query_params.get("status", "ALL")
        counts = {
            "ALL": qs.count(),
            "PENDING": qs.filter(status=PurchaseStatus.PENDING).count(),
            "RECEIVED": qs.filter(status=PurchaseStatus.RECEIVED).count(),
        }
        if status_filter in PurchaseStatus.values:
            qs = qs.filter(status=status_filter)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(invoice_number__icontains=search) | Q(created_by__full_name__icontains=search)
            )

        ordering = request.query_params.get("ordering", "newest")
        order = ["date", "-created_at"] if ordering == "oldest" else ["-date", "-created_at"]
        qs = qs.order_by(*order)
        return paginate(request, qs, PurchaseListSerializer, extra={"counts": counts})

    def post(self, request):
        serializer = PurchaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        purchase = create_purchase(
            date=data.get("date") or today(),
            invoice_number=data.get("invoice_number", ""),
            paid_amount=data.get("paid_amount", 0),
            items=data["items"],
            user=request.user,
        )
        purchase = (
            PurchaseOrder.objects.select_related("created_by")
            .prefetch_related("items")
            .get(pk=purchase.pk)
        )
        return Response(
            {"success": True, "purchase": PurchaseDetailSerializer(purchase).data},
            status=status.HTTP_201_CREATED,
        )


class PurchaseDetailView(APIView):
    permission_classes = [IsAuthenticated, ReadOnlyForApiRole]

    def get_object(self, pk):
        return (
            PurchaseOrder.objects.select_related("created_by")
            .prefetch_related("items")
            .filter(pk=pk)
            .first()
        )

    def get(self, request, pk):
        purchase = self.get_object(pk)
        if not purchase:
            return _not_found("Purchase order not found.")
        if not can_manage_record(request.user, purchase):
            return Response(
                {"success": False, "message": "You can only view your own purchase orders."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({"success": True, "purchase": PurchaseDetailSerializer(purchase).data})

    def put(self, request, pk):
        purchase = self.get_object(pk)
        if not purchase:
            return _not_found("Purchase order not found.")
        if not can_manage_record(request.user, purchase):
            return Response(
                {"success": False, "message": "You can only edit your own purchase orders."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = PurchaseUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        purchase = update_purchase(
            purchase=purchase,
            date=data.get("date"),
            invoice_number=data.get("invoice_number"),
            paid_amount=data.get("paid_amount"),
            status=data.get("status"),
            items=data.get("items"),
            user=request.user,
        )
        purchase = self.get_object(purchase.pk)
        return Response({"success": True, "purchase": PurchaseDetailSerializer(purchase).data})

    def delete(self, request, pk):
        purchase = self.get_object(pk)
        if not purchase:
            return _not_found("Purchase order not found.")
        if not can_manage_record(request.user, purchase):
            return Response(
                {"success": False, "message": "You can only delete your own purchase orders."},
                status=status.HTTP_403_FORBIDDEN,
            )
        number = delete_purchase(purchase=purchase, user=request.user)
        return Response(
            {"success": True, "message": f"Purchase order {number} deleted and stock updated."}
        )


class PurchaseStatusView(APIView):
    permission_classes = [IsAuthenticated, ReadOnlyForApiRole]

    def patch(self, request, pk):
        purchase = PurchaseOrder.objects.filter(pk=pk).first()
        if not purchase:
            return _not_found("Purchase order not found.")
        if not can_manage_record(request.user, purchase):
            return Response(
                {"success": False, "message": "You can only update your own purchase orders."},
                status=status.HTTP_403_FORBIDDEN,
            )
        new_status = request.data.get("status")
        if new_status not in PurchaseStatus.values:
            return Response(
                {"success": False, "message": "Status must be PENDING or RECEIVED."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        purchase.status = new_status
        purchase.save(update_fields=["status", "updated_at"])
        purchase = (
            PurchaseOrder.objects.select_related("created_by")
            .prefetch_related("items")
            .get(pk=purchase.pk)
        )
        return Response(
            {
                "success": True,
                "message": "Purchase order marked as received."
                if new_status == PurchaseStatus.RECEIVED
                else "Purchase order marked as pending.",
                "purchase": PurchaseDetailSerializer(purchase).data,
            }
        )
