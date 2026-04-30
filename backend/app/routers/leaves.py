from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.security import get_current_user, require_roles
from app.core.permissions import can_view_all_employees, filter_employee_statement_by_access
from app.db import get_session
from app.models import AuditEvent, Employee, LeaveRequest, PublicHoliday, User, UserRole
from app.schemas import LeaveApprove, LeaveConfigRead, LeaveConfigUpdate, LeaveCreate, LeaveRead, PublicHolidayCreate, PublicHolidayRead
from app.services.audit import write_audit_log
from app.services.leave import calculate_leave_summary, get_leave_config


router = APIRouter(prefix="/leaves", tags=["leaves"])

LEAVE_TYPE_LABELS = {
    "annual": "年假",
    "sick": "病假",
    "unpaid": "無薪假",
    "other": "其他假期",
}

LEAVE_STATUS_LABELS = {
    "pending": "待批",
    "approved": "已批准",
    "rejected": "已拒絕",
}


def today_hk() -> date:
    return datetime.now(ZoneInfo("Asia/Hong_Kong")).date()


def leave_type_label(value) -> str:
    raw = getattr(value, "value", value)
    return LEAVE_TYPE_LABELS.get(str(raw), str(raw))


def leave_status_label(value) -> str:
    raw = getattr(value, "value", value)
    return LEAVE_STATUS_LABELS.get(str(raw), str(raw))


def to_leave_read(leave: LeaveRequest, employee: Employee, user: User) -> LeaveRead:
    calendar_days = leave.calendar_days or ((leave.end_date - leave.start_date).days + 1)
    return LeaveRead(
        id=leave.id,
        employee_id=leave.employee_id,
        employee_name=user.full_name,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        days=leave.days,
        calendar_days=calendar_days,
        excluded_public_holidays=leave.excluded_public_holidays,
        is_half_day=leave.is_half_day,
        reason=leave.reason,
        status=leave.status,
    )


def to_leave_config_read(config) -> LeaveConfigRead:
    return LeaveConfigRead(saturday_is_workday=config.saturday_is_workday)


def to_public_holiday_read(holiday: PublicHoliday) -> PublicHolidayRead:
    return PublicHolidayRead(
        id=holiday.id,
        holiday_date=holiday.holiday_date,
        name=holiday.name,
        is_active=holiday.is_active,
    )


@router.get("", response_model=list[LeaveRead])
def list_leaves(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    statement = select(LeaveRequest)
    if not can_view_all_employees(current_user):
        if not current_user.employee_profile:
            return []
        visible_employees = session.exec(filter_employee_statement_by_access(select(Employee), current_user)).all()
        visible_employee_ids = [employee.id for employee in visible_employees if employee.id is not None]
        if not visible_employee_ids:
            return []
        statement = statement.where(LeaveRequest.employee_id.in_(visible_employee_ids))

    leave_requests = session.exec(statement.order_by(LeaveRequest.start_date.desc())).all()
    results = []
    for leave in leave_requests:
        employee = session.get(Employee, leave.employee_id)
        user = session.get(User, employee.user_id) if employee else None
        if employee and user:
            results.append(to_leave_read(leave, employee, user))
    return results


@router.get("/config", response_model=LeaveConfigRead)
def read_leave_config(
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    return to_leave_config_read(get_leave_config(session))


@router.put("/config", response_model=LeaveConfigRead)
def update_leave_config(
    payload: LeaveConfigUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    config = get_leave_config(session)
    config.saturday_is_workday = payload.saturday_is_workday
    session.add(config)
    session.commit()
    session.refresh(config)
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.leave_config_updated,
        entity_type="leave_config",
        entity_id=config.id,
        summary="更新請假工作天設定",
        metadata={"saturday_is_workday": config.saturday_is_workday},
    )
    return to_leave_config_read(config)


@router.get("/public-holidays", response_model=list[PublicHolidayRead])
def list_public_holidays(
    year: int | None = None,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    statement = select(PublicHoliday)
    if year:
        statement = statement.where(
            PublicHoliday.holiday_date >= date(year, 1, 1),
            PublicHoliday.holiday_date <= date(year, 12, 31),
        )
    holidays = session.exec(statement.order_by(PublicHoliday.holiday_date.asc())).all()
    return [to_public_holiday_read(holiday) for holiday in holidays]


@router.post("/public-holidays", response_model=PublicHolidayRead, status_code=status.HTTP_201_CREATED)
def save_public_holiday(
    payload: PublicHolidayCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr)),
):
    holiday = session.exec(select(PublicHoliday).where(PublicHoliday.holiday_date == payload.holiday_date)).first()
    created = holiday is None
    if holiday is None:
        holiday = PublicHoliday(
            holiday_date=payload.holiday_date,
            name=payload.name,
            is_active=payload.is_active,
        )
    else:
        holiday.name = payload.name
        holiday.is_active = payload.is_active
    session.add(holiday)
    session.commit()
    session.refresh(holiday)
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.public_holiday_saved,
        entity_type="public_holiday",
        entity_id=holiday.id,
        summary=f"{'新增' if created else '更新'}公眾假期：{holiday.name}",
        metadata={"holiday_date": holiday.holiday_date.isoformat(), "is_active": holiday.is_active},
    )
    return to_public_holiday_read(holiday)


@router.post("", response_model=LeaveRead, status_code=status.HTTP_201_CREATED)
def create_leave(
    payload: LeaveCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if payload.start_date < today_hk():
        raise HTTPException(status_code=400, detail="不允許提交過去日期的請假申請")

    employee_id = payload.employee_id
    if current_user.role == UserRole.employee:
        if not current_user.employee_profile:
            raise HTTPException(status_code=400, detail="缺少員工資料")
        employee_id = current_user.employee_profile.id
    elif current_user.role == UserRole.manager:
        raise HTTPException(status_code=403, detail="Manager 不可代員工建立請假申請")
    elif not employee_id:
        raise HTTPException(status_code=400, detail="必須提供員工編號")

    employee = session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="找不到員工")

    try:
        summary = calculate_leave_summary(
            session=session,
            start_date=payload.start_date,
            end_date=payload.end_date,
            is_half_day=payload.is_half_day,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    if summary["days"] <= 0:
        raise HTTPException(status_code=400, detail="所選日期沒有可計算的工作天")

    leave = LeaveRequest(
        employee_id=employee.id,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days=float(summary["days"]),
        calendar_days=int(summary["calendar_days"]),
        excluded_public_holidays=int(summary["excluded_public_holidays"]),
        is_half_day=payload.is_half_day,
        reason=payload.reason,
    )
    session.add(leave)
    session.commit()
    session.refresh(leave)
    user = session.get(User, employee.user_id)
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.leave_created,
        entity_type="leave",
        entity_id=leave.id,
        summary=f"提交請假申請：{user.full_name} / {leave_type_label(leave.leave_type)} / {leave.start_date} 至 {leave.end_date}",
        metadata={
            "employee_id": employee.id,
            "employee_no": employee.employee_no,
            "leave_type": leave_type_label(leave.leave_type),
            "start_date": leave.start_date.isoformat(),
            "end_date": leave.end_date.isoformat(),
            "days": leave.days,
            "status": leave_status_label(leave.status),
        },
    )
    return to_leave_read(leave, employee, user)


@router.patch("/{leave_id}/status", response_model=LeaveRead)
def approve_leave(
    leave_id: int,
    payload: LeaveApprove,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.hr, UserRole.manager)),
):
    leave = session.get(LeaveRequest, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="找不到請假申請")
    employee = session.get(Employee, leave.employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="找不到員工")
    if current_user.role == UserRole.manager and employee.manager_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="權限不足")
    previous_status = leave.status
    leave.status = payload.status
    leave.approver_user_id = current_user.id
    session.add(leave)
    session.commit()
    session.refresh(leave)

    user = session.get(User, employee.user_id) if employee else None
    if not employee or not user:
        raise HTTPException(status_code=404, detail="找不到員工")
    write_audit_log(
        session,
        actor=current_user,
        event_type=AuditEvent.leave_status_updated,
        entity_type="leave",
        entity_id=leave.id,
        summary=f"更新請假狀態：{user.full_name} / {leave_type_label(leave.leave_type)} / {leave_status_label(previous_status)} → {leave_status_label(leave.status)}",
        metadata={
            "employee_id": employee.id,
            "employee_no": employee.employee_no,
            "leave_type": leave_type_label(leave.leave_type),
            "start_date": leave.start_date.isoformat(),
            "end_date": leave.end_date.isoformat(),
            "days": leave.days,
            "previous_status": leave_status_label(previous_status),
            "status": leave_status_label(leave.status),
        },
    )
    return to_leave_read(leave, employee, user)
