"""Add employee status.

Revision ID: 20260428_0003
Revises: 20260427_0002
Create Date: 2026-04-28 01:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260428_0003"
down_revision: Union[str, Sequence[str], None] = "20260427_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("employee")}
    if "employment_status" not in columns:
        op.add_column("employee", sa.Column("employment_status", sa.String(), nullable=False, server_default="active"))
        op.create_index("ix_employee_employment_status", "employee", ["employment_status"])


def downgrade() -> None:
    op.drop_index("ix_employee_employment_status", table_name="employee")
    op.drop_column("employee", "employment_status")
