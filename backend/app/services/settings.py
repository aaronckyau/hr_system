from datetime import datetime

from sqlmodel import Session, select

from app.models import SettingCategory, SettingOption


DEFAULT_SETTING_OPTIONS: dict[SettingCategory, list[tuple[str, str]]] = {
    SettingCategory.department: [
        ("HR", "人事部"),
        ("Finance", "財務部"),
        ("Operations", "營運部"),
        ("Sales", "銷售部"),
        ("IT", "資訊科技部"),
    ],
    SettingCategory.position: [
        ("Officer", "主任"),
        ("Analyst", "分析員"),
        ("Manager", "經理"),
        ("Assistant", "助理"),
    ],
    SettingCategory.work_location: [
        ("Hong Kong Office", "香港辦公室"),
        ("Remote", "遙距工作"),
        ("Client Site", "客戶現場"),
    ],
    SettingCategory.employment_type: [
        ("full_time", "全職"),
        ("part_time", "兼職"),
        ("contract", "合約"),
        ("temporary", "臨時"),
        ("intern", "實習"),
        ("consultant", "顧問"),
    ],
    SettingCategory.bank: [
        ("HSBC", "匯豐"),
        ("Hang Seng", "恒生"),
        ("BOC Hong Kong", "中銀香港"),
        ("Standard Chartered", "渣打"),
        ("DBS", "星展"),
    ],
    SettingCategory.leave_type: [
        ("annual", "年假"),
        ("sick", "病假"),
        ("unpaid", "無薪假"),
        ("other", "其他"),
    ],
    SettingCategory.earning_type: [
        ("commission", "佣金"),
        ("bonus", "花紅"),
        ("reimbursement", "報銷"),
        ("other", "其他收入"),
    ],
    SettingCategory.deduction_type: [
        ("absence", "缺勤"),
        ("late", "遲到"),
        ("other", "其他扣款"),
    ],
}


def seed_default_setting_options(session: Session) -> None:
    created = False
    for category, options in DEFAULT_SETTING_OPTIONS.items():
        for index, (value, label) in enumerate(options, start=1):
            existing = session.exec(
                select(SettingOption).where(
                    SettingOption.category == category,
                    SettingOption.value == value,
                )
            ).first()
            if existing:
                continue
            session.add(
                SettingOption(
                    category=category,
                    value=value,
                    label=label,
                    display_order=index,
                    is_active=True,
                )
            )
            created = True
    if created:
        session.commit()


def upsert_setting_option(
    session: Session,
    category: SettingCategory,
    value: str,
    label: str,
    display_order: int,
    is_active: bool,
) -> SettingOption:
    normalized_value = value.strip()
    normalized_label = label.strip()
    existing = session.exec(
        select(SettingOption).where(
            SettingOption.category == category,
            SettingOption.value == normalized_value,
        )
    ).first()
    if existing:
        existing.label = normalized_label
        existing.display_order = display_order
        existing.is_active = is_active
        existing.updated_at = datetime.utcnow()
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    option = SettingOption(
        category=category,
        value=normalized_value,
        label=normalized_label,
        display_order=display_order,
        is_active=is_active,
    )
    session.add(option)
    session.commit()
    session.refresh(option)
    return option
