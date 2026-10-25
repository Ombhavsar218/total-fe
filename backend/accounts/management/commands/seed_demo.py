"""Idempotent seed data for TotalStock.

Usage:
    python manage.py seed_demo
    python manage.py seed_demo --no-demo     # users + business profile only
"""
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Role, User
from inventory.models import BusinessProfile, Shop, Stock
from inventory.services import create_bill, create_purchase

DEMO_USERS = [
    ("superadmin@example.com", "Super Admin", Role.SUPERADMIN),
    ("owner@example.com", "Admin Owner", Role.OWNER),
    ("marketing@example.com", "Marketing User", Role.MARKETING),
    ("marketing1@example.com", "Marketing User 1", Role.MARKETING),
    ("marketing2@example.com", "Marketing User 2", Role.MARKETING),
    ("marketing3@example.com", "Marketing User 3", Role.MARKETING),
    ("marketing4@example.com", "Marketing User 4", Role.MARKETING),
    ("marketing5@example.com", "Marketing User 5", Role.MARKETING),
    ("api@example.com", "API Integration", Role.API),
]

SHOPS = [
    ("Sharma General Store", "12 Market Road, Nagpur, Maharashtra 440001", "27ABCDE1234F1Z5", "12345678901234", "9876543210", "sharma@example.com", "27"),
    ("Patel Mart", "45 Ring Road, Surat, Gujarat 395002", "24ABCDE1234F1Z5", "22345678901234", "9825012345", "patel@example.com", "24"),
    ("Krishna Supermarket", "8 Station Street, Pune, Maharashtra 411001", "27PQRSX1234F1Z5", "32345678901234", "9822012345", "krishna@example.com", "27"),
    ("Gupta Kirana", "102 Civil Lines, Indore, Madhya Pradesh 452001", "23ABCDE1234F1Z5", "42345678901234", "9826012345", "gupta@example.com", "23"),
    ("Royal Traders", "77 MG Road, Bengaluru, Karnataka 560001", "29ABCDE1234F1Z5", "52345678901234", "9845012345", "royal@example.com", "29"),
    ("New Age Distributors", "5 Industrial Estate, Nashik, Maharashtra 422007", "27LMNOP1234F1Z5", "", "9823012345", "newage@example.com", "27"),
]

STOCKS = [
    ("Basmati Rice 25 kg", "RICE-25", 480, "pcs", "1850.00", "2100.00", "1006", "5", 20, "Premium aged basmati rice bag"),
    ("Sunflower Oil 15 L", "OIL-15", 240, "liters", "1720.00", "1990.00", "1512", "5", 15, "Refined sunflower oil tin"),
    ("Sugar 50 kg", "SUGAR-50", 320, "kg", "2250.00", "2600.00", "1701", "5", 20, "Fine grain white sugar"),
    ("Toor Dal 30 kg", "DAL-30", 180, "kg", "3150.00", "3550.00", "0713", "5", 10, "Premium toor dal"),
    ("Wheat Flour 50 kg", "ATTA-50", 260, "pcs", "1450.00", "1700.00", "1101", "0", 15, "Chakki fresh atta"),
    ("Tea Powder 1 kg", "TEA-1", 500, "pcs", "310.00", "380.00", "0902", "5", 30, "Assam CTC tea"),
    ("Detergent Powder 5 kg", "DET-5", 150, "pcs", "420.00", "520.00", "3402", "18", 25, "Lemon fresh detergent"),
    ("Milk Powder 1 kg", "MILK-1", 400, "packets", "280.00", "330.00", "0402", "5", 40, "Full cream milk powder"),
    ("Iodised Salt 1 kg", "SALT-1", 600, "packets", "18.00", "25.00", "2501", "0", 50, "Iodised table salt"),
    ("Ghee 1 L", "GHEE-1", 220, "liters", "540.00", "640.00", "0405", "12", 20, "Pure cow ghee"),
    ("Biscuits Family Pack", "BISC-FAM", 350, "boxes", "95.00", "120.00", "1905", "18", 35, "Assorted cream biscuits"),
    ("Bath Soap 4-pack", "SOAP-4", 280, "boxes", "160.00", "199.00", "3401", "18", 30, "Rose fragrance bathing soap"),
]


class Command(BaseCommand):
    help = "Create demo users, business profile and (optionally) demo business data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-demo",
            action="store_true",
            help="Only create users and the default business profile.",
        )

    def handle(self, *args, **options):
        created_users = []
        for email, full_name, role in DEMO_USERS:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"full_name": full_name, "role": role, "is_active": True},
            )
            if created:
                user.set_password("password123")
                user.save()
                created_users.append(email)

        profile = BusinessProfile.objects.first()
        if profile is None:
            profile = BusinessProfile.objects.create(
                name="TotalStock Distributors",
                address="Plot 4, Industrial Area, Nagpur, Maharashtra 440016",
                phone="9876543210",
                email="billing@totalstock.example",
                state_code="27",
                gst_no="27ABCDE1234F1Z5",
                fssai_no="12345678901234",
                bank_name="HDFC Bank",
                bank_account_no="1234567890",
                bank_branch="Nagpur Main",
                bank_ifsc="HDFC0000123",
            )
            self.stdout.write(self.style.SUCCESS("Created business profile."))

        self.stdout.write(
            self.style.SUCCESS(
                f"Users ready ({len(created_users)} created). Password for every demo user: password123"
            )
        )

        if options["no_demo"] or Shop.objects.exists():
            self.stdout.write("Demo business data skipped (already present or --no-demo).")
            return

        owner = User.objects.get(email="owner@example.com")
        marketers = list(User.objects.filter(role=Role.MARKETING).order_by("id"))

        shops = [
            Shop.objects.create(
                name=name,
                address=address,
                gst_no=gst,
                fssai_no=fssai,
                phone=phone,
                email=email,
                state_code=state,
                owner=owner,
            )
            for name, address, gst, fssai, phone, email, state in SHOPS
        ]

        stocks = [
            Stock.objects.create(
                name=name,
                sku=sku,
                quantity=quantity,
                unit=unit,
                price=Decimal(price),
                mrp=Decimal(mrp),
                hsn_code=hsn,
                gst_rate=Decimal(gst),
                min_stock=min_stock,
                description=description,
                owner=owner,
            )
            for name, sku, quantity, unit, price, mrp, hsn, gst, min_stock, description in STOCKS
        ]

        rng = random.Random(42)
        today = timezone.localdate()
        bill_total = 0
        for days_ago in range(14, -1, -1):
            bill_date = today - timedelta(days=days_ago)
            for _ in range(rng.randint(1, 4)):
                shop = rng.choice(shops)
                lines = []
                for stock in rng.sample(stocks, rng.randint(1, 3)):
                    unit_price = stock.price
                    lines.append(
                        {
                            "stock_id": stock.id,
                            "quantity": rng.randint(1, 4),
                            "unit": stock.unit,
                            "price": unit_price,
                        }
                    )
                user = rng.choice(marketers) if marketers else owner
                create_bill(shop=shop, date=bill_date, items=lines, user=user)
                bill_total += 1

        for index, (stock, qty, paid_ratio) in enumerate(
            [(stocks[0], 20, 0.5), (stocks[3], 15, 1.0), (stocks[6], 30, 0.0)]
        ):
            create_purchase(
                date=today - timedelta(days=index + 1),
                invoice_number=f"SUP-{1000 + index}",
                paid_amount=(
                    Decimal(stock.price) * qty * Decimal(str(paid_ratio))
                ).quantize(Decimal("0.01")),
                items=[
                    {
                        "stock_id": stock.id,
                        "quantity": qty,
                        "unit": stock.unit,
                        "price": stock.price,
                    }
                ],
                user=owner,
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo data created: {len(shops)} shops, {len(stocks)} stock items, "
                f"{bill_total} bills, 3 purchase orders."
            )
        )
        self.stdout.write(
            "Login with owner@example.com / password123 or marketing@example.com / password123."
        )
