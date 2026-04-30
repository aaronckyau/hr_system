import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.security import get_current_user, hash_password, require_roles
from app.core.permissions import (
    can_view_all_employees,
    can_view_sensitive_employee_data,
    filter_employee_statement_by_access,
    mask_bank_account,
    mask_hkid,
)
from app.db import get_session
from app.models import AuditEvent, Employee, User, UserRole
from app.schemas import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.services.audit import write_audit_log


router = APIRouter(prefix="/employees", tags=["employees"])

VALUE_ALIASES = {
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

REQUIRED_MASTER_DATA_FIELDS = {"department", "job_title", "employment_type", "employment_status"}


def generate_initial_password() -> str:
    return secrets.token_urlsafe(9)


def normalize_employee_master_value(field: str, value):
    if value is None:
        return value
    if not isinstance(value, str):
        return value
    stripped = value.strip()
    return VALUE_ALIASES.get(field, {}).get(stripped, stripped)


def normalize_employee_payload_values(values: dict) -> dict:
    normalized = values.copy()
    for field in ("department", "job_title", "employment_type", "employment_status", "work_location", "bank_name"):
        if field in normalized:
            normalized[field] = normalize_employee_master_value(field, normalized[field])
    return normalized


def validate_required_master_data(values: dict) -> None:
    for field in REQUIRED_MASTER_DATA_FIELDS:
        if field in values and isinstance(values[field], str) and not values[field].strip():
            raise HTTPException(status_code=400, detail="部門、職位、合約類型及員工狀態不可留空")


def to_employee_read(employee: Employee, user: User, viewer: User | None = None) -> EmployeeRead:
    show_sensitive = True if viewer is None else can_view_sensitive_employee_data(viewer, employee)
    return EmployeeRead(
        id=employee.id,
        user_id=employee.user_id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        manager_user_id=employee.manager_user_id,
        employee_no=employee.employee_no,
        hk_id=employee.hk_id if show_sensitive else mask_hkid(employee.hk_id),
        tax_file_no=employee.tax_file_no if show_sensitive else None,
        department=employee.department,
        job_title=employee.job_title,
        employment_start_date=employee.employment_start_date,
        employment_end_date=employee.employment_end_date,
        employment_type=employee.employment_type,
        employment_status=employee.employment_status,
        work_location=employee.work_location,
        phone=employee.phone,
        address=employee.address if show_sensitive else None,
        annual_leave_balance=employee.annual_leave_balance,
        base_salary=employee.base_salary if show_sensitive else 0,
        allowances=employee.allowances if show_sensitive else 0,
        bank_name=employee.bank_name if show_sensitive else None,
        bank_account_no=employee.bank_account_no if show_sensitive else mask_bank_account(employee.bank_account_no),
    )


@router.get("", response_model=list[EmployeeRead])
def list_employees(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = filter_employee_statement_by_access(select(Employee), current_user)
    employees = session.exec(statement).all()
    results = []
    for employee in employees:
        user = session.get(User, employee.user_id)
        if user:
            results.append(to_employee_read(employee, user, current_user))

    if can_view_all_employees(current_user):
        write_audit_log(
            session,
            actor=current_user,
            event_type=AuditEvent.sensitive_employee_viewed,
            entity_type="employee",
            entity_id=None,
            summary="查看員工敏感資料列表",
            metadata={"record_count": len(results)},
        )
    return results


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    values = normalize_employee_payload_values(payload.model_dump())
    validate_required_master_data(values)

    if session.exec(select(User).where(User.email == payload.email)).first():
        raise HTTPException(status_code=400, detail="電郵已存在")
    if session.exec(select(Employee).where(Employee.employee_no == payload.employee_no)).first():
        raise HTTPException(status_code=400, detail="員工編號已存在")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(generate_initial_password()),
        role=values["role"],
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    employee = Employee(
        user_id=user.id,
        manager_user_id=values["manager_user_id"],
        employee_no=payload.employee_no,
        hk_id=payload.hk_id,
        tax_file_no=payload.tax_file_no,
        department=values["department"],
        job_title=values["job_title"],
        employment_start_date=payload.employment_start_date,
        employment_end_date=payload.employment_end_date,
        employment_type=values["employment_type"],
        employment_status=values["employment_status"],
        work_location=values["work_location"],
        phone=payload.phone,
        address=payload.address,
        annual_leave_balance=payload.annual_leave_balance,
        base_salary=payload.base_salary,
        allowances=payload.allowances,
        bank_name=values["bank_name"],
        bank_account_no=payload.bank_account_no,
    )
    session.add(employee)
    session.commit()
    session.refresh(employee)
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.employee_created,
        entity_type="employee",
        entity_id=employee.id,
        summary=f"新增員工：{user.full_name} ({employee.employee_no})",
        metadata={
            "employee_no": employee.employee_no,
            "department": employee.department,
            "job_title": employee.job_title,
        },
    )
    return to_employee_read(employee, user, current_user)


@router.patch("/{employee_id}", response_model=EmployeeRead)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="找不到員工")

    updates = normalize_employee_payload_values(payload.model_dump(exclude_unset=True))
    validate_required_master_data(updates)
    for key, value in updates.items():
        setattr(employee, key, value)
    session.add(employee)
    session.commit()
    session.refresh(employee)

    user = session.get(User, employee.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="找不到員工帳號")
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.employee_updated,
        entity_type="employee",
        entity_id=employee.id,
        summary=f"更新員工資料：{user.full_name} ({employee.employee_no})",
        metadata={"updated_fields": sorted(updates.keys())},
    )
    return to_employee_read(employee, user, current_user)
