import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.security import authenticate_user, create_access_token, get_current_user, hash_password, require_roles
from app.db import get_session
from app.models import AuditEvent, Employee, User, UserRole
from app.schemas import LoginRequest, ResetEmployeePasswordRead, ResetEmployeePasswordRequest, Token, UserRead
from app.services.audit import write_audit_log


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, session: Session = Depends(get_session)):
    user = authenticate_user(session, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="帳號或密碼錯誤")
    return Token(access_token=create_access_token(user.email))


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return UserRead(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
    )


@router.post("/reset-employee-password", response_model=ResetEmployeePasswordRead)
def reset_employee_password(
    payload: ResetEmployeePasswordRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    employee = session.get(Employee, payload.employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到員工")

    user = session.get(User, employee.user_id) if employee.user_id else None
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到員工帳號")

    temporary_password = secrets.token_urlsafe(9)
    user.password_hash = hash_password(temporary_password)
    session.add(user)
    session.commit()

    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.employee_password_reset,
        entity_type="employee",
        entity_id=employee.id,
        summary=f"重設員工密碼：{user.full_name} ({employee.employee_no})",
        metadata={"employee_no": employee.employee_no},
    )

    return ResetEmployeePasswordRead(
        employee_id=employee.id,
        employee_name=user.full_name,
        temporary_password=temporary_password,
    )
