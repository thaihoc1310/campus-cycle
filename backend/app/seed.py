"""Seed initial admin user on first startup."""
from app.database import SessionLocal
from app.models.user import User
from app.services.auth import hash_password


def seed():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@campus-cycle.com").first()
        if not admin:
            admin = User(
                name="System Admin",
                email="admin@campus-cycle.com",
                password=hash_password("admin123"),
                role="admin",
                user_type="staff",
                status="active",
            )
            db.add(admin)
            db.commit()
            print("✅ Seeded admin user: admin@campus-cycle.com / admin123")
        else:
            print("ℹ️  Admin user already exists, skipping seed.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
