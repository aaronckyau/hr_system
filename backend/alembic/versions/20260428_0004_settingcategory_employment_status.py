"""Add employment_status to setting category enum.

Revision ID: 20260428_0004
Revises: 20260428_0003
Create Date: 2026-04-28 01:35:00
"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260428_0004"
down_revision: Union[str, Sequence[str], None] = "20260428_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TYPE settingcategory ADD VALUE IF NOT EXISTS 'employment_status'")


def downgrade() -> None:
    # PostgreSQL does not support dropping enum values safely without recreating the type.
    pass
