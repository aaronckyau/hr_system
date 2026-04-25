from datetime import date, timedelta

from sqlmodel import Session, select

from app.models import LeaveConfig, LeaveRequest, PublicHoliday


DEFAULT_PUBLIC_HOLIDAYS_2026: list[tuple[date, str]] = [
    (date(2026, 1, 1), "元旦"),
    (date(2026, 2, 17), "農曆年初一"),
    (date(2026, 2, 18), "農曆年初二"),
    (date(2026, 2, 19), "農曆年初三"),
    (date(2026, 4, 3), "耶穌受難節"),
    (date(2026, 4, 4), "耶穌受難節翌日"),
    (date(2026, 4, 6), "復活節星期一"),
    (date(2026, 4, 7), "清明節翌日"),
    (date(2026, 5, 1), "勞動節"),
    (date(2026, 5, 25), "佛誕"),
    (date(2026, 6, 19), "端午節"),
    (date(2026, 7, 1), "香港特別行政區成立紀念日"),
    (date(2026, 9, 26), "中秋節翌日"),
    (date(2026, 10, 1), "國慶日"),
    (date(2026, 10, 19), "重陽節翌日"),
    (date(2026, 12, 25), "聖誕節"),
    (date(2026, 12, 26), "聖誕節後第一個周日"),
]


def get_leave_config(session: Session) -> LeaveConfig:
    config = session.exec(select(LeaveConfig)).first()
    if config:
        return config
    config = LeaveConfig(saturday_is_workday=False)
    session.add(config)
    session.commit()
    session.refresh(config)
    return config


def seed_default_public_holidays(session: Session) -> None:
    existing_dates = {
        holiday.holiday_date
        for holiday in session.exec(
            select(PublicHoliday).where(
                PublicHoliday.holiday_date >= date(2026, 1, 1),
                PublicHoliday.holiday_date <= date(2026, 12, 31),
            )
        ).all()
    }
    created = False
    for holiday_date, name in DEFAULT_PUBLIC_HOLIDAYS_2026:
        if holiday_date in existing_dates:
            continue
        session.add(PublicHoliday(holiday_date=holiday_date, name=name, is_active=True))
        created = True
    if created:
        session.commit()


def is_working_day(target_date: date, saturday_is_workday: bool) -> bool:
    if target_date.weekday() == 6:
        return False
    if target_date.weekday() == 5 and not saturday_is_workday:
        return False
    return True


def get_public_holiday_date_set(session: Session, start_date: date, end_date: date) -> set[date]:
    holidays = session.exec(
        select(PublicHoliday).where(
            PublicHoliday.is_active == True,
            PublicHoliday.holiday_date >= start_date,
            PublicHoliday.holiday_date <= end_date,
        )
    ).all()
    return {holiday.holiday_date for holiday in holidays}


def calculate_leave_summary_for_range(
    start_date: date,
    end_date: date,
    public_holiday_dates: set[date],
    saturday_is_workday: bool,
    is_half_day: bool = False,
) -> dict[str, int | float]:
    if end_date < start_date:
        raise ValueError("結束日期必須晚於或等於開始日期")
    if is_half_day and start_date != end_date:
        raise ValueError("半日假只支援單日申請")

    calendar_days = (end_date - start_date).days + 1
    working_days = 0.0
    excluded_public_holidays = 0
    current_date = start_date
    while current_date <= end_date:
        if is_working_day(current_date, saturday_is_workday):
            if current_date in public_holiday_dates:
                excluded_public_holidays += 1
            else:
                working_days += 0.5 if is_half_day and current_date == start_date else 1.0
        current_date += timedelta(days=1)

    return {
        "days": working_days,
        "calendar_days": calendar_days,
        "excluded_public_holidays": excluded_public_holidays,
    }


def calculate_leave_summary(
    session: Session,
    start_date: date,
    end_date: date,
    is_half_day: bool = False,
) -> dict[str, int | float]:
    config = get_leave_config(session)
    public_holiday_dates = get_public_holiday_date_set(session, start_date, end_date)
    summary = calculate_leave_summary_for_range(
        start_date=start_date,
        end_date=end_date,
        public_holiday_dates=public_holiday_dates,
        saturday_is_workday=config.saturday_is_workday,
        is_half_day=is_half_day,
    )
    summary["saturday_is_workday"] = config.saturday_is_workday
    return summary


def get_leave_days_within_range(
    leave: LeaveRequest,
    range_start: date,
    range_end: date,
    public_holiday_dates: set[date],
    saturday_is_workday: bool,
) -> float:
    overlap_start = max(leave.start_date, range_start)
    overlap_end = min(leave.end_date, range_end)
    if overlap_end < overlap_start:
        return 0.0
    summary = calculate_leave_summary_for_range(
        start_date=overlap_start,
        end_date=overlap_end,
        public_holiday_dates=public_holiday_dates,
        saturday_is_workday=saturday_is_workday,
        is_half_day=leave.is_half_day and overlap_start == overlap_end == leave.start_date,
    )
    return float(summary["days"])
