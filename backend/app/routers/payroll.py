from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.core.security import get_current_user, require_roles
from app.core.permissions import ensure_can_view_sensitive_employee_data
from app.db import get_session
from app.models import AuditEvent, DeductionItem, Employee, EarningItem, FinalPayRecord, User, UserRole
from app.schemas import (
    DeductionCreate,
    DeductionRead,
    EarningCreate,
    EarningRead,
    FinalPayCreate,
    FinalPayRead,
    PayrollConfigRead,
    PayrollConfigUpdate,
    PayrollDetailRead,
    PayrollGenerateRequest,
    PayrollRead,
)
from app.services.payroll import (
    build_payroll_components,
    create_or_update_final_pay,
    generate_payroll_for_employee,
    get_payroll_config,
    list_earning_items,
    list_manual_deductions,
)
from app.services.audit import write_audit_log


router = APIRouter(prefix="/payroll", tags=["payroll"])


EARNING_TYPE_LABELS = {
    "commission": "佣金",
    "bonus": "花紅",
    "reimbursement": "報銷",
    "other": "其他收入",
}

DEDUCTION_TYPE_LABELS = {
    "unpaid_leave": "無薪假扣款",
    "absence": "缺勤扣款",
    "late": "遲到扣款",
    "other": "其他扣款",
}


def earning_type_label(value) -> str:
    raw = getattr(value, "value", value)
    return EARNING_TYPE_LABELS.get(str(raw), str(raw))


def deduction_type_label(value) -> str:
    raw = getattr(value, "value", value)
    return DEDUCTION_TYPE_LABELS.get(str(raw), str(raw))


def current_hk_payroll_month() -> str:
    now = datetime.now(ZoneInfo("Asia/Hong_Kong"))
    return f"{now.year}-{now.month:02d}"


def config_to_read(config) -> PayrollConfigRead:
    return PayrollConfigRead(
        daily_salary_divisor=config.daily_salary_divisor,
        mpf_rate=config.mpf_rate,
        mpf_cap=config.mpf_cap,
        min_relevant_income=config.min_relevant_income,
        max_relevant_income=config.max_relevant_income,
        new_employee_mpf_exempt_days=config.new_employee_mpf_exempt_days,
    )


def to_payroll_read(payroll, employee: Employee, user: User) -> PayrollRead:
    return PayrollRead(
        id=payroll.id,
        employee_id=payroll.employee_id,
        employee_name=user.full_name,
        payroll_month=payroll.payroll_month,
        base_salary=payroll.base_salary,
        allowances=payroll.allowances,
        gross_income=payroll.gross_income,
        taxable_income=payroll.taxable_income,
        non_taxable_income=payroll.non_taxable_income,
        deductions=payroll.deductions,
        relevant_income=payroll.relevant_income,
        employee_mpf=payroll.employee_mpf,
        employer_mpf=payroll.employer_mpf,
        net_salary=payroll.net_salary,
        status=payroll.status,
    )


def get_employee_with_access_check(session: Session, employee_id: int, current_user: User) -> Employee:
    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="找不到員工")
    ensure_can_view_sensitive_employee_data(current_user, employee)
    return employee


def get_payroll_with_access_check(session: Session, payroll_id: int, current_user: User):
    from app.models import PayrollRecord

    payroll = session.get(PayrollRecord, payroll_id)
    if not payroll:
        raise HTTPException(status_code=404, detail="找不到薪資記錄")
    employee = get_employee_with_access_check(session, payroll.employee_id, current_user)
    user = session.get(User, employee.user_id) if employee.user_id else None
    if not user:
        raise HTTPException(status_code=404, detail="找不到員工帳號")
    return payroll, employee, user


def earning_to_read(item: EarningItem, source: str = "manual") -> EarningRead:
    return EarningRead(
        id=item.id,
        employee_id=item.employee_id,
        payroll_month=item.payroll_month,
        earning_type=item.earning_type,
        amount=item.amount,
        is_taxable=item.is_taxable,
        counts_for_mpf=item.counts_for_mpf,
        description=item.description,
        source=source,
    )


def deduction_to_read(item: DeductionItem, source: str = "manual") -> DeductionRead:
    return DeductionRead(
        id=item.id,
        employee_id=item.employee_id,
        payroll_month=item.payroll_month,
        deduction_type=item.deduction_type,
        amount=item.amount,
        reason=item.reason,
        source=source,
    )


def final_pay_to_read(record: FinalPayRecord, employee: Employee, user: User) -> FinalPayRead:
    return FinalPayRead(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=user.full_name,
        payroll_month=record.payroll_month,
        termination_date=record.termination_date,
        unpaid_salary=record.unpaid_salary,
        unused_leave_days=record.unused_leave_days,
        annual_leave_payout=record.annual_leave_payout,
        payment_in_lieu_days=record.payment_in_lieu_days,
        payment_in_lieu=record.payment_in_lieu,
        net_final_pay=record.net_final_pay,
        notes=record.notes,
    )


@router.get("", response_model=list[PayrollRead])
def list_payroll(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from app.models import PayrollRecord

    statement = select(PayrollRecord)
    if current_user.role not in (UserRole.admin, UserRole.hr):
        if not current_user.employee_profile:
            return []
        statement = statement.where(PayrollRecord.employee_id == current_user.employee_profile.id)

    payrolls = session.exec(statement.order_by(PayrollRecord.payroll_month.desc())).all()
    results = []
    for payroll in payrolls:
        employee = session.get(Employee, payroll.employee_id)
        user = session.get(User, employee.user_id) if employee else None
        if employee and user:
            results.append(to_payroll_read(payroll, employee, user))
    if current_user.role in (UserRole.admin, UserRole.hr):
        write_audit_log(
            session,
            actor=current_user,
            event_type=AuditEvent.payroll_viewed,
            entity_type="payroll",
            entity_id=None,
            summary="查看薪資資料列表",
            metadata={"record_count": len(results)},
        )
    return results


@router.get("/config", response_model=PayrollConfigRead)
def read_payroll_config(
    session: Session = Depends(get_session),
    _: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    return config_to_read(get_payroll_config(session))


@router.put("/config", response_model=PayrollConfigRead)
def update_payroll_config(
    payload: PayrollConfigUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    if payload.daily_salary_divisor <= 0:
        raise HTTPException(status_code=400, detail="日薪除數必須大於 0")
    config = get_payroll_config(session)
    config.daily_salary_divisor = payload.daily_salary_divisor
    config.mpf_rate = payload.mpf_rate
    config.mpf_cap = payload.mpf_cap
    config.min_relevant_income = payload.min_relevant_income
    config.max_relevant_income = payload.max_relevant_income
    config.new_employee_mpf_exempt_days = payload.new_employee_mpf_exempt_days
    session.add(config)
    session.commit()
    session.refresh(config)
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.payroll_config_updated,
        entity_type="payroll_config",
        entity_id=config.id,
        summary="更新薪資規則設定",
        metadata={
            "daily_salary_divisor": config.daily_salary_divisor,
            "mpf_rate": config.mpf_rate,
            "mpf_cap": config.mpf_cap,
        },
    )
    return config_to_read(config)


@router.get("/earnings", response_model=list[EarningRead])
def read_earnings(
    payroll_month: str,
    employee_id: int | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(EarningItem).where(EarningItem.payroll_month == payroll_month)
    if current_user.role not in (UserRole.admin, UserRole.hr):
        if not current_user.employee_profile:
            return []
        statement = statement.where(EarningItem.employee_id == current_user.employee_profile.id)
    elif employee_id:
        statement = statement.where(EarningItem.employee_id == employee_id)

    items = session.exec(statement).all()
    return [earning_to_read(item) for item in items]


@router.post("/earnings", response_model=EarningRead)
def create_earning(
    payload: EarningCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    if payload.amount < 0:
        raise HTTPException(status_code=400, detail="收入金額不可為負數")
    employee = session.get(Employee, payload.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="找不到員工")

    item = EarningItem(
        employee_id=payload.employee_id,
        payroll_month=payload.payroll_month,
        earning_type=payload.earning_type,
        amount=payload.amount,
        is_taxable=payload.is_taxable,
        counts_for_mpf=payload.counts_for_mpf,
        description=payload.description,
        created_by_user_id=current_user.id,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.earning_created,
        entity_type="earning_item",
        entity_id=item.id,
        summary=f"新增收入項目：員工 #{payload.employee_id} / {earning_type_label(payload.earning_type)}",
        metadata={
            "employee_id": payload.employee_id,
            "payroll_month": payload.payroll_month,
            "amount": payload.amount,
            "earning_type": earning_type_label(payload.earning_type),
        },
    )
    return earning_to_read(item)


@router.get("/deductions", response_model=list[DeductionRead])
def read_deductions(
    payroll_month: str,
    employee_id: int | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(DeductionItem).where(DeductionItem.payroll_month == payroll_month)
    if current_user.role not in (UserRole.admin, UserRole.hr):
        if not current_user.employee_profile:
            return []
        statement = statement.where(DeductionItem.employee_id == current_user.employee_profile.id)
    elif employee_id:
        statement = statement.where(DeductionItem.employee_id == employee_id)

    items = session.exec(statement).all()
    return [deduction_to_read(item) for item in items]


@router.post("/deductions", response_model=DeductionRead)
def create_deduction(
    payload: DeductionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    if payload.amount < 0:
        raise HTTPException(status_code=400, detail="扣款金額不可為負數")
    employee = session.get(Employee, payload.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="找不到員工")

    item = DeductionItem(
        employee_id=payload.employee_id,
        payroll_month=payload.payroll_month,
        deduction_type=payload.deduction_type,
        amount=payload.amount,
        reason=payload.reason,
        created_by_user_id=current_user.id,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.deduction_created,
        entity_type="deduction_item",
        entity_id=item.id,
        summary=f"新增扣款項目：員工 #{payload.employee_id} / {deduction_type_label(payload.deduction_type)}",
        metadata={
            "employee_id": payload.employee_id,
            "payroll_month": payload.payroll_month,
            "amount": payload.amount,
            "deduction_type": deduction_type_label(payload.deduction_type),
        },
    )
    return deduction_to_read(item)


@router.get("/final-pay", response_model=list[FinalPayRead])
def list_final_pay(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(FinalPayRecord)
    if current_user.role not in (UserRole.admin, UserRole.hr):
        if not current_user.employee_profile:
            return []
        statement = statement.where(FinalPayRecord.employee_id == current_user.employee_profile.id)

    records = session.exec(statement.order_by(FinalPayRecord.termination_date.desc())).all()
    results = []
    for record in records:
        employee = session.get(Employee, record.employee_id)
        user = session.get(User, employee.user_id) if employee else None
        if employee and user:
            results.append(final_pay_to_read(record, employee, user))
    return results


@router.post("/final-pay", response_model=FinalPayRead)
def create_final_pay(
    payload: FinalPayCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    employee = session.get(Employee, payload.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="找不到員工")
    record = create_or_update_final_pay(
        session,
        employee=employee,
        payroll_month=payload.payroll_month,
        termination_date=payload.termination_date,
        unpaid_salary=payload.unpaid_salary,
        unused_leave_days=payload.unused_leave_days,
        payment_in_lieu_days=payload.payment_in_lieu_days,
        notes=payload.notes,
        created_by_user_id=current_user.id,
    )
    user = session.get(User, employee.user_id)
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.final_pay_created,
        entity_type="final_pay",
        entity_id=record.id,
        summary=f"建立離職結算：{user.full_name} / {payload.payroll_month}",
        metadata={
            "employee_id": employee.id,
            "payroll_month": payload.payroll_month,
            "net_final_pay": record.net_final_pay,
        },
    )
    return final_pay_to_read(record, employee, user)


@router.get("/{payroll_id}", response_model=PayrollDetailRead)
def read_payroll_detail(
    payroll_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    payroll, employee, user = get_payroll_with_access_check(session, payroll_id, current_user)
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.payroll_viewed,
        entity_type="payroll",
        entity_id=payroll.id,
        summary=f"查看薪資明細：{user.full_name} / {payroll.payroll_month}",
        metadata={"employee_id": employee.id, "payroll_month": payroll.payroll_month},
    )
    components = build_payroll_components(session, employee, payroll.payroll_month)

    earnings_breakdown = [
        EarningRead(
            id=None,
            employee_id=employee.id,
            payroll_month=payroll.payroll_month,
            earning_type="other",
            amount=employee.base_salary,
            is_taxable=True,
            counts_for_mpf=True,
            description="基本月薪",
            source="derived",
        ),
        EarningRead(
            id=None,
            employee_id=employee.id,
            payroll_month=payroll.payroll_month,
            earning_type="other",
            amount=employee.allowances,
            is_taxable=True,
            counts_for_mpf=True,
            description="固定津貼",
            source="derived",
        ),
        *[earning_to_read(item) for item in components["earning_items"]],
    ]

    deductions_breakdown = []
    if components["unpaid_leave_amount"] > 0:
        deductions_breakdown.append(
            DeductionRead(
                id=None,
                employee_id=employee.id,
                payroll_month=payroll.payroll_month,
                deduction_type="unpaid_leave",
                amount=components["unpaid_leave_amount"],
                reason=f"已批准無薪假：{components['unpaid_leave_days']} 天",
                source="derived",
            )
        )
    deductions_breakdown.extend(deduction_to_read(item) for item in components["manual_deductions"])

    mpf_base = round(employee.base_salary + employee.allowances + sum(item.amount for item in components["earning_items"] if item.counts_for_mpf), 2)

    return PayrollDetailRead(
        **to_payroll_read(payroll, employee, user).model_dump(),
        department=employee.department,
        job_title=employee.job_title,
        unpaid_leave_days=components["unpaid_leave_days"],
        daily_rate=components["daily_rate"],
        daily_salary_divisor=components["config"].daily_salary_divisor,
        employee_mpf_exempt=components["employee_mpf_exempt"],
        employee_mpf_exempt_reason=components["employee_mpf_exempt_reason"],
        relevant_income_formula=f"{mpf_base:.2f} - {payroll.deductions:.2f} = {payroll.relevant_income:.2f}",
        employee_mpf_formula=(
            f"豁免：{components['employee_mpf_exempt_reason']}"
            if components["employee_mpf_exempt"]
            else f"{payroll.relevant_income:.2f} x {components['config'].mpf_rate:.2%} = {payroll.employee_mpf:.2f}"
        ),
        employer_mpf_formula=f"{payroll.relevant_income:.2f} x {components['config'].mpf_rate:.2%} = {payroll.employer_mpf:.2f}",
        net_salary_formula=f"{payroll.gross_income:.2f} - {payroll.deductions:.2f} - {payroll.employee_mpf:.2f} = {payroll.net_salary:.2f}",
        earnings_breakdown=earnings_breakdown,
        deductions_breakdown=deductions_breakdown,
    )


@router.post("/generate", response_model=list[PayrollRead])
def generate_payroll(
    payload: PayrollGenerateRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    if payload.payroll_month > current_hk_payroll_month():
        raise HTTPException(status_code=400, detail="MVP 不允許生成未來月份薪資")

    employees_statement = select(Employee)
    if payload.employee_id:
        employees_statement = employees_statement.where(Employee.id == payload.employee_id)

    employees = session.exec(employees_statement).all()
    results = []
    for employee in employees:
        payroll = generate_payroll_for_employee(session, employee, payload.payroll_month)
        user = session.get(User, employee.user_id)
        if user:
            results.append(to_payroll_read(payroll, employee, user))
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.payroll_generated,
        entity_type="payroll",
        entity_id=payload.employee_id,
        summary=f"重算薪資：{payload.payroll_month}",
        metadata={
            "payroll_month": payload.payroll_month,
            "employee_id": payload.employee_id,
            "record_count": len(results),
        },
    )
    return results
