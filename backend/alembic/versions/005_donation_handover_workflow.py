"""add donation item handover workflow

Revision ID: 005_donation_handover_workflow
Revises: 004_user_org_images
Create Date: 2026-05-30
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "005_donation_handover_workflow"
down_revision: Union[str, None] = "004_user_org_images"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("campaign_items", sa.Column("accepted_by_user_id", UUID(as_uuid=True), nullable=True))
    op.add_column("campaign_items", sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("campaign_items", sa.Column("received_by_user_id", UUID(as_uuid=True), nullable=True))
    op.add_column("campaign_items", sa.Column("received_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("campaign_items", sa.Column("rejected_by_user_id", UUID(as_uuid=True), nullable=True))
    op.add_column("campaign_items", sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("campaign_items", sa.Column("rejection_reason", sa.String(length=500), nullable=True))
    op.add_column(
        "campaign_items",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_foreign_key(
        "campaign_items_accepted_by_user_id_fkey",
        "campaign_items",
        "users",
        ["accepted_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "campaign_items_received_by_user_id_fkey",
        "campaign_items",
        "users",
        ["received_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "campaign_items_rejected_by_user_id_fkey",
        "campaign_items",
        "users",
        ["rejected_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_unique_constraint("uq_campaign_items_item_id", "campaign_items", ["item_id"])

    # Historical approvals prove organization acceptance, not physical receipt.
    op.execute("UPDATE campaign_items SET status = 'handover' WHERE status = 'approved'")


def downgrade() -> None:
    op.execute(
        "UPDATE campaign_items SET status = 'approved' "
        "WHERE status IN ('awaiting_handover', 'handover', 'received')"
    )
    op.drop_constraint("uq_campaign_items_item_id", "campaign_items", type_="unique")
    op.drop_constraint("campaign_items_rejected_by_user_id_fkey", "campaign_items", type_="foreignkey")
    op.drop_constraint("campaign_items_received_by_user_id_fkey", "campaign_items", type_="foreignkey")
    op.drop_constraint("campaign_items_accepted_by_user_id_fkey", "campaign_items", type_="foreignkey")
    op.drop_column("campaign_items", "updated_at")
    op.drop_column("campaign_items", "rejection_reason")
    op.drop_column("campaign_items", "rejected_at")
    op.drop_column("campaign_items", "rejected_by_user_id")
    op.drop_column("campaign_items", "received_at")
    op.drop_column("campaign_items", "received_by_user_id")
    op.drop_column("campaign_items", "accepted_at")
    op.drop_column("campaign_items", "accepted_by_user_id")
