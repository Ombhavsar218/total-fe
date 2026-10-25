from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from accounts.models import User


class Shop(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField()
    gst_no = models.CharField(max_length=32, blank=True)
    fssai_no = models.CharField(max_length=32, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    state_code = models.CharField(max_length=4, blank=True)
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name="shops")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["owner"]),
        ]

    def __str__(self):
        return self.name


class Stock(models.Model):
    UNIT_CHOICES = [
        ("pcs", "Pieces"),
        ("kg", "Kilograms"),
        ("liters", "Litres"),
        ("boxes", "Boxes"),
        ("packets", "Packets"),
    ]

    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=64, blank=True)
    quantity = models.IntegerField(default=0)
    unit = models.CharField(max_length=16, choices=UNIT_CHOICES, default="pcs")
    price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    mrp = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    hsn_code = models.CharField(max_length=32, blank=True)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    min_stock = models.IntegerField(default=0)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name="stock_items")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["sku"]),
            models.Index(fields=["owner"]),
        ]
        verbose_name_plural = "stock"

    def __str__(self):
        return self.name

    @property
    def is_low_stock(self):
        return self.min_stock > 0 and self.quantity <= self.min_stock

    @property
    def effective_gst_rate(self):
        return self.gst_rate if self.gst_rate is not None else Decimal("5")


class Bill(models.Model):
    invoice_number = models.CharField(max_length=32, unique=True)
    shop = models.ForeignKey(Shop, on_delete=models.PROTECT, related_name="bills")
    # Customer snapshot: invoices must not change when a shop is edited later.
    customer_name = models.CharField(max_length=200)
    customer_address = models.TextField()
    customer_gst = models.CharField(max_length=32, blank=True)
    customer_fssai = models.CharField(max_length=32, blank=True)
    customer_state_code = models.CharField(max_length=4, blank=True)
    date = models.DateField(default=timezone.localdate)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    round_off = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="bills")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["shop", "date"]),
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.customer_name}"


class BillItem(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name="items")
    stock = models.ForeignKey(Stock, on_delete=models.PROTECT, related_name="bill_items")
    name = models.CharField(max_length=200)
    hsn_code = models.CharField(max_length=32, blank=True)
    mrp = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=16)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2)
    taxable_amount = models.DecimalField(max_digits=14, decimal_places=2)
    sgst = models.DecimalField(max_digits=14, decimal_places=2)
    cgst = models.DecimalField(max_digits=14, decimal_places=2)
    amount = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} x {self.quantity}"


class BusinessProfile(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    state_code = models.CharField(max_length=4, blank=True)
    gst_no = models.CharField(max_length=32, blank=True)
    fssai_no = models.CharField(max_length=32, blank=True)
    bank_name = models.CharField(max_length=120, blank=True)
    bank_account_no = models.CharField(max_length=64, blank=True)
    bank_branch = models.CharField(max_length=120, blank=True)
    bank_ifsc = models.CharField(max_length=32, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business profile"
        verbose_name_plural = "Business profile"

    def __str__(self):
        return self.name

    @classmethod
    def load(cls):
        profile = cls.objects.first()
        if profile is None:
            profile = cls.objects.create(
                name="Your Company Name",
                address="Your Company Address",
                state_code="27",
            )
        return profile


class PurchaseStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RECEIVED = "RECEIVED", "Received"


class PurchaseOrder(models.Model):
    invoice_number = models.CharField(max_length=64, unique=True)
    date = models.DateField(default=timezone.localdate)
    status = models.CharField(
        max_length=16, choices=PurchaseStatus.choices, default=PurchaseStatus.PENDING
    )
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    due_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="purchase_orders")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_by"]),
        ]

    def __str__(self):
        return self.invoice_number

    @property
    def item_count(self):
        return self.items.count()


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(
        PurchaseOrder, on_delete=models.CASCADE, related_name="items"
    )
    stock = models.ForeignKey(Stock, on_delete=models.PROTECT, related_name="purchase_items")
    name = models.CharField(max_length=200)
    unit = models.CharField(max_length=16)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.name} x {self.quantity}"


class StockMovement(models.Model):
    """Append-only audit trail for every stock change."""

    class Kind(models.TextChoices):
        BILL = "BILL", "Sale (bill)"
        BILL_EDIT = "BILL_EDIT", "Bill edited"
        BILL_DELETE = "BILL_DELETE", "Bill deleted"
        PURCHASE = "PURCHASE", "Purchase received"
        PURCHASE_EDIT = "PURCHASE_EDIT", "Purchase edited"
        PURCHASE_DELETE = "PURCHASE_DELETE", "Purchase deleted"
        ADJUSTMENT = "ADJUSTMENT", "Manual adjustment"
        OPENING = "OPENING", "Opening stock"

    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name="movements")
    delta = models.IntegerField()
    quantity_after = models.IntegerField()
    kind = models.CharField(max_length=24, choices=Kind.choices)
    reference = models.CharField(max_length=64, blank=True)
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="stock_movements"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["stock", "-created_at"])]

    def __str__(self):
        return f"{self.stock_id}: {self.delta:+d} ({self.kind})"


class DocumentSequence(models.Model):
    """Sequence-backed human readable document numbers."""

    key = models.CharField(max_length=16, unique=True)
    value = models.PositiveIntegerField(default=0)

    @classmethod
    def next(cls, key: str) -> int:
        obj, _ = cls.objects.select_for_update().get_or_create(key=key)
        obj.value += 1
        obj.save(update_fields=["value"])
        return obj.value
