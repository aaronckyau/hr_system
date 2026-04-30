from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlmodel import Session, select

from app.models import DeductionItem, Employee, EarningItem, PayrollRecord, PayrollStatus


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


def current_hk_payroll_month() -> str:
    now = datetime.now(ZoneInfo("Asia/Hong_Kong"))
    return f"{now.year}-{now.month:02d}"


def ensure_postgres_audit_events(session: Session) -> None:
    if session.get_bind().dialect.name != "postgresql":
        return
    for value in AUDIT_EVENT_VALUES:
        session.exec(text(f"ALTER TYPE auditevent ADD VALUE IF NOT EXISTS '{value}'"))
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
