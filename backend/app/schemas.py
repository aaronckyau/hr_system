from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.models import AuditEvent, DeductionType, EarningType, LeaveStatus, LeaveType, PayrollStatus, SettingCategory, UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ResetEmployeePasswordRequest(BaseModel):
    employee_id: int


class ResetEmployeePasswordRead(BaseModel):
    employee_id: int
    employee_name: str
    temporary_password: str


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole


class EmployeeCreate(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.employee
    employee_no: str
    hk_id: str
    tax_file_no: Optional[str] = None
    department: str
    job_title: str
    employment_start_date: date
    employment_end_date: Optional[date] = None
    employment_type: str = "full_time"
    work_location: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    annual_leave_balance: int = 14
    base_salary: float = 0
    allowances: float = 0
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None


class EmployeeUpdate(BaseModel):
    department: Optional[str] = None
    job_title: Optional[str] = None
    employment_end_date: Optional[date] = None
    employment_type: Optional[str] = None
    work_location: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    annual_leave_balance: Optional[int] = None
    base_salary: Optional[float] = None
    allowances: Optional[float] = None
    bank_name: Optional[str] = None
    bank_account_no: Optional[str] = None


class EmployeeRead(BaseModel):
    id: int
    user_id: Optional[int]
    email: EmailStr
    full_name: str
    role: UserRole
    employee_no: str
    hk_id: str
    tax_file_no: Optional[str]
    department: str
    job_title: str
    employment_start_date: date
    employment_end_date: Optional[date]
    employment_type: str
    work_location: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    annual_leave_balance: int
    base_salary: float
    allowances: float
    bank_name: Optional[str]
    bank_account_no: Optional[str]


class LeaveCreate(BaseModel):
    employee_id: Optional[int] = None
    leave_type: LeaveType
    start_date: date
    end_date: date
    is_half_day: bool = False
    reason: Optional[str] = None


class LeaveApprove(BaseModel):
    status: LeaveStatus


class LeaveConfigRead(BaseModel):
    saturday_is_workday: bool


class LeaveConfigUpdate(BaseModel):
    saturday_is_workday: bool


class PublicHolidayCreate(BaseModel):
    holiday_date: date
    name: str
    is_active: bool = True


class PublicHolidayRead(BaseModel):
    id: int
    holiday_date: date
    name: str
    is_active: bool


class SettingOptionCreate(BaseModel):
    category: SettingCategory
    value: str
    label: str
    display_order: int = 0
    is_active: bool = True


class SettingOptionRead(BaseModel):
    id: int
    category: SettingCategory
    value: str
    label: str
    display_order: int
    is_active: bool


class LeaveRead(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    leave_type: LeaveType
    start_date: date
    end_date: date
    days: float
    calendar_days: int
    excluded_public_holidays: int
    is_half_day: bool
    reason: Optional[str]
    status: LeaveStatus


class PayrollGenerateRequest(BaseModel):
    payroll_month: str
    employee_id: Optional[int] = None


class PayrollConfigRead(BaseModel):
    daily_salary_divisor: int
    mpf_rate: float
    mpf_cap: float
    min_relevant_income: float
    max_relevant_income: float
    new_employee_mpf_exempt_days: int


class PayrollConfigUpdate(BaseModel):
    daily_salary_divisor: int
    mpf_rate: float
    mpf_cap: float
    min_relevant_income: float
    max_relevant_income: float
    new_employee_mpf_exempt_days: int


class EarningCreate(BaseModel):
    employee_id: int
    payroll_month: str
    earning_type: EarningType
    amount: float
    is_taxable: bool
    counts_for_mpf: bool
    description: str


class EarningRead(BaseModel):
    id: Optional[int]
    employee_id: int
    payroll_month: str
    earning_type: EarningType
    amount: float
    is_taxable: bool
    counts_for_mpf: bool
    description: str
    source: str


class DeductionCreate(BaseModel):
    employee_id: int
    payroll_month: str
    deduction_type: DeductionType
    amount: float
    reason: str


class DeductionRead(BaseModel):
    id: Optional[int]
    employee_id: int
    payroll_month: str
    deduction_type: DeductionType
    amount: float
    reason: str
    source: str


class PayrollRead(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    payroll_month: str
    base_salary: float
    allowances: float
    gross_income: float
    taxable_income: float
    non_taxable_income: float
    deductions: float
    relevant_income: float
    employee_mpf: float
    employer_mpf: float
    net_salary: float
    status: PayrollStatus


class PayrollDetailRead(PayrollRead):
    department: str
    job_title: str
    unpaid_leave_days: float
    daily_rate: float
    daily_salary_divisor: int
    employee_mpf_exempt: bool
    employee_mpf_exempt_reason: Optional[str]
    relevant_income_formula: str
    employee_mpf_formula: str
    employer_mpf_formula: str
    net_salary_formula: str
    earnings_breakdown: list[EarningRead]
    deductions_breakdown: list[DeductionRead]


class FinalPayCreate(BaseModel):
    employee_id: int
    payroll_month: str
    termination_date: date
    unpaid_salary: float = 0
    unused_leave_days: float = 0
    payment_in_lieu_days: float = 0
    notes: Optional[str] = None


class FinalPayRead(BaseModel):
    id: int
    employee_id: int
    employee_name: str
    payroll_month: str
    termination_date: date
    unpaid_salary: float
    unused_leave_days: float
    annual_leave_payout: float
    payment_in_lieu_days: float
    payment_in_lieu: float
    net_final_pay: float
    notes: Optional[str]


class ReportFilter(BaseModel):
    payroll_month: Optional[str] = None


class AuditLogRead(BaseModel):
    id: int
    actor_user_id: Optional[int]
    actor_name: str
    actor_role: str
    event_type: AuditEvent
    entity_type: str
    entity_id: Optional[int]
    summary: str
    metadata: dict[str, str | int | float | bool | None]
    created_at: str
