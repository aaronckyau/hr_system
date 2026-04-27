"""Add manager assignment and sensitive audit events.

Revision ID: 20260427_0002
Revises: 20260427_0001
Create Date: 2026-04-27 23:45:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260427_0002"
down_revision: Union[str, Sequence[str], None] = "20260427_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("employee")}
    if "manager_user_id" not in columns:
        op.add_column("employee", sa.Column("manager_user_id", sa.Integer(), nullable=True))

    indexes = {index["name"] for index in inspector.get_indexes("employee")}
    if "ix_employee_manager_user_id" not in indexes:
        op.create_index("ix_employee_manager_user_id", "employee", ["manager_user_id"])

    if bind.dialect.name != "sqlite":
        foreign_keys = {fk["name"] for fk in inspector.get_foreign_keys("employee")}
        if "fk_employee_manager_user_id_user" not in foreign_keys:
            op.create_foreign_key(
                "fk_employee_manager_user_id_user",
                "employee",
                "user",
                ["manager_user_id"],
                ["id"],
            )


def downgrade() -> None:
    if op.get_bind().dialect.name != "sqlite":
        op.drop_constraint("fk_employee_manager_user_id_user", "employee", type_="foreignkey")
    op.drop_index("ix_employee_manager_user_id", table_name="employee")
    op.drop_column("employee", "manager_user_id")
