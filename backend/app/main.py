from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.core.config import CORS_ORIGINS
from app.core.security import hash_password
from app.db import create_db_and_tables, engine
from app.models import PayrollConfig, User, UserRole
from app.routers import audit, auth, employees, leaves, payroll, reports, settings
from app.services.data_cleanup import ensure_postgres_audit_events, normalize_demo_data
from app.services.leave import get_leave_config, seed_default_public_holidays
from app.services.settings import seed_default_setting_options


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_db_and_tables()
    with Session(engine) as session:
        ensure_postgres_audit_events(session)
        admin = session.exec(select(User).where(User.email == "admin@company.com")).first()
        if not admin:
            session.add(
                User(
                    email="admin@company.com",
                    full_name="System Admin",
                    password_hash=hash_password("admin123"),
                    role=UserRole.admin,
                )
            )
            session.commit()
        payroll_config = session.exec(select(PayrollConfig)).first()
        if not payroll_config:
            session.add(
                PayrollConfig(
                    daily_salary_divisor=30,
                    mpf_rate=0.05,
                    mpf_cap=1500,
                    min_relevant_income=7100,
                    max_relevant_income=30000,
                    new_employee_mpf_exempt_days=30,
                )
            )
            session.commit()
        get_leave_config(session)
        seed_default_public_holidays(session)
        seed_default_setting_options(session)
        normalize_demo_data(session)
    yield


app = FastAPI(title="HK SME HR System MVP", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(leaves.router, prefix="/api")
app.include_router(payroll.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(settings.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok"}
