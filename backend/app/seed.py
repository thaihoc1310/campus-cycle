"""Seed a focused local demo dataset.

Run after migrations:
    PYTHONPATH=. venv/bin/python -m app.seed

The script intentionally creates no image records. Add uploads manually when
testing image flows.
"""
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func

from app.database import SessionLocal
from app.models.campaign import Campaign, CampaignItem
from app.models.category import Category
from app.models.item import Item
from app.models.organization import Organization, OrganizationAdmin
from app.models.transaction import Transaction
from app.models.user import User
from app.services.auth import hash_password

DEMO_PASSWORD = "demo123"
ADMIN_PASSWORD = "admin123"


def ago(*, days: int = 0, hours: int = 0, minutes: int = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days, hours=hours, minutes=minutes)


def future(*, days: int = 0) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


def money(value: str | Decimal) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"))


def seed() -> None:
    db = SessionLocal()
    try:
        if db.query(User).first():
            raise RuntimeError("Database already contains users. Reset the database before running the demo seed.")

        demo_password_hash = hash_password(DEMO_PASSWORD)
        users: dict[str, User] = {}

        def add_user(
            key: str,
            name: str,
            email: str,
            user_type: str,
            phone: str,
            *,
            role: str = "member",
            password_hash: str = demo_password_hash,
        ) -> User:
            user = User(
                name=name,
                email=email,
                password=password_hash,
                role=role,
                user_type=user_type,
                status="active",
                phone=phone,
            )
            users[key] = user
            db.add(user)
            return user

        add_user(
            "campus_admin",
            "System Admin",
            "admin@campus-cycle.com",
            "staff",
            "0900000000",
            role="admin",
            password_hash=hash_password(ADMIN_PASSWORD),
        )
        add_user("maya", "Maya Green", "maya.green@campus.edu", "student", "0901000001")
        add_user("noah", "Noah Park", "noah.park@campus.edu", "teacher", "0901000002")
        add_user("liam", "Liam Carter", "liam.carter@campus.edu", "student", "0901000003")
        add_user("alice", "Alice Nguyen", "alice.nguyen@campus.edu", "student", "0910000001")
        add_user("ben", "Ben Tran", "ben.tran@campus.edu", "student", "0910000002")
        add_user("chloe", "Chloe Pham", "chloe.pham@campus.edu", "student", "0910000003")
        add_user("daniel", "Daniel Lee", "daniel.lee@campus.edu", "teacher", "0910000004")
        add_user("ella", "Ella Brown", "ella.brown@campus.edu", "student", "0910000005")
        db.flush()

        categories: dict[str, Category] = {}
        category_specs = [
            ("books", "Books", "Textbooks, novels, and reference material"),
            ("electronics", "Electronics", "Devices, accessories, and small appliances"),
            ("clothing", "Clothing", "Wearable items in reusable condition"),
            ("furniture", "Furniture", "Dorm and study furniture"),
            ("sports", "Sports", "Sports and outdoor equipment"),
            ("stationery", "Stationery", "School and office supplies"),
            ("household", "Household", "Reusable daily essentials"),
            ("other", "Other", "Items outside the primary categories"),
        ]
        for key, name, description in category_specs:
            category = Category(name=name, description=description, is_active=True)
            categories[key] = category
            db.add(category)
        db.flush()

        organizations: dict[str, Organization] = {}

        def add_org(key: str, name: str, description: str, org_type: str, admin_keys: list[str]) -> Organization:
            organization = Organization(name=name, description=description, type=org_type)
            organizations[key] = organization
            db.add(organization)
            db.flush()
            for admin_key in admin_keys:
                db.add(OrganizationAdmin(user_id=users[admin_key].id, organization_id=organization.id))
            return organization

        add_org(
            "green_club",
            "Green Campus Club",
            "Student-led sustainability projects, reuse drives, and greener campus habits.",
            "club",
            ["maya", "noah"],
        )
        add_org(
            "student_union",
            "Student Support Union",
            "Peer support and practical assistance for students across campus.",
            "department",
            ["liam"],
        )
        db.flush()

        campaigns: dict[str, Campaign] = {}

        def add_campaign(
            key: str,
            organization_key: str,
            title: str,
            campaign_type: str,
            status: str,
            description: str,
            *,
            start_days_ago: int = 20,
            end_days_from_now: int = 45,
        ) -> Campaign:
            campaign = Campaign(
                title=title,
                description=(
                    f"{description} This campaign gives campus members a practical way to contribute, "
                    "follow visible progress, and understand how their support creates a measurable local impact."
                ),
                type=campaign_type,
                status=status,
                start_date=ago(days=start_days_ago),
                end_date=future(days=end_days_from_now),
                organization_id=organizations[organization_key].id,
                created_at=ago(days=start_days_ago + 4),
                updated_at=ago(days=max(0, start_days_ago - 2)),
            )
            campaigns[key] = campaign
            db.add(campaign)
            return campaign

        # Maya's organization deliberately covers every campaign-admin demo flow.
        add_campaign("dorm_drive", "green_club", "Green Dorm Donation Drive", "donation", "approved", "Give reusable dorm essentials a second life.", start_days_ago=35)
        add_campaign("garden", "green_club", "Community Garden Expansion", "fundraising", "approved", "Fund soil, seeds, tools, and accessible planting beds.", start_days_ago=50)
        add_campaign("ewaste", "green_club", "Responsible E-Waste Collection", "donation", "pending", "Collect small electronics for verified recycling.", start_days_ago=3)
        add_campaign("repair_lab", "green_club", "Community Repair Lab", "fundraising", "rejected", "Proposal retained to demonstrate rejected campaign handling.", start_days_ago=8)

        add_campaign("books", "student_union", "Books for Freshers", "donation", "approved", "Share useful introductory textbooks and study materials.", start_days_ago=30)
        add_campaign("relief", "student_union", "Emergency Student Support Fund", "fundraising", "approved", "Provide short-term support for students facing hardship.", start_days_ago=45)
        add_campaign("winter_share", "student_union", "Winter Clothing Share 2025", "donation", "completed", "Completed clothing collection retained for historical reporting.", start_days_ago=150, end_days_from_now=-45)
        db.flush()

        items: dict[str, Item] = {}

        def add_item(
            key: str,
            owner_key: str,
            category_key: str,
            title: str,
            item_type: str,
            status: str,
            description: str,
            *,
            price: str = "0",
            days_ago: int = 10,
        ) -> Item:
            item = Item(
                title=title,
                description=(
                    f"{description} The listing includes enough context for campus members to understand "
                    "the condition, intended use, and next handover step before they decide to proceed."
                ),
                price=money(price),
                type=item_type,
                status=status,
                category_id=categories[category_key].id,
                user_id=users[owner_key].id,
                created_at=ago(days=days_ago),
                updated_at=ago(days=max(0, days_ago - 1)),
            )
            items[key] = item
            db.add(item)
            return item

        # Sell item totals: approved=7, rejected=1, reserved=4, sold=10, pending=2.
        sale_specs = [
            ("maya_bike", "maya", "sports", "Campus Bicycle with Basket", "approved", "Serviced bicycle suitable for daily campus travel.", "92.00", 8),
            ("noah_calc", "noah", "electronics", "Scientific Calculator", "approved", "Reliable calculator for engineering and statistics classes.", "13.00", 7),
            ("liam_lamp", "liam", "electronics", "Adjustable LED Desk Lamp", "approved", "Study lamp with warm and cool light modes.", "18.00", 6),
            ("alice_guitar", "alice", "other", "Beginner Acoustic Guitar", "approved", "Entry-level guitar with carrying case.", "64.00", 11),
            ("ben_notebooks", "ben", "stationery", "Bundle of New Notebooks", "approved", "Five unused ruled notebooks.", "8.00", 4),
            ("chloe_cooker", "chloe", "household", "Small Rice Cooker", "approved", "Compact cooker suitable for one or two people.", "22.00", 9),
            ("daniel_yoga", "daniel", "sports", "Yoga Mat and Strap", "approved", "Lightly used mat with carrying strap.", "10.00", 5),
            ("maya_pending_chair", "maya", "furniture", "Compact Dorm Study Chair", "pending", "Small study chair submitted for marketplace review.", "25.00", 1),
            ("liam_pending_blender", "liam", "household", "Personal Smoothie Blender", "pending", "Compact blender awaiting campus review.", "17.00", 1),
            ("maya_rejected_headphones", "maya", "electronics", "Older Wired Headphones", "rejected", "Older headphones retained for rejected-item demo.", "9.00", 14),
            ("ella_reserved_monitor", "ella", "electronics", "Twenty-Four Inch Monitor", "reserved", "Full HD monitor with HDMI cable.", "72.00", 14),
            ("noah_reserved_kettle", "noah", "household", "Electric Kettle", "reserved", "Clean one-liter kettle in working condition.", "15.00", 13),
            ("alice_reserved_backpack", "alice", "other", "Laptop Backpack", "reserved", "Water-resistant backpack with padded sleeve.", "20.00", 10),
            ("chloe_reserved_rackets", "chloe", "sports", "Badminton Racket Pair", "reserved", "Two rackets and a few shuttlecocks.", "19.00", 12),
            ("maya_sold_table", "maya", "furniture", "Foldable Study Table", "sold", "Space-saving table for a dorm room.", "29.00", 50),
            ("maya_sold_keyboard", "maya", "electronics", "Mechanical Keyboard", "sold", "Compact keyboard with brown switches.", "34.00", 42),
            ("maya_sold_shelf", "maya", "furniture", "Three-Tier Bookshelf", "sold", "Stable bookshelf suitable for textbooks.", "28.00", 35),
            ("noah_sold_dictionary", "noah", "books", "English Reference Dictionary", "sold", "Hardcover dictionary in good condition.", "7.00", 31),
            ("liam_sold_rack", "liam", "furniture", "Standing Coat Rack", "sold", "Simple metal coat rack for a dorm entryway.", "14.00", 27),
            ("alice_sold_headphones", "alice", "electronics", "Over-Ear Headphones", "sold", "Comfortable wired headphones.", "16.00", 23),
            ("ben_sold_chair", "ben", "furniture", "Desk Chair with Cushion", "sold", "Clean chair with a removable cushion.", "24.00", 20),
            ("chloe_sold_scooter", "chloe", "sports", "Foldable Kick Scooter", "sold", "Compact scooter with working brakes.", "36.00", 18),
            ("daniel_sold_coffee", "daniel", "household", "Pour-Over Coffee Set", "sold", "Reusable coffee dripper and serving pot.", "12.00", 16),
            ("ella_sold_rack", "ella", "furniture", "Bedside Storage Rack", "sold", "Small storage rack for dorm essentials.", "21.00", 15),
        ]
        for key, owner, category, title, status, description, price, days_ago in sale_specs:
            add_item(key, owner, category, title, "sell", status, description, price=price, days_ago=days_ago)
        db.flush()

        def add_campaign_item(
            key: str,
            donor_key: str,
            category_key: str,
            title: str,
            item_status: str,
            campaign_key: str,
            campaign_item_status: str,
            description: str,
            *,
            days_ago: int,
            org_admin_key: str | None = None,
            rejection_reason: str | None = None,
        ) -> CampaignItem:
            item = add_item(key, donor_key, category_key, title, "donate", item_status, description, days_ago=days_ago)
            db.flush()
            reviewed_at = ago(days=max(0, days_ago - 2))
            campaign_item = CampaignItem(
                item_id=item.id,
                campaign_id=campaigns[campaign_key].id,
                status=campaign_item_status,
                created_at=ago(days=days_ago),
                updated_at=reviewed_at,
            )
            if campaign_item_status in {"handover", "received"} and org_admin_key:
                campaign_item.accepted_by_user_id = users[org_admin_key].id
                campaign_item.accepted_at = reviewed_at
            if campaign_item_status == "received" and org_admin_key:
                campaign_item.received_by_user_id = users[org_admin_key].id
                campaign_item.received_at = ago(days=max(0, days_ago - 4))
            if campaign_item_status == "rejected" and org_admin_key:
                campaign_item.rejected_by_user_id = users[org_admin_key].id
                campaign_item.rejected_at = reviewed_at
                campaign_item.rejection_reason = rejection_reason
            db.add(campaign_item)
            return campaign_item

        # Donate item totals: approved=8, rejected=1, donated=15, pending=1.
        # The main dorm campaign includes every review and fulfillment state.
        donation_specs = [
            ("maya_donate_blanket", "maya", "household", "Clean Single Bed Blanket", "donated", "dorm_drive", "received", "Freshly washed blanket.", 29, "maya", None),
            ("maya_donate_fan", "maya", "electronics", "Compact Desk Fan", "donated", "dorm_drive", "received", "Quiet desk fan for a dorm room.", 27, "noah", None),
            ("maya_donate_books", "maya", "books", "Study Skills Book Bundle", "donated", "dorm_drive", "received", "Three useful study skills books.", 25, "maya", None),
            ("noah_donate_storage", "noah", "household", "Under-Bed Storage Boxes", "donated", "dorm_drive", "received", "Two reusable storage boxes.", 24, "maya", None),
            ("liam_donate_coat", "liam", "clothing", "Warm Winter Coat", "donated", "dorm_drive", "received", "Clean coat with intact zipper.", 22, "noah", None),
            ("alice_donate_mugs", "alice", "household", "Ceramic Mug Set", "donated", "dorm_drive", "received", "Set of four clean ceramic mugs.", 20, "maya", None),
            ("ben_donate_lamp", "ben", "electronics", "Dorm Reading Lamp", "donated", "dorm_drive", "received", "Working lamp for a study corner.", 18, "noah", None),
            ("chloe_donate_jacket", "chloe", "clothing", "Lightweight Rain Jacket", "donated", "dorm_drive", "received", "Reusable jacket for rainy days.", 16, "maya", None),
            ("daniel_donate_pot", "daniel", "household", "Small Cooking Pot", "donated", "dorm_drive", "received", "Clean stainless-steel cooking pot.", 14, "noah", None),
            ("ella_donate_organizer", "ella", "stationery", "Desk Organizer", "donated", "dorm_drive", "received", "Desk organizer with several compartments.", 12, "maya", None),
            ("noah_donate_bedding", "noah", "household", "Single Bedding Set", "approved", "dorm_drive", "pending", "Freshly washed bedding ready for org review.", 7, None, None),
            ("alice_donate_bowls", "alice", "household", "Reusable Bowl Set", "approved", "dorm_drive", "pending", "Four reusable bowls ready for review.", 6, None, None),
            ("ben_donate_towels", "ben", "household", "Clean Towel Pair", "approved", "dorm_drive", "pending", "Two clean towels ready for review.", 5, None, None),
            ("maya_donate_boxes", "maya", "household", "Stackable Storage Boxes", "approved", "dorm_drive", "handover", "Accepted boxes awaiting physical handover.", 9, "noah", None),
            ("chloe_donate_kettle", "chloe", "household", "Spare Electric Kettle", "approved", "dorm_drive", "handover", "Accepted kettle awaiting physical handover.", 8, "maya", None),
            ("ella_donate_scarf", "ella", "clothing", "Knitted Scarf", "approved", "dorm_drive", "handover", "Accepted scarf awaiting physical handover.", 7, "noah", None),
            ("liam_donate_cushions", "liam", "household", "Decorative Cushion Pair", "approved", "dorm_drive", "rejected", "Decorative cushions submitted to the campaign.", 11, "maya", "Campaign currently prioritizes essential dorm items."),
            ("daniel_donate_decor", "daniel", "other", "Dorm Wall Decoration", "approved", "dorm_drive", "rejected", "Decorative item submitted to the campaign.", 10, "noah", "Decorative items are outside the current collection scope."),
            ("ella_donate_damaged_lamp", "ella", "electronics", "Damaged Reading Lamp", "rejected", "dorm_drive", "pending", "Lamp retained to demonstrate campus rejection.", 4, None, None),
            ("noah_donate_mat", "noah", "household", "Dorm Floor Mat", "pending", "dorm_drive", "pending", "Mat awaiting campus admin review.", 1, None, None),
            ("alice_donate_algebra", "alice", "books", "Introductory Algebra Textbook", "donated", "books", "received", "Textbook with a few useful annotations.", 21, "liam", None),
            ("ben_donate_programming", "ben", "books", "Programming Fundamentals Book", "donated", "books", "received", "Beginner programming textbook.", 19, "liam", None),
            ("chloe_donate_history", "chloe", "books", "Modern History Reader", "donated", "books", "received", "Course reader in good condition.", 17, "liam", None),
            ("daniel_donate_jacket", "daniel", "clothing", "Warm Jacket Size L", "donated", "winter_share", "received", "Warm jacket from the completed campaign.", 120, "liam", None),
            ("ella_donate_gloves", "ella", "clothing", "Glove and Beanie Set", "donated", "winter_share", "received", "Matching warm glove and beanie set.", 118, "liam", None),
        ]
        for spec in donation_specs:
            add_campaign_item(*spec[:8], days_ago=spec[8], org_admin_key=spec[9], rejection_reason=spec[10])
        db.flush()

        def add_transaction(
            transaction_type: str,
            from_user_key: str,
            status: str,
            amount: str | Decimal,
            *,
            item_key: str | None = None,
            to_user_key: str | None = None,
            campaign_key: str | None = None,
            platform_fee: str | Decimal = "0",
            days_ago: int = 0,
            hours_ago: int = 0,
            minutes_ago: int = 0,
        ) -> Transaction:
            created = ago(days=days_ago, hours=hours_ago, minutes=minutes_ago)
            transaction = Transaction(
                transaction_type=transaction_type,
                from_user_id=users[from_user_key].id,
                to_user_id=users[to_user_key].id if to_user_key else None,
                item_id=items[item_key].id if item_key else None,
                campaign_id=campaigns[campaign_key].id if campaign_key else None,
                amount=money(amount),
                platform_fee=money(platform_fee),
                status=status,
                created_at=created,
                updated_at=created,
            )
            db.add(transaction)
            return transaction

        # Sale transactions align with sold/reserved item states and give every
        # active demo user purchase history.
        sale_transactions = [
            ("noah", "maya_sold_table", "maya", "completed", "31.90", "5.80", 45),
            ("liam", "maya_sold_keyboard", "maya", "completed", "37.40", "6.80", 39),
            ("alice", "maya_sold_shelf", "maya", "completed", "30.80", "5.60", 33),
            ("ben", "noah_sold_dictionary", "noah", "completed", "7.70", "1.40", 29),
            ("chloe", "liam_sold_rack", "liam", "completed", "15.40", "2.80", 25),
            ("daniel", "alice_sold_headphones", "alice", "completed", "17.60", "3.20", 21),
            ("ella", "ben_sold_chair", "ben", "completed", "26.40", "4.80", 18),
            ("maya", "chloe_sold_scooter", "chloe", "completed", "39.60", "7.20", 16),
            ("noah", "daniel_sold_coffee", "daniel", "completed", "13.20", "2.40", 14),
            ("liam", "ella_sold_rack", "ella", "completed", "23.10", "4.20", 13),
            ("maya", "ella_reserved_monitor", "ella", "paid", "79.20", "14.40", 2),
            ("alice", "noah_reserved_kettle", "noah", "paid", "16.50", "3.00", 1),
            ("ben", "alice_reserved_backpack", "alice", "paid", "22.00", "4.00", 1),
            ("daniel", "chloe_reserved_rackets", "chloe", "paid", "20.90", "3.80", 0),
        ]
        for buyer, item_key, seller, status, amount, fee, days_ago in sale_transactions:
            add_transaction("sale", buyer, status, amount, item_key=item_key, to_user_key=seller, platform_fee=fee, days_ago=days_ago)
        add_transaction("sale", "ella", "pending", "101.20", item_key="maya_bike", to_user_key="maya", platform_fee="18.40", minutes_ago=0)
        add_transaction("sale", "chloe", "cancelled", "14.30", item_key="noah_calc", to_user_key="noah", platform_fee="2.60", days_ago=3)
        add_transaction("sale", "maya", "refunded", "19.80", item_key="liam_lamp", to_user_key="liam", platform_fee="3.60", days_ago=4)

        # Both approved fundraising campaigns get enough history for charts and
        # leaderboards. Maya contributes repeatedly for the main demo persona.
        fundraising_transactions = [
            ("maya", "garden", "completed", "35.00", 46),
            ("maya", "garden", "completed", "60.00", 31),
            ("maya", "garden", "completed", "25.00", 12),
            ("noah", "garden", "completed", "45.00", 42),
            ("noah", "garden", "completed", "18.00", 19),
            ("liam", "garden", "completed", "55.00", 38),
            ("alice", "garden", "completed", "20.00", 34),
            ("alice", "garden", "completed", "30.00", 14),
            ("ben", "garden", "completed", "15.00", 29),
            ("chloe", "garden", "completed", "40.00", 24),
            ("daniel", "garden", "completed", "75.00", 17),
            ("ella", "garden", "completed", "22.00", 9),
            ("ben", "garden", "pending", "12.00", 0),
            ("ella", "garden", "cancelled", "28.00", 7),
            ("maya", "relief", "completed", "40.00", 40),
            ("noah", "relief", "completed", "25.00", 36),
            ("liam", "relief", "completed", "80.00", 33),
            ("liam", "relief", "completed", "35.00", 15),
            ("alice", "relief", "completed", "18.00", 28),
            ("ben", "relief", "completed", "32.00", 23),
            ("chloe", "relief", "completed", "45.00", 20),
            ("daniel", "relief", "completed", "100.00", 11),
            ("ella", "relief", "completed", "26.00", 6),
            ("chloe", "relief", "pending", "16.00", 0),
            ("noah", "relief", "cancelled", "30.00", 5),
        ]
        for donor, campaign_key, status, amount, days_ago in fundraising_transactions:
            add_transaction("campaign_donation", donor, status, amount, campaign_key=campaign_key, days_ago=days_ago)

        db.commit()
        validate_seed(db, users)

        print("Seed completed.")
        print(f"  Users:          {db.query(User).count()} ({len(active_demo_users(users))} active demo users + campus admin)")
        print(f"  Categories:     {db.query(Category).count()}")
        print(f"  Organizations:  {db.query(Organization).count()}")
        print(f"  Campaigns:      {db.query(Campaign).count()}")
        print(f"  Items:          {db.query(Item).count()}")
        print(f"  Campaign items: {db.query(CampaignItem).count()}")
        print(f"  Transactions:   {db.query(Transaction).count()}")
        print("")
        print(f"Campus admin: admin@campus-cycle.com / {ADMIN_PASSWORD}")
        print(f"Demo persona: maya.green@campus.edu / {DEMO_PASSWORD}")
        print("Other org admins: noah.park@campus.edu, liam.carter@campus.edu / demo123")
        print("Other demo users: alice.nguyen@campus.edu, ben.tran@campus.edu, chloe.pham@campus.edu, daniel.lee@campus.edu, ella.brown@campus.edu / demo123")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def active_demo_users(users: dict[str, User]) -> list[User]:
    return [user for key, user in users.items() if key != "campus_admin"]


def validate_seed(db, users: dict[str, User]) -> None:
    expected_item_statuses = {
        "approved": 15,
        "rejected": 2,
        "reserved": 4,
        "sold": 10,
        "donated": 15,
        "pending": 3,
    }
    actual_item_statuses = dict(db.query(Item.status, func.count(Item.id)).group_by(Item.status).all())
    assert actual_item_statuses == expected_item_statuses, actual_item_statuses

    expected_campaign_statuses = {"approved": 4, "completed": 1, "pending": 1, "rejected": 1}
    actual_campaign_statuses = dict(db.query(Campaign.status, func.count(Campaign.id)).group_by(Campaign.status).all())
    assert actual_campaign_statuses == expected_campaign_statuses, actual_campaign_statuses

    assert db.query(Organization).count() == 2
    assert db.query(OrganizationAdmin).count() == 3
    assert db.query(Campaign).count() == 7

    for user in active_demo_users(users):
        assert db.query(Item).filter(Item.user_id == user.id, Item.type == "sell").count() > 0, user.email
        assert db.query(Item).filter(Item.user_id == user.id, Item.type == "donate").count() > 0, user.email
        assert db.query(Transaction).filter(Transaction.from_user_id == user.id, Transaction.transaction_type == "sale").count() > 0, user.email
        assert db.query(Transaction).filter(Transaction.from_user_id == user.id, Transaction.transaction_type == "campaign_donation").count() > 0, user.email

    maya = users["maya"]
    assert db.query(Item).filter(Item.user_id == maya.id, Item.status == "sold").count() == 3
    assert db.query(Item).filter(Item.user_id == maya.id, Item.status == "pending").count() == 1
    assert db.query(Item).filter(Item.user_id == maya.id, Item.status == "rejected").count() == 1
    assert db.query(Item).filter(Item.user_id == maya.id, Item.status == "donated").count() == 3
    assert db.query(Transaction).filter(
        Transaction.from_user_id == maya.id,
        Transaction.transaction_type == "campaign_donation",
        Transaction.status == "completed",
    ).count() >= 3


if __name__ == "__main__":
    seed()
