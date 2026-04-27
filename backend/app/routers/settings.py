from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.security import get_current_user, require_roles
from app.db import get_session
from app.models import AuditEvent, DeductionType, EarningType, EmploymentStatus, LeaveType, SettingCategory, SettingOption, User, UserRole
from app.schemas import SettingOptionCreate, SettingOptionRead
from app.services.audit import write_audit_log
from app.services.settings import upsert_setting_option


router = APIRouter(prefix="/settings", tags=["settings"])

RESTRICTED_CATEGORY_VALUES: dict[SettingCategory, set[str]] = {
    SettingCategory.leave_type: {item.value for item in LeaveType},
    SettingCategory.earning_type: {item.value for item in EarningType},
    SettingCategory.deduction_type: {item.value for item in DeductionType if item != DeductionType.unpaid_leave},
    SettingCategory.employment_status: {item.value for item in EmploymentStatus},
}


def to_setting_option_read(option: SettingOption) -> SettingOptionRead:
    return SettingOptionRead(
        id=option.id,
        category=option.category,
        value=option.value,
        label=option.label,
        display_order=option.display_order,
        is_active=option.is_active,
    )


@router.get("/options", response_model=list[SettingOptionRead])
def list_setting_options(
    category: SettingCategory | None = Query(default=None),
    include_inactive: bool = False,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(SettingOption)
    if category:
        statement = statement.where(SettingOption.category == category)
    if not include_inactive or current_user.role == UserRole.employee:
        statement = statement.where(SettingOption.is_active == True)
    options = session.exec(statement.order_by(SettingOption.category, SettingOption.display_order, SettingOption.label)).all()
    return [to_setting_option_read(option) for option in options]


@router.post("/options", response_model=SettingOptionRead, status_code=status.HTTP_201_CREATED)
def save_setting_option(
    payload: SettingOptionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    if not payload.value.strip():
        raise HTTPException(status_code=400, detail="選項值不可留空")
    if not payload.label.strip():
        raise HTTPException(status_code=400, detail="顯示名稱不可留空")
    allowed_values = RESTRICTED_CATEGORY_VALUES.get(payload.category)
    if allowed_values is not None and payload.value.strip() not in allowed_values:
        raise HTTPException(status_code=400, detail="此類別只可維護系統已支援的選項值")

    option = upsert_setting_option(
        session=session,
        category=payload.category,
        value=payload.value,
        label=payload.label,
        display_order=payload.display_order,
        is_active=payload.is_active,
    )
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.setting_option_saved,
        entity_type="setting_option",
        entity_id=option.id,
        summary=f"儲存公司設定：{option.category.value} / {option.label}",
        metadata={
            "category": option.category.value,
            "value": option.value,
            "is_active": option.is_active,
        },
    )
    return to_setting_option_read(option)
