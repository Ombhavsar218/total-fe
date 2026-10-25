"""Transactional business logic for bills, purchases and stock movements.

All stock mutations happen inside `transaction.atomic()` blocks with row locks
(`select_for_update`) so two concurrent bills cannot oversell the same item.
"""
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from config.exceptions import BusinessError

from .models import (
    Bill,
    BillItem,
    DocumentSequence,
    PurchaseOrder,
    PurchaseOrderItem,
    Stock,
    StockMovement,
)

CENT = Decimal("0.01")
ONE = Decimal("1")
DEFAULT_GST_RATE = Decimal("5")


def money(value) -> Decimal:
    return Decimal(value or 0).quantize(CENT, rounding=ROUND_HALF_UP)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _lock_stocks(stock_ids):
    ids = sorted({int(sid) for sid in stock_ids})
    stocks = list(Stock.objects.select_for_update().filter(id__in=ids).order_by("id"))
    by_id = {stock.id: stock for stock in stocks}
    missing = [sid for sid in ids if sid not in by_id]
    if missing:
        raise BusinessError(f"Stock item with id {missing[0]} was not found.")
    return by_id


def _requested_quantities(items):
    requested = defaultdict(int)
    for item in items:
        requested[item["stock_id"]] += item["quantity"]
    return requested


def _assert_available(stocks, items, available=None):
    available = available or {stock_id: stock.quantity for stock_id, stock in stocks.items()}
    for stock_id, quantity in _requested_quantities(items).items():
        stock = stocks[stock_id]
        if available[stock_id] < quantity:
            raise BusinessError(
                f'Insufficient stock for "{stock.name}". '
                f"Available: {available[stock_id]}, requested: {quantity}."
            )


def _bill_lines(stocks, items):
    lines = []
    subtotal = Decimal("0")
    tax_total = Decimal("0")
    for item in items:
        stock = stocks[item["stock_id"]]
        quantity = item["quantity"]
        price = money(item["price"])
        taxable = money(price * quantity)
        rate = money(stock.effective_gst_rate)
        sgst = money(taxable * rate / Decimal("200"))
        cgst = money(taxable * rate / Decimal("200"))
        subtotal += taxable
        tax_total += sgst + cgst
        lines.append(
            {
                "stock_id": stock.id,
                "name": stock.name,
                "hsn_code": stock.hsn_code or "",
                "mrp": stock.mrp,
                "unit": item["unit"],
                "quantity": quantity,
                "price": price,
                "gst_rate": rate,
                "taxable_amount": taxable,
                "sgst": sgst,
                "cgst": cgst,
                "amount": taxable,
            }
        )

    subtotal = money(subtotal)
    tax_total = money(tax_total)
    gross = subtotal + tax_total
    total = money(gross.quantize(ONE, rounding=ROUND_HALF_UP))
    round_off = money(total - gross)
    return lines, {
        "subtotal": subtotal,
        "tax_amount": tax_total,
        "round_off": round_off,
        "total_amount": total,
    }


def _purchase_lines(stocks, items):
    lines = []
    total = Decimal("0")
    for item in items:
        stock = stocks[item["stock_id"]]
        price = money(item["price"])
        amount = money(price * item["quantity"])
        total += amount
        lines.append(
            {
                "stock_id": stock.id,
                "name": stock.name,
                "unit": item["unit"],
                "quantity": item["quantity"],
                "price": price,
                "amount": amount,
            }
        )
    return lines, money(total)


def _movement(stock_id, delta, quantity_after, kind, reference, user, note=""):
    return StockMovement(
        stock_id=stock_id,
        delta=delta,
        quantity_after=quantity_after,
        kind=kind,
        reference=reference,
        note=note,
        created_by=user,
    )


def _persist_quantities(stocks, quantities):
    changed = []
    now = timezone.now()
    for stock_id, stock in stocks.items():
        new_quantity = quantities[stock_id]
        if stock.quantity != new_quantity:
            stock.quantity = new_quantity
            stock.updated_at = now
            changed.append(stock)
    if changed:
        Stock.objects.bulk_update(changed, ["quantity", "updated_at"])


def _customer_snapshot(shop):
    return {
        "customer_name": shop.name,
        "customer_address": shop.address,
        "customer_gst": shop.gst_no or "",
        "customer_fssai": shop.fssai_no or "",
        "customer_state_code": shop.state_code or "",
    }


def _next_invoice_number(prefix: str) -> str:
    sequence = DocumentSequence.next(prefix)
    return f"{prefix}-{sequence:04d}"


# ---------------------------------------------------------------------------
# Bills
# ---------------------------------------------------------------------------
@transaction.atomic
def create_bill(*, shop, date, items, user):
    stocks = _lock_stocks([item["stock_id"] for item in items])
    _assert_available(stocks, items)
    lines, totals = _bill_lines(stocks, items)

    invoice_number = _next_invoice_number("INV")
    bill = Bill.objects.create(
        invoice_number=invoice_number,
        shop=shop,
        date=date,
        created_by=user,
        **_customer_snapshot(shop),
        **totals,
    )

    BillItem.objects.bulk_create(
        [
            BillItem(
                bill=bill,
                stock=stocks[line["stock_id"]],
                name=line["name"],
                hsn_code=line["hsn_code"],
                mrp=line["mrp"],
                unit=line["unit"],
                quantity=line["quantity"],
                price=line["price"],
                gst_rate=line["gst_rate"],
                taxable_amount=line["taxable_amount"],
                sgst=line["sgst"],
                cgst=line["cgst"],
                amount=line["amount"],
            )
            for line in lines
        ]
    )

    quantities = {stock_id: stock.quantity for stock_id, stock in stocks.items()}
    movements = []
    for line in lines:
        stock_id = line["stock_id"]
        quantities[stock_id] -= line["quantity"]
        movements.append(
            _movement(
                stock_id,
                -line["quantity"],
                quantities[stock_id],
                StockMovement.Kind.BILL,
                invoice_number,
                user,
                f"Sold {line['quantity']} {line['unit']}",
            )
        )
    _persist_quantities(stocks, quantities)
    StockMovement.objects.bulk_create(movements)
    return bill


@transaction.atomic
def update_bill(*, bill, shop=None, date=None, items=None, user=None):
    bill = Bill.objects.select_for_update().get(pk=bill.pk)
    old_items = list(bill.items.select_related("stock"))

    if items is not None:
        stock_ids = [item.stock_id for item in old_items] + [item["stock_id"] for item in items]
        stocks = _lock_stocks(stock_ids)
        quantities = {stock_id: stock.quantity for stock_id, stock in stocks.items()}
        movements = []

        for old_item in old_items:
            stock_id = old_item.stock_id
            quantities[stock_id] += old_item.quantity
            movements.append(
                _movement(
                    stock_id,
                    old_item.quantity,
                    quantities[stock_id],
                    StockMovement.Kind.BILL_EDIT,
                    bill.invoice_number,
                    user,
                    "Old bill line reverted",
                )
            )

        _assert_available(stocks, items, quantities)
        lines, totals = _bill_lines(stocks, items)

        for line in lines:
            stock_id = line["stock_id"]
            quantities[stock_id] -= line["quantity"]
            movements.append(
                _movement(
                    stock_id,
                    -line["quantity"],
                    quantities[stock_id],
                    StockMovement.Kind.BILL_EDIT,
                    bill.invoice_number,
                    user,
                    "New bill line applied",
                )
            )

        bill.items.all().delete()
        BillItem.objects.bulk_create(
            [
                BillItem(
                    bill=bill,
                    stock=stocks[line["stock_id"]],
                    name=line["name"],
                    hsn_code=line["hsn_code"],
                    mrp=line["mrp"],
                    unit=line["unit"],
                    quantity=line["quantity"],
                    price=line["price"],
                    gst_rate=line["gst_rate"],
                    taxable_amount=line["taxable_amount"],
                    sgst=line["sgst"],
                    cgst=line["cgst"],
                    amount=line["amount"],
                )
                for line in lines
            ]
        )
        _persist_quantities(stocks, quantities)
        StockMovement.objects.bulk_create(movements)
        bill.subtotal = totals["subtotal"]
        bill.tax_amount = totals["tax_amount"]
        bill.round_off = totals["round_off"]
        bill.total_amount = totals["total_amount"]

    if shop is not None and shop.pk != bill.shop_id:
        bill.shop = shop
        for field, value in _customer_snapshot(shop).items():
            setattr(bill, field, value)
    if date is not None:
        bill.date = date

    bill.save()
    return bill


@transaction.atomic
def delete_bill(*, bill, user):
    bill = Bill.objects.select_for_update().get(pk=bill.pk)
    items = list(bill.items.all())
    if items:
        stocks = _lock_stocks([item.stock_id for item in items])
        quantities = {stock_id: stock.quantity for stock_id, stock in stocks.items()}
        movements = []
        for item in items:
            stock_id = item.stock_id
            quantities[stock_id] += item.quantity
            movements.append(
                _movement(
                    stock_id,
                    item.quantity,
                    quantities[stock_id],
                    StockMovement.Kind.BILL_DELETE,
                    bill.invoice_number,
                    user,
                    f"Bill deleted - restored {item.quantity} {item.unit}",
                )
            )
        _persist_quantities(stocks, quantities)
        StockMovement.objects.bulk_create(movements)

    invoice_number = bill.invoice_number
    bill.delete()
    return invoice_number


# ---------------------------------------------------------------------------
# Purchases
# ---------------------------------------------------------------------------
def _normalise_po_number(raw, *, exclude_pk=None):
    value = (raw or "").strip()
    if value:
        duplicate = PurchaseOrder.objects.filter(invoice_number=value)
        if exclude_pk:
            duplicate = duplicate.exclude(pk=exclude_pk)
        if duplicate.exists():
            raise BusinessError("A purchase order with this invoice number already exists.")
        return value
    return _next_invoice_number("PO")


def _po_financials(total, paid):
    paid = money(paid or 0)
    if paid > total:
        raise BusinessError("Paid amount cannot be greater than the total amount.")
    return paid, money(total - paid)


@transaction.atomic
def create_purchase(*, date, invoice_number, paid_amount, items, user):
    stocks = _lock_stocks([item["stock_id"] for item in items])
    lines, total = _purchase_lines(stocks, items)
    paid, due = _po_financials(total, paid_amount)
    number = _normalise_po_number(invoice_number)

    purchase = PurchaseOrder.objects.create(
        invoice_number=number,
        date=date,
        subtotal=total,
        total_amount=total,
        paid_amount=paid,
        due_amount=due,
        created_by=user,
    )
    PurchaseOrderItem.objects.bulk_create(
        [
            PurchaseOrderItem(
                purchase_order=purchase,
                stock=stocks[line["stock_id"]],
                name=line["name"],
                unit=line["unit"],
                quantity=line["quantity"],
                price=line["price"],
                amount=line["amount"],
            )
            for line in lines
        ]
    )

    quantities = {stock_id: stock.quantity for stock_id, stock in stocks.items()}
    movements = []
    for line in lines:
        stock_id = line["stock_id"]
        quantities[stock_id] += line["quantity"]
        movements.append(
            _movement(
                stock_id,
                line["quantity"],
                quantities[stock_id],
                StockMovement.Kind.PURCHASE,
                number,
                user,
                f"Received {line['quantity']} {line['unit']}",
            )
        )
    _persist_quantities(stocks, quantities)
    StockMovement.objects.bulk_create(movements)
    return purchase


@transaction.atomic
def update_purchase(*, purchase, date=None, invoice_number=None, paid_amount=None, status=None, items=None, user=None):
    purchase = PurchaseOrder.objects.select_for_update().get(pk=purchase.pk)
    old_items = list(purchase.items.select_related("stock"))

    if items is not None:
        stock_ids = [item.stock_id for item in old_items] + [item["stock_id"] for item in items]
        stocks = _lock_stocks(stock_ids)
        quantities = {stock_id: stock.quantity for stock_id, stock in stocks.items()}
        movements = []

        for old_item in old_items:
            stock_id = old_item.stock_id
            if quantities[stock_id] < old_item.quantity:
                raise BusinessError(
                    f'Cannot reverse "{old_item.name}" from this purchase: only '
                    f"{quantities[stock_id]} in stock but {old_item.quantity} came in. "
                    "The stock may already be sold."
                )
            quantities[stock_id] -= old_item.quantity
            movements.append(
                _movement(
                    stock_id,
                    -old_item.quantity,
                    quantities[stock_id],
                    StockMovement.Kind.PURCHASE_EDIT,
                    purchase.invoice_number,
                    user,
                    "Old purchase line reverted",
                )
            )

        lines, total = _purchase_lines(stocks, items)
        for line in lines:
            stock_id = line["stock_id"]
            quantities[stock_id] += line["quantity"]
            movements.append(
                _movement(
                    stock_id,
                    line["quantity"],
                    quantities[stock_id],
                    StockMovement.Kind.PURCHASE_EDIT,
                    purchase.invoice_number,
                    user,
                    "New purchase line applied",
                )
            )

        purchase.items.all().delete()
        PurchaseOrderItem.objects.bulk_create(
            [
                PurchaseOrderItem(
                    purchase_order=purchase,
                    stock=stocks[line["stock_id"]],
                    name=line["name"],
                    unit=line["unit"],
                    quantity=line["quantity"],
                    price=line["price"],
                    amount=line["amount"],
                )
                for line in lines
            ]
        )
        _persist_quantities(stocks, quantities)
        StockMovement.objects.bulk_create(movements)
        purchase.subtotal = total
        purchase.total_amount = total

    paid = paid_amount if paid_amount is not None else purchase.paid_amount
    paid, due = _po_financials(purchase.total_amount, paid)
    purchase.paid_amount = paid
    purchase.due_amount = due

    if invoice_number is not None and invoice_number.strip() and invoice_number.strip() != purchase.invoice_number:
        purchase.invoice_number = _normalise_po_number(invoice_number, exclude_pk=purchase.pk)
    if date is not None:
        purchase.date = date
    if status is not None:
        purchase.status = status

    purchase.save()
    return purchase


@transaction.atomic
def delete_purchase(*, purchase, user):
    purchase = PurchaseOrder.objects.select_for_update().get(pk=purchase.pk)
    items = list(purchase.items.all())
    if items:
        stocks = _lock_stocks([item.stock_id for item in items])
        quantities = {stock_id: stock.quantity for stock_id, stock in stocks.items()}
        movements = []
        for item in items:
            stock_id = item.stock_id
            if quantities[stock_id] < item.quantity:
                raise BusinessError(
                    f'Cannot delete this purchase: "{item.name}" has only '
                    f"{quantities[stock_id]} in stock but {item.quantity} came in. "
                    "The stock may already be sold."
                )
            quantities[stock_id] -= item.quantity
            movements.append(
                _movement(
                    stock_id,
                    -item.quantity,
                    quantities[stock_id],
                    StockMovement.Kind.PURCHASE_DELETE,
                    purchase.invoice_number,
                    user,
                    f"Purchase deleted - removed {item.quantity} {item.unit}",
                )
            )
        _persist_quantities(stocks, quantities)
        StockMovement.objects.bulk_create(movements)

    number = purchase.invoice_number
    purchase.delete()
    return number
