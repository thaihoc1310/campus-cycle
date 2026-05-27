import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, DateTime, ForeignKey, Numeric, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="fundraising")  # fundraising, donation
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="draft"
    )  # draft, active, completed, cancelled
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    organization: Mapped["Organization | None"] = relationship(
        "Organization", back_populates="campaigns", lazy="joined"
    )
    images: Mapped[list["CampaignImage"]] = relationship(
        "CampaignImage", back_populates="campaign", lazy="select", cascade="all, delete-orphan"
    )
    campaign_items: Mapped[list["CampaignItem"]] = relationship(
        "CampaignItem", back_populates="campaign", lazy="select", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Campaign {self.title}>"


class CampaignImage(Base):
    __tablename__ = "campaign_images"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False
    )
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    is_main: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="images", lazy="select")

    def __repr__(self):
        return f"<CampaignImage {self.image_path}>"


class CampaignItem(Base):
    __tablename__ = "campaign_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("items.id", ondelete="CASCADE"), nullable=False
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False
    )
    contribution_type: Mapped[str] = mapped_column(String(50), nullable=False)  # donate, partial_sale
    contribution_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="pending"
    )  # pending, approved, rejected
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    item: Mapped["Item"] = relationship("Item", back_populates="campaign_items", lazy="joined")
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="campaign_items", lazy="select")

    def __repr__(self):
        return f"<CampaignItem item={self.item_id} campaign={self.campaign_id}>"
