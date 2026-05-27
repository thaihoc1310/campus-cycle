import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, DateTime, ForeignKey, Numeric, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="sell")  # sell, donate
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending"
    )  # pending, approved, rejected, sold, donated
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="items", lazy="joined")
    category: Mapped["Category | None"] = relationship("Category", back_populates="items", lazy="joined")
    images: Mapped[list["ItemImage"]] = relationship(
        "ItemImage", back_populates="item", lazy="select", cascade="all, delete-orphan"
    )
    campaign_items: Mapped[list["CampaignItem"]] = relationship(
        "CampaignItem", back_populates="item", lazy="select"
    )

    def __repr__(self):
        return f"<Item {self.title}>"


class ItemImage(Base):
    __tablename__ = "item_images"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("items.id", ondelete="CASCADE"), nullable=False
    )
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    is_main: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    item: Mapped["Item"] = relationship("Item", back_populates="images", lazy="select")

    def __repr__(self):
        return f"<ItemImage {self.image_path}>"
