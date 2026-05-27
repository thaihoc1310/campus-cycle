"""generalize transaction parties and clean unused fields

Revision ID: 002_transaction_party_cleanup
Revises: 001_initial
Create Date: 2026-05-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_transaction_party_cleanup"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("transaction_type", sa.String(length=50), nullable=False, server_default="sale"),
    )
    op.drop_constraint("transactions_buyer_id_fkey", "transactions", type_="foreignkey")
    op.drop_constraint("transactions_seller_id_fkey", "transactions", type_="foreignkey")
    op.alter_column("transactions", "buyer_id", new_column_name="from_user_id")
    op.alter_column("transactions", "seller_id", new_column_name="to_user_id", nullable=True)
    op.create_foreign_key(
        "transactions_from_user_id_fkey",
        "transactions",
        "users",
        ["from_user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "transactions_to_user_id_fkey",
        "transactions",
        "users",
        ["to_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.drop_column("transactions", "fund_amount")

    op.drop_column("campaign_items", "contribution_value")
    op.drop_column("campaign_items", "contribution_type")


def downgrade() -> None:
    op.add_column(
        "campaign_items",
        sa.Column("contribution_type", sa.String(length=50), nullable=False, server_default="donate"),
    )
    op.add_column(
        "campaign_items",
        sa.Column("contribution_value", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )

    op.add_column(
        "transactions",
        sa.Column("fund_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )
    op.execute("UPDATE transactions SET to_user_id = from_user_id WHERE to_user_id IS NULL")
    op.drop_constraint("transactions_from_user_id_fkey", "transactions", type_="foreignkey")
    op.drop_constraint("transactions_to_user_id_fkey", "transactions", type_="foreignkey")
    op.alter_column("transactions", "to_user_id", new_column_name="seller_id", nullable=False)
    op.alter_column("transactions", "from_user_id", new_column_name="buyer_id")
    op.create_foreign_key(
        "transactions_buyer_id_fkey",
        "transactions",
        "users",
        ["buyer_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "transactions_seller_id_fkey",
        "transactions",
        "users",
        ["seller_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_column("transactions", "transaction_type")
