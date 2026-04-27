"""Baseline schema for HR MVP.

Revision ID: 20260427_0001
Revises:
Create Date: 2026-04-27 23:10:00
"""

from typing import Sequence, Union

from alembic import op
from sqlmodel import SQLModel

from app import models  # noqa: F401


revision: str = "20260427_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    SQLModel.metadata.create_all(op.get_bind())


def downgrade() -> None:
    SQLModel.metadata.drop_all(op.get_bind())
