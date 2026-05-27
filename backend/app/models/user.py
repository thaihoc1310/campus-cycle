import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="member")  # admin, member
    user_type: Mapped[str] = mapped_column(String(50), nullable=True)  # student, teacher, staff
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")  # active, inactive, banned
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    items: Mapped[list["Item"]] = relationship("Item", back_populates="owner", lazy="select")
    org_admin_entries: Mapped[list["OrganizationAdmin"]] = relationship(
        "OrganizationAdmin", back_populates="user", lazy="select"
    )

    def __repr__(self):
        return f"<User {self.name} ({self.email})>"
