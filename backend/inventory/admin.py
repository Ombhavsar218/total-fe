from django.contrib import admin

from .models import (
    Bill,
    BillItem,
    BusinessProfile,
    DocumentSequence,
    PurchaseOrder,
    PurchaseOrderItem,
    Shop,
    Stock,
    StockMovement,
)


class BillItemInline(admin.TabularInline):
    model = BillItem
    extra = 0
    readonly_fields = ["taxable_amount", "sgst", "cgst", "amount"]


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "customer_name", "date", "total_amount", "created_by"]
    list_filter = ["date"]
    search_fields = ["invoice_number", "customer_name"]
    inlines = [BillItemInline]


class PurchaseItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 0


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "date", "status", "total_amount", "paid_amount", "due_amount"]
    list_filter = ["status", "date"]
    search_fields = ["invoice_number"]
    inlines = [PurchaseItemInline]


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ["name", "gst_no", "phone", "owner", "created_at"]
    search_fields = ["name", "gst_no", "phone"]


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ["name", "sku", "quantity", "unit", "price", "min_stock", "owner"]
    list_filter = ["unit"]
    search_fields = ["name", "sku"]


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ["stock", "delta", "quantity_after", "kind", "reference", "created_at"]
    list_filter = ["kind"]
    search_fields = ["stock__name", "reference"]


@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    list_display = ["name", "gst_no", "phone", "updated_at"]


@admin.register(DocumentSequence)
class DocumentSequenceAdmin(admin.ModelAdmin):
    list_display = ["key", "value"]
