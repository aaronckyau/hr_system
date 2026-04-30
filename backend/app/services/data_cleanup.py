from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlmodel import Session, select

from app.core.security import hash_password
from app.models import DeductionItem, Employee, EarningItem, PayrollRecord, PayrollStatus, User, UserRole


AUDIT_EVENT_VALUES = [
    "employee_created",
    "employee_updated",
    "employee_password_reset",
    "leave_created",
    "leave_status_updated",
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

EMPLOYEE_VALUE_FIXES = {
    "department": {
        "Human Resources": "HR",
    },
    "job_title": {
        "HR Officer": "Officer",
        "Finance Analyst": "Analyst",
        "Operations Manager": "Manager",
        "Operations Assistant": "Assistant",
    },
    "work_location": {
        "Central Office": "Hong Kong Office",
    },
}

EARNING_DESCRIPTION_FIXES = {
    "Production demo commission": "示範佣金",
    "Production demo 佣金": "示範佣金",
}

DEDUCTION_REASON_FIXES = {
    "Production demo late deduction": "示範遲到扣款",
    "Production demo 遲到扣款": "示範遲到扣款",
}

DEMO_PASSWORD = "Demo@2026-HR!"

DEMO_USERS = [
    {
        "email": "demo.admin@company.com",
        "full_name": "Demo Admin",
        "role": UserRole.admin,
        "employee_no": "DEMO-ADMIN",
        "hk_id": "D000001(1)",
        "department": "HR",
        "job_title": "Manager",
        "base_salary": 45000,
        "allowances": 2000,
        "bank_name": "匯豐",
        "bank_account_no": "111122223333",
    },
    {
        "email": "demo.hr@company.com",
        "full_name": "Demo HR",
        "role": UserRole.hr,
        "employee_no": "DEMO-HR",
        "hk_id": "D000002(2)",
        "department": "HR",
        "job_title": "Officer",
        "base_salary": 32000,
        "allowances": 1000,
        "bank_name": "恒生",
        "bank_account_no": "222233334444",
    },
    {
        "email": "demo.manager@company.com",
        "full_name": "Demo Manager",
        "role": UserRole.manager,
        "employee_no": "DEMO-MGR",
        "hk_id": "D000003(3)",
        "department": "Operations",
        "job_title": "Manager",
        "base_salary": 38000,
        "allowances": 1500,
        "bank_name": "中銀香港",
        "bank_account_no": "333344445555",
    },
    {
        "email": "demo.employee@company.com",
        "full_name": "Demo Employee",
        "role": UserRole.employee,
        "employee_no": "DEMO-EMP",
        "hk_id": "D000004(4)",
        "department": "Operations",
        "job_title": "Assistant",
        "base_salary": 20800,
        "allowances": 0,
        "bank_name": "渣打",
        "bank_account_no": "444455556666",
    },
]


def current_hk_payroll_month() -> str:
    now = datetime.now(ZoneInfo("Asia/Hong_Kong"))
    return f"{now.year}-{now.month:02d}"


def ensure_postgres_audit_events(session: Session) -> None:
    if session.get_bind().dialect.name != "postgresql":
        return
    for value in AUDIT_EVENT_VALUES:
        session.exec(text(f"ALTER TYPE auditevent ADD VALUE IF NOT EXISTS '{value}'"))
    session.commit()


def seed_demo_users(session: Session) -> None:
    users_by_email: dict[str, User] = {}
    for item in DEMO_USERS:
        user = session.exec(select(User).where(User.email == item["email"])).first()
        if not user:
            user = User(
                email=item["email"],
                full_name=item["full_name"],
                password_hash=hash_password(DEMO_PASSWORD),
                role=item["role"],
                is_active=True,
            )
        else:
            user.full_name = item["full_name"]
            user.password_hash = hash_password(DEMO_PASSWORD)
            user.role = item["role"]
            user.is_active = True
        session.add(user)
        session.commit()
        session.refresh(user)
        users_by_email[item["email"]] = user

    manager_user = users_by_email["demo.manager@company.com"]
    for item in DEMO_USERS:
        user = users_by_email[item["email"]]
        employee = session.exec(select(Employee).where(Employee.user_id == user.id)).first()
        if not employee:
            employee = session.exec(select(Employee).where(Employee.employee_no == item["employee_no"])).first()
        manager_user_id = manager_user.id if item["email"] == "demo.employee@company.com" else None
        if not employee:
            employee = Employee(
                user_id=user.id,
                employee_no=item["employee_no"],
                hk_id=item["hk_id"],
                department=item["department"],
                job_title=item["job_title"],
                employment_start_date=date(2026, 4, 1),
            )
        employee.user_id = user.id
        employee.manager_user_id = manager_user_id
        employee.employee_no = item["employee_no"]
        employee.hk_id = item["hk_id"]
        employee.department = item["department"]
        employee.job_title = item["job_title"]
        employee.employment_start_date = date(2026, 4, 1)
        employee.employment_type = "full_time"
        employee.employment_status = "active"
        employee.work_location = "Hong Kong Office"
        employee.phone = "91234567"
        employee.address = "香港中環示範辦公室"
        employee.annual_leave_balance = 14
        employee.base_salary = item["base_salary"]
        employee.allowances = item["allowances"]
        employee.bank_name = item["bank_name"]
        employee.bank_account_no = item["bank_account_no"]
        session.add(employee)
    session.commit()


def normalize_demo_data(session: Session) -> None:
    changed = False

    employees = session.exec(select(Employee)).all()
    for employee in employees:
        for field, mapping in EMPLOYEE_VALUE_FIXES.items():
            current_value = getattr(employee, field)
            if current_value in mapping:
                setattr(employee, field, mapping[current_value])
                changed = True
        if employee.bank_name in {"Demo Bank", "Production demo bank"}:
            employee.bank_name = "匯豐"
            changed = True
        session.add(employee)

    for item in session.exec(select(EarningItem)).all():
        if item.description in EARNING_DESCRIPTION_FIXES:
            item.description = EARNING_DESCRIPTION_FIXES[item.description]
            session.add(item)
            changed = True

    for item in session.exec(select(DeductionItem)).all():
        if item.reason in DEDUCTION_REASON_FIXES:
            item.reason = DEDUCTION_REASON_FIXES[item.reason]
            session.add(item)
            changed = True

    current_month = current_hk_payroll_month()
    future_draft_payroll = session.exec(
        select(PayrollRecord).where(
            PayrollRecord.payroll_month > current_month,
            PayrollRecord.status == PayrollStatus.draft,
        )
    ).all()
    for payroll in future_draft_payroll:
        session.delete(payroll)
        changed = True

    future_earnings = session.exec(select(EarningItem).where(EarningItem.payroll_month > current_month)).all()
    for item in future_earnings:
        session.delete(item)
        changed = True

    future_deductions = session.exec(select(DeductionItem).where(DeductionItem.payroll_month > current_month)).all()
    for item in future_deductions:
        session.delete(item)
        changed = True

    if changed:
        session.commit()
