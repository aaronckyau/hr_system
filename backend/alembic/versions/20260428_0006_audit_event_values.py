"""Add missing audit event enum values.

Revision ID: 20260428_0006
Revises: 20260428_0005
Create Date: 2026-04-28 23:40:00
"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260428_0006"
down_revision: Union[str, Sequence[str], None] = "20260428_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


AUDIT_EVENTS = [
    "employee_created",
    "employee_updated",
    "employee_password_reset",
    "leave_config_updated",
    "public_holiday_saved",
    "setting_option_saved",
    "payroll_config_updated",
    "earning_created",
    "deduction_created",
    "payroll_generated",
    "final_pay_created",
    "sensitive_employee_viewed",
    "payroll_viewed",
    "report_downloaded",
    "payslip_downloaded",
]


def upgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        for value in AUDIT_EVENTS:
            op.execute(f"ALTER TYPE auditevent ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # PostgreSQL does not support dropping enum values safely without recreating the type.
    pass
