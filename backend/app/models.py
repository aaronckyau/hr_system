from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class UserRole(str, Enum):
    admin = "admin"
    hr = "hr"
    employee = "employee"


class LeaveType(str, Enum):
    annual = "annual"
    sick = "sick"
    unpaid = "unpaid"
    other = "other"


class LeaveStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class PayrollStatus(str, Enum):
    draft = "draft"
    finalized = "finalized"


class DeductionType(str, Enum):
    unpaid_leave = "unpaid_leave"
    absence = "absence"
    late = "late"
    other = "other"


class EarningType(str, Enum):
    commission = "commission"
    bonus = "bonus"
    reimbursement = "reimbursement"
    other = "other"


class SettingCategory(str, Enum):
    department = "department"
    position = "position"
    work_location = "work_location"
    employment_type = "employment_type"
    bank = "bank"


class AuditEvent(str, Enum):
    employee_created = "employee_created"
    employee_password_reset = "employee_password_reset"
    leave_config_updated = "leave_config_updated"
    public_holiday_saved = "public_holiday_saved"
    setting_option_saved = "setting_option_saved"
    payroll_config_updated = "payroll_config_updated"
    earning_created = "earning_created"
    deduction_created = "deduction_created"
    payroll_generated = "payroll_generated"
    final_pay_created = "final_pay_created"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    full_name: str
    password_hash: str
    role: UserRole = Field(default=UserRole.employee)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    employee_profile: Optional["Employee"] = Relationship(back_populates="user")


class Employee(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", unique=True)
    employee_no: str = Field(index=True, unique=True)
    hk_id: str
    tax_file_no: Optional[str] = None
    department: str
    job_title: str
    employment_start_date: date
    employment_end_date: Optional[date] = None
    employment_type: str = Field(default="full_time")
    work_location: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    annual_leave_balance: int = Field(default=14)
    base_salary: float = Field(default=0)
    allowances: float = Field(default=0)
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    user: Optional[User] = Relationship(back_populates="employee_profile")


class LeaveRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employee.id", index=True)
    leave_type: LeaveType
    start_date: date
    end_date: date
    days: float
    calendar_days: int = Field(default=0)
    excluded_public_holidays: int = Field(default=0)
    is_half_day: bool = Field(default=False)
    reason: Optional[str] = None
    status: LeaveStatus = Field(default=LeaveStatus.pending)
    approver_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class LeaveConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    saturday_is_workday: bool = Field(default=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class PublicHoliday(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    holiday_date: date = Field(index=True)
    name: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class SettingOption(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    category: SettingCategory = Field(index=True)
    value: str = Field(index=True)
    label: str
    display_order: int = Field(default=0)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class PayrollRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employee.id", index=True)
    payroll_month: str = Field(index=True)
    base_salary: float
    allowances: float = Field(default=0)
    gross_income: float = Field(default=0)
    taxable_income: float = Field(default=0)
    non_taxable_income: float = Field(default=0)
    deductions: float = Field(default=0)
    relevant_income: float
    employee_mpf: float
    employer_mpf: float
    net_salary: float
    status: PayrollStatus = Field(default=PayrollStatus.draft)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class PayrollConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    daily_salary_divisor: int = Field(default=30)
    mpf_rate: float = Field(default=0.05)
    mpf_cap: float = Field(default=1500)
    min_relevant_income: float = Field(default=7100)
    max_relevant_income: float = Field(default=30000)
    new_employee_mpf_exempt_days: int = Field(default=30)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class DeductionItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employee.id", index=True)
    payroll_month: str = Field(index=True)
    deduction_type: DeductionType
    amount: float
    reason: str
    created_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class EarningItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employee.id", index=True)
    payroll_month: str = Field(index=True)
    earning_type: EarningType
    amount: float
    is_taxable: bool = Field(default=True)
    counts_for_mpf: bool = Field(default=False)
    description: str
    created_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class FinalPayRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employee.id", index=True)
    termination_date: date
    payroll_month: str = Field(index=True)
    unpaid_salary: float = Field(default=0)
    unused_leave_days: float = Field(default=0)
    annual_leave_payout: float = Field(default=0)
    payment_in_lieu_days: float = Field(default=0)
    payment_in_lieu: float = Field(default=0)
    net_final_pay: float = Field(default=0)
    notes: Optional[str] = None
    created_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    actor_name: str
    actor_role: str
    event_type: AuditEvent = Field(index=True)
    entity_type: str = Field(index=True)
    entity_id: Optional[int] = Field(default=None, index=True)
    summary: str
    metadata_json: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
