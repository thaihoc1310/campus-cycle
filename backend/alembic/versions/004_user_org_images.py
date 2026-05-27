"""add user avatar and organization image

Revision ID: 004_user_org_images
Revises: 003_user_profile_fields
Create Date: 2026-05-27
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004_user_org_images"
down_revision: Union[str, None] = "003_user_profile_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(length=500), nullable=True))
    op.add_column("organizations", sa.Column("image_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "image_url")
    op.drop_column("users", "avatar_url")

