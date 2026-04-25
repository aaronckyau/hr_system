import sqlite3
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

from app.core.config import DATABASE_URL


engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})


def _sqlite_db_path() -> Path:
    return Path(DATABASE_URL.replace("sqlite:///", ""))


def _ensure_column(cursor: sqlite3.Cursor, table: str, column: str, ddl: str) -> None:
    existing_columns = {row[1] for row in cursor.execute(f"PRAGMA table_info({table})")}
    if column not in existing_columns:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    if DATABASE_URL.startswith("sqlite:///"):
        connection = sqlite3.connect(_sqlite_db_path())
        cursor = connection.cursor()
        _ensure_column(cursor, "payrollrecord", "gross_income", "gross_income REAL NOT NULL DEFAULT 0")
        _ensure_column(cursor, "payrollrecord", "taxable_income", "taxable_income REAL NOT NULL DEFAULT 0")
        _ensure_column(cursor, "payrollrecord", "non_taxable_income", "non_taxable_income REAL NOT NULL DEFAULT 0")
        _ensure_column(cursor, "payrollconfig", "mpf_rate", "mpf_rate REAL NOT NULL DEFAULT 0.05")
        _ensure_column(cursor, "payrollconfig", "mpf_cap", "mpf_cap REAL NOT NULL DEFAULT 1500")
        _ensure_column(cursor, "payrollconfig", "min_relevant_income", "min_relevant_income REAL NOT NULL DEFAULT 7100")
        _ensure_column(cursor, "payrollconfig", "max_relevant_income", "max_relevant_income REAL NOT NULL DEFAULT 30000")
        _ensure_column(cursor, "payrollconfig", "new_employee_mpf_exempt_days", "new_employee_mpf_exempt_days INTEGER NOT NULL DEFAULT 30")
        _ensure_column(cursor, "leaverequest", "calendar_days", "calendar_days INTEGER NOT NULL DEFAULT 0")
        _ensure_column(cursor, "leaverequest", "excluded_public_holidays", "excluded_public_holidays INTEGER NOT NULL DEFAULT 0")
        _ensure_column(cursor, "leaverequest", "is_half_day", "is_half_day INTEGER NOT NULL DEFAULT 0")
        connection.commit()
        connection.close()


def get_session():
    with Session(engine) as session:
        yield session
