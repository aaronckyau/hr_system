from fastapi import HTTPException
from sqlmodel import Session

from app.models import Employee, User, UserRole


PRIVILEGED_ROLES = {UserRole.admin, UserRole.hr}


def can_view_all_employees(user: User) -> bool:
    return user.role in PRIVILEGED_ROLES


def can_view_sensitive_employee_data(user: User, employee: Employee) -> bool:
    if user.role in PRIVILEGED_ROLES:
        return True
    return user.employee_profile is not None and user.employee_profile.id == employee.id


def can_view_employee(user: User, employee: Employee) -> bool:
    if can_view_all_employees(user):
        return True
    if user.role == UserRole.manager and employee.manager_user_id == user.id:
        return True
    return user.employee_profile is not None and user.employee_profile.id == employee.id


def ensure_can_view_employee(user: User, employee: Employee) -> None:
    if not can_view_employee(user, employee):
        raise HTTPException(status_code=403, detail="權限不足")


def ensure_can_view_sensitive_employee_data(user: User, employee: Employee) -> None:
    if not can_view_sensitive_employee_data(user, employee):
        raise HTTPException(status_code=403, detail="權限不足")


def filter_employee_statement_by_access(statement, current_user: User):
    if can_view_all_employees(current_user):
        return statement
    if current_user.role == UserRole.manager:
        return statement.where(Employee.manager_user_id == current_user.id)
    if current_user.employee_profile:
        return statement.where(Employee.id == current_user.employee_profile.id)
    return statement.where(Employee.id == -1)


def get_employee_or_404(session: Session, employee_id: int) -> Employee:
    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="找不到員工")
    return employee


def mask_hkid(value: str | None) -> str:
    if not value:
        return ""
    clean = value.strip()
    if len(clean) <= 4:
        return "*" * len(clean)
    return f"{clean[:4]}{'*' * max(len(clean) - 4, 0)}"


def mask_bank_account(value: str | None) -> str | None:
    if not value:
        return value
    clean = value.strip()
    if len(clean) <= 4:
        return "*" * len(clean)
    return f"{'*' * max(len(clean) - 4, 0)}{clean[-4:]}"
