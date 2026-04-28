"""Add manager to user role enum.

Revision ID: 20260428_0005
Revises: 20260428_0004
Create Date: 2026-04-28 23:30:00
"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260428_0005"
down_revision: Union[str, Sequence[str], None] = "20260428_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'manager'")


def downgrade() -> None:
    # PostgreSQL does not support dropping enum values safely without recreating the type.
    pass
