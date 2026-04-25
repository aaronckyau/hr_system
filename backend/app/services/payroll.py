from calendar import monthrange
from datetime import date
from typing import Optional

from sqlmodel import Session, select

from app.models import DeductionItem, Employee, EarningItem, FinalPayRecord, LeaveRequest, LeaveStatus, LeaveType, PayrollConfig, PayrollRecord
from app.services.leave import get_leave_config, get_leave_days_within_range, get_public_holiday_date_set


def get_payroll_config(session: Session) -> PayrollConfig:
    config = session.exec(select(PayrollConfig)).first()
    if config:
        return config
    config = PayrollConfig(
        daily_salary_divisor=30,
        mpf_rate=0.05,
        mpf_cap=1500,
        min_relevant_income=7100,
        max_relevant_income=30000,
        new_employee_mpf_exempt_days=30,
    )
    session.add(config)
    session.commit()
    session.refresh(config)
    return config


def get_payroll_month_end(payroll_month: str) -> date:
    year, month = payroll_month.split("-")
    last_day = monthrange(int(year), int(month))[1]
    return date(int(year), int(month), last_day)


def get_unpaid_leave_deduction(
    session: Session,
    employee_id: int,
    payroll_month: str,
    base_salary: float,
    daily_salary_divisor: int,
) -> tuple[float, float, float]:
    year, month = payroll_month.split("-")
    month_start = date(int(year), int(month), 1)
    month_end = get_payroll_month_end(payroll_month)
    leave_requests = session.exec(
        select(LeaveRequest).where(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.status == LeaveStatus.approved,
            LeaveRequest.leave_type == LeaveType.unpaid,
        )
    ).all()
    leave_config = get_leave_config(session)
    public_holiday_dates = get_public_holiday_date_set(session, month_start, month_end)
    unpaid_days = 0.0
    for leave in leave_requests:
        unpaid_days += get_leave_days_within_range(
            leave=leave,
            range_start=month_start,
            range_end=month_end,
            public_holiday_dates=public_holiday_dates,
            saturday_is_workday=leave_config.saturday_is_workday,
        )
    divisor = daily_salary_divisor if daily_salary_divisor > 0 else 30
    daily_rate = base_salary / divisor if base_salary else 0
    return round(unpaid_days * daily_rate, 2), unpaid_days, round(daily_rate, 2)


def list_manual_deductions(session: Session, employee_id: int, payroll_month: str) -> list[DeductionItem]:
    return session.exec(
        select(DeductionItem).where(
            DeductionItem.employee_id == employee_id,
            DeductionItem.payroll_month == payroll_month,
        )
    ).all()


def list_earning_items(session: Session, employee_id: int, payroll_month: str) -> list[EarningItem]:
    return session.exec(
        select(EarningItem).where(
            EarningItem.employee_id == employee_id,
            EarningItem.payroll_month == payroll_month,
        )
    ).all()


def is_employee_mpf_exempt(employee: Employee, payroll_month: str, exempt_days: int) -> tuple[bool, Optional[str]]:
    payroll_month_end = get_payroll_month_end(payroll_month)
    days_employed = (payroll_month_end - employee.employment_start_date).days + 1
    if days_employed <= exempt_days:
        return True, f"入職首 {exempt_days} 日內，僱員供款獲豁免"
    return False, None


def calculate_mpf(relevant_income: float, config: PayrollConfig, employee_exempt: bool) -> tuple[float, float]:
    capped_income = min(relevant_income, config.max_relevant_income)
    employer_mpf = min(round(capped_income * config.mpf_rate, 2), config.mpf_cap)
    if employee_exempt or relevant_income < config.min_relevant_income:
        employee_mpf = 0
    else:
        employee_mpf = min(round(capped_income * config.mpf_rate, 2), config.mpf_cap)
    return employee_mpf, employer_mpf


def build_payroll_components(session: Session, employee: Employee, payroll_month: str) -> dict:
    config = get_payroll_config(session)
    earning_items = list_earning_items(session, employee.id, payroll_month)
    manual_deductions = list_manual_deductions(session, employee.id, payroll_month)
    unpaid_leave_amount, unpaid_leave_days, daily_rate = get_unpaid_leave_deduction(
        session,
        employee.id,
        payroll_month,
        employee.base_salary,
        config.daily_salary_divisor,
    )

    variable_gross_income = round(sum(item.amount for item in earning_items), 2)
    variable_taxable_income = round(sum(item.amount for item in earning_items if item.is_taxable), 2)
    variable_non_taxable_income = round(sum(item.amount for item in earning_items if not item.is_taxable), 2)
    variable_mpf_income = round(sum(item.amount for item in earning_items if item.counts_for_mpf), 2)

    manual_deduction_total = round(sum(item.amount for item in manual_deductions), 2)
    deductions = round(unpaid_leave_amount + manual_deduction_total, 2)
    gross_income = round(employee.base_salary + employee.allowances + variable_gross_income, 2)
    taxable_income = round(employee.base_salary + employee.allowances + variable_taxable_income, 2)
    non_taxable_income = round(variable_non_taxable_income, 2)
    relevant_income_base = round(employee.base_salary + employee.allowances + variable_mpf_income, 2)
    relevant_income = round(max(relevant_income_base - deductions, 0), 2)

    employee_exempt, employee_exempt_reason = is_employee_mpf_exempt(
        employee,
        payroll_month,
        config.new_employee_mpf_exempt_days,
    )
    employee_mpf, employer_mpf = calculate_mpf(relevant_income, config, employee_exempt)
    net_salary = round(gross_income - deductions - employee_mpf, 2)

    return {
        "config": config,
        "earning_items": earning_items,
        "manual_deductions": manual_deductions,
        "unpaid_leave_amount": unpaid_leave_amount,
        "unpaid_leave_days": unpaid_leave_days,
        "daily_rate": daily_rate,
        "gross_income": gross_income,
        "taxable_income": taxable_income,
        "non_taxable_income": non_taxable_income,
        "relevant_income": relevant_income,
        "employee_mpf": employee_mpf,
        "employer_mpf": employer_mpf,
        "net_salary": net_salary,
        "deductions": deductions,
        "employee_mpf_exempt": employee_exempt,
        "employee_mpf_exempt_reason": employee_exempt_reason,
    }


def generate_payroll_for_employee(session: Session, employee: Employee, payroll_month: str) -> PayrollRecord:
    existing = session.exec(
        select(PayrollRecord).where(
            PayrollRecord.employee_id == employee.id,
            PayrollRecord.payroll_month == payroll_month,
        )
    ).first()
    components = build_payroll_components(session, employee, payroll_month)

    if existing:
        existing.base_salary = employee.base_salary
        existing.allowances = employee.allowances
        existing.gross_income = components["gross_income"]
        existing.taxable_income = components["taxable_income"]
        existing.non_taxable_income = components["non_taxable_income"]
        existing.deductions = components["deductions"]
        existing.relevant_income = components["relevant_income"]
        existing.employee_mpf = components["employee_mpf"]
        existing.employer_mpf = components["employer_mpf"]
        existing.net_salary = components["net_salary"]
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    payroll = PayrollRecord(
        employee_id=employee.id,
        payroll_month=payroll_month,
        base_salary=employee.base_salary,
        allowances=employee.allowances,
        gross_income=components["gross_income"],
        taxable_income=components["taxable_income"],
        non_taxable_income=components["non_taxable_income"],
        deductions=components["deductions"],
        relevant_income=components["relevant_income"],
        employee_mpf=components["employee_mpf"],
        employer_mpf=components["employer_mpf"],
        net_salary=components["net_salary"],
    )
    session.add(payroll)
    session.commit()
    session.refresh(payroll)
    return payroll


def create_or_update_final_pay(
    session: Session,
    employee: Employee,
    payroll_month: str,
    termination_date: date,
    unpaid_salary: float,
    unused_leave_days: float,
    payment_in_lieu_days: float,
    notes: Optional[str],
    created_by_user_id: Optional[int],
) -> FinalPayRecord:
    config = get_payroll_config(session)
    divisor = config.daily_salary_divisor if config.daily_salary_divisor > 0 else 30
    daily_rate = employee.base_salary / divisor if employee.base_salary else 0
    annual_leave_payout = round(unused_leave_days * daily_rate, 2)
    payment_in_lieu = round(payment_in_lieu_days * daily_rate, 2)
    net_final_pay = round(unpaid_salary + annual_leave_payout + payment_in_lieu, 2)

    existing = session.exec(
        select(FinalPayRecord).where(
            FinalPayRecord.employee_id == employee.id,
            FinalPayRecord.payroll_month == payroll_month,
        )
    ).first()
    if existing:
        existing.termination_date = termination_date
        existing.unpaid_salary = unpaid_salary
        existing.unused_leave_days = unused_leave_days
        existing.annual_leave_payout = annual_leave_payout
        existing.payment_in_lieu_days = payment_in_lieu_days
        existing.payment_in_lieu = payment_in_lieu
        existing.net_final_pay = net_final_pay
        existing.notes = notes
        existing.created_by_user_id = created_by_user_id
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    record = FinalPayRecord(
        employee_id=employee.id,
        payroll_month=payroll_month,
        termination_date=termination_date,
        unpaid_salary=unpaid_salary,
        unused_leave_days=unused_leave_days,
        annual_leave_payout=annual_leave_payout,
        payment_in_lieu_days=payment_in_lieu_days,
        payment_in_lieu=payment_in_lieu,
        net_final_pay=net_final_pay,
        notes=notes,
        created_by_user_id=created_by_user_id,
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record
