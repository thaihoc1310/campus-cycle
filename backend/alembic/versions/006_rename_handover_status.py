"""rename donation handover status

Revision ID: 006_rename_handover_status
Revises: 005_donation_handover_workflow
Create Date: 2026-05-30
"""
from typing import Sequence, Union

from alembic import op

revision: str = "006_rename_handover_status"
down_revision: Union[str, None] = "005_donation_handover_workflow"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE campaign_items SET status = 'handover' WHERE status = 'awaiting_handover'")


def downgrade() -> None:
    op.execute("UPDATE campaign_items SET status = 'awaiting_handover' WHERE status = 'handover'")
