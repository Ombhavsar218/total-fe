from decimal import Decimal

from rest_framework import serializers

from accounts.models import User
from accounts.serializers import UserBriefSerializer

from .models import (
    Bill,
    BillItem,
    BusinessProfile,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseStatus,
    Shop,
    Stock,
    StockMovement,
)


# ---------------------------------------------------------------------------
# Shops
# ---------------------------------------------------------------------------
class ShopSerializer(serializers.ModelSerializer):
    owner = UserBriefSerializer(read_only=True)
    owner_id = serializers.IntegerField(read_only=True)
    has_gst = serializers.SerializerMethodField()
    has_fssai = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        fields = [
            "id",
            "name",
            "address",
            "gst_no",
            "fssai_no",
            "phone",
            "email",
            "state_code",
            "owner",
            "owner_id",
            "has_gst",
            "has_fssai",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "owner_id", "created_at", "updated_at"]

    def get_has_gst(self, obj):
        return bool(obj.gst_no)

    def get_has_fssai(self, obj):
        return bool(obj.fssai_no)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Shop name is required.")
        return value

    def validate_address(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Shop address is required.")
        return value


# ---------------------------------------------------------------------------
# Stock
# ---------------------------------------------------------------------------
class StockSerializer(serializers.ModelSerializer):
    owner = UserBriefSerializer(read_only=True)
    owner_id = serializers.IntegerField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = [
            "id",
            "name",
            "sku",
            "quantity",
            "unit",
            "price",
            "mrp",
            "hsn_code",
            "gst_rate",
            "min_stock",
            "description",
            "owner",
            "owner_id",
            "is_low_stock",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner", "owner_id", "created_at", "updated_at"]

    def get_status(self, obj):
        if obj.quantity <= 0:
            return "out"
        if obj.is_low_stock:
            return "low"
        return "in"

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Item name is required.")
        return value

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Quantity cannot be negative.")
        return value

    def validate_min_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Minimum stock cannot be negative.")
        return value

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate_mrp(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("MRP cannot be negative.")
        return value

    def validate_gst_rate(self, value):
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("GST rate must be between 0 and 100.")
        return value


# ---------------------------------------------------------------------------
# Bills
# ---------------------------------------------------------------------------
class BillItemInputSerializer(serializers.Serializer):
    stock_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    unit = serializers.CharField(max_length=16)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))


class BillCreateSerializer(serializers.Serializer):
    shop_id = serializers.IntegerField(min_value=1)
    date = serializers.DateField(required=False)
    items = BillItemInputSerializer(many=True, allow_empty=False)


class BillUpdateSerializer(serializers.Serializer):
    shop_id = serializers.IntegerField(min_value=1, required=False)
    date = serializers.DateField(required=False)
    items = BillItemInputSerializer(many=True, allow_empty=False, required=False)


class BillItemSerializer(serializers.ModelSerializer):
    stock_id = serializers.IntegerField(source="stock.id", read_only=True)

    class Meta:
        model = BillItem
        fields = [
            "id",
            "stock_id",
            "name",
            "hsn_code",
            "mrp",
            "unit",
            "quantity",
            "price",
            "gst_rate",
            "taxable_amount",
            "sgst",
            "cgst",
            "amount",
        ]


class BillListSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    customer = serializers.CharField(source="customer_name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    created_by_id = serializers.IntegerField(source="created_by.id", read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Bill
        fields = [
            "id",
            "invoice_number",
            "shop_id",
            "shop_name",
            "customer",
            "customer_name",
            "date",
            "subtotal",
            "tax_amount",
            "round_off",
            "total_amount",
            "items_count",
            "created_by_id",
            "created_by_name",
            "created_at",
        ]

    def get_items_count(self, obj):
        annotated = getattr(obj, "items_count", None)
        if annotated is not None:
            return annotated
        return len(obj.items.all())


class BillDetailSerializer(serializers.ModelSerializer):
    items = BillItemSerializer(many=True, read_only=True)
    shop = ShopSerializer(read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    created_by_id = serializers.IntegerField(source="created_by.id", read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Bill
        fields = [
            "id",
            "invoice_number",
            "shop",
            "customer_name",
            "customer_address",
            "customer_gst",
            "customer_fssai",
            "customer_state_code",
            "date",
            "subtotal",
            "tax_amount",
            "round_off",
            "total_amount",
            "items",
            "items_count",
            "created_by_id",
            "created_by_name",
            "created_at",
            "updated_at",
        ]

    def get_items_count(self, obj):
        return len(obj.items.all())


# ---------------------------------------------------------------------------
# Business profile
# ---------------------------------------------------------------------------
class BusinessProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessProfile
        fields = [
            "id",
            "name",
            "address",
            "phone",
            "email",
            "state_code",
            "gst_no",
            "fssai_no",
            "bank_name",
            "bank_account_no",
            "bank_branch",
            "bank_ifsc",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Business name is required.")
        return value

    def validate_address(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Business address is required.")
        return value


# ---------------------------------------------------------------------------
# Purchases
# ---------------------------------------------------------------------------
class PurchaseItemInputSerializer(serializers.Serializer):
    stock_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    unit = serializers.CharField(max_length=16)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0"))


class PurchaseCreateSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    invoice_number = serializers.CharField(max_length=64, required=False, allow_blank=True)
    paid_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False
    )
    items = PurchaseItemInputSerializer(many=True, allow_empty=False)


class PurchaseUpdateSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    invoice_number = serializers.CharField(max_length=64, required=False, allow_blank=True)
    paid_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, min_value=Decimal("0"), required=False
    )
    status = serializers.ChoiceField(choices=PurchaseStatus.choices, required=False)
    items = PurchaseItemInputSerializer(many=True, allow_empty=False, required=False)


class PurchaseItemSerializer(serializers.ModelSerializer):
    stock_id = serializers.IntegerField(source="stock.id", read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "stock_id", "name", "unit", "quantity", "price", "amount"]


class PurchaseListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    created_by_id = serializers.IntegerField(source="created_by.id", read_only=True)
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "invoice_number",
            "date",
            "status",
            "subtotal",
            "total_amount",
            "paid_amount",
            "due_amount",
            "items_count",
            "created_by_id",
            "created_by_name",
            "created_at",
        ]

    def get_items_count(self, obj):
        annotated = getattr(obj, "items_count", None)
        if annotated is not None:
            return annotated
        return len(obj.items.all())


class PurchaseDetailSerializer(serializers.ModelSerializer):
    items = PurchaseItemSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    created_by_id = serializers.IntegerField(source="created_by.id", read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id",
            "invoice_number",
            "date",
            "status",
            "subtotal",
            "total_amount",
            "paid_amount",
            "due_amount",
            "items",
            "created_by_id",
            "created_by_name",
            "created_at",
            "updated_at",
        ]


class StockMovementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    stock_name = serializers.CharField(source="stock.name", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "stock_id",
            "stock_name",
            "delta",
            "quantity_after",
            "kind",
            "reference",
            "note",
            "created_by_name",
            "created_at",
        ]


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------
class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "email", "role", "is_active"]
