import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.security import get_current_user, hash_password, require_roles
from app.db import get_session
from app.models import AuditEvent, Employee, User, UserRole
from app.schemas import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.services.audit import write_audit_log


router = APIRouter(prefix="/employees", tags=["employees"])


def generate_initial_password() -> str:
    return secrets.token_urlsafe(9)


def to_employee_read(employee: Employee, user: User) -> EmployeeRead:
    return EmployeeRead(
        id=employee.id,
        user_id=employee.user_id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        employee_no=employee.employee_no,
        hk_id=employee.hk_id,
        tax_file_no=employee.tax_file_no,
        department=employee.department,
        job_title=employee.job_title,
        employment_start_date=employee.employment_start_date,
        employment_end_date=employee.employment_end_date,
        employment_type=employee.employment_type,
        phone=employee.phone,
        address=employee.address,
        annual_leave_balance=employee.annual_leave_balance,
        base_salary=employee.base_salary,
        allowances=employee.allowances,
        bank_name=employee.bank_name,
        bank_account_no=employee.bank_account_no,
    )


@router.get("", response_model=list[EmployeeRead])
def list_employees(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.employee and current_user.employee_profile:
        return [to_employee_read(current_user.employee_profile, current_user)]

    employees = session.exec(select(Employee)).all()
    results = []
    for employee in employees:
        user = session.get(User, employee.user_id)
        if user:
            results.append(to_employee_read(employee, user))
    return results


@router.post("", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: EmployeeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    if session.exec(select(User).where(User.email == payload.email)).first():
        raise HTTPException(status_code=400, detail="電郵已存在")
    if session.exec(select(Employee).where(Employee.employee_no == payload.employee_no)).first():
        raise HTTPException(status_code=400, detail="員工編號已存在")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(generate_initial_password()),
        role=payload.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    employee = Employee(
        user_id=user.id,
        employee_no=payload.employee_no,
        hk_id=payload.hk_id,
        tax_file_no=payload.tax_file_no,
        department=payload.department,
        job_title=payload.job_title,
        employment_start_date=payload.employment_start_date,
        employment_end_date=payload.employment_end_date,
        employment_type=payload.employment_type,
        phone=payload.phone,
        address=payload.address,
        annual_leave_balance=payload.annual_leave_balance,
        base_salary=payload.base_salary,
        allowances=payload.allowances,
        bank_name=payload.bank_name,
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
    return to_employee_read(employee, user)


@router.patch("/{employee_id}", response_model=EmployeeRead)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="找不到員工")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(employee, key, value)
    session.add(employee)
    session.commit()
    session.refresh(employee)

    user = session.get(User, employee.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="找不到員工帳號")
    return to_employee_read(employee, user)
