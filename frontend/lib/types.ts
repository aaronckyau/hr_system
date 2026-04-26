export type UserRole = "admin" | "hr" | "employee";

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
};

export type ResetEmployeePasswordResult = {
  employee_id: number;
  employee_name: string;
  temporary_password: string;
};

export type Employee = {
  id: number;
  user_id?: number | null;
  email: string;
  full_name: string;
  role: UserRole;
  employee_no: string;
  hk_id: string;
  tax_file_no?: string | null;
  department: string;
  job_title: string;
  employment_start_date: string;
  employment_end_date?: string | null;
  employment_type: string;
  work_location?: string | null;
  phone?: string | null;
  address?: string | null;
  annual_leave_balance: number;
  base_salary: number;
  allowances: number;
  bank_name?: string | null;
  bank_account_no?: string | null;
};

export type LeaveRequest = {
  id: number;
  employee_id: number;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  calendar_days: number;
  excluded_public_holidays: number;
  is_half_day: boolean;
  reason?: string | null;
  status: string;
};

export type LeaveConfig = {
  saturday_is_workday: boolean;
};

export type PublicHoliday = {
  id: number;
  holiday_date: string;
  name: string;
  is_active: boolean;
};

export type SettingCategory =
  | "department"
  | "position"
  | "work_location"
  | "employment_type"
  | "bank"
  | "leave_type"
  | "earning_type"
  | "deduction_type";

export type SettingOption = {
  id: number;
  category: SettingCategory;
  value: string;
  label: string;
  display_order: number;
  is_active: boolean;
};

export type PayrollRecord = {
  id: number;
  employee_id: number;
  employee_name: string;
  payroll_month: string;
  base_salary: number;
  allowances: number;
  gross_income: number;
  taxable_income: number;
  non_taxable_income: number;
  deductions: number;
  relevant_income: number;
  employee_mpf: number;
  employer_mpf: number;
  net_salary: number;
  status: string;
};

export type PayrollDetail = PayrollRecord & {
  department: string;
  job_title: string;
  unpaid_leave_days: number;
  daily_rate: number;
  daily_salary_divisor: number;
  employee_mpf_exempt: boolean;
  employee_mpf_exempt_reason?: string | null;
  relevant_income_formula: string;
  employee_mpf_formula: string;
  employer_mpf_formula: string;
  net_salary_formula: string;
  earnings_breakdown: EarningLine[];
  deductions_breakdown: DeductionLine[];
};

export type PayrollConfig = {
  daily_salary_divisor: number;
  mpf_rate: number;
  mpf_cap: number;
  min_relevant_income: number;
  max_relevant_income: number;
  new_employee_mpf_exempt_days: number;
};

export type DeductionLine = {
  id?: number | null;
  employee_id: number;
  payroll_month: string;
  deduction_type: "unpaid_leave" | "absence" | "late" | "other";
  amount: number;
  reason: string;
  source: "manual" | "derived";
};

export type EarningLine = {
  id?: number | null;
  employee_id: number;
  payroll_month: string;
  earning_type: "commission" | "bonus" | "reimbursement" | "other";
  amount: number;
  is_taxable: boolean;
  counts_for_mpf: boolean;
  description: string;
  source: "manual" | "derived";
};

export type FinalPayRecord = {
  id: number;
  employee_id: number;
  employee_name: string;
  payroll_month: string;
  termination_date: string;
  unpaid_salary: number;
  unused_leave_days: number;
  annual_leave_payout: number;
  payment_in_lieu_days: number;
  payment_in_lieu: number;
  net_final_pay: number;
  notes?: string | null;
};

export type AuditLog = {
  id: number;
  actor_user_id?: number | null;
  actor_name: string;
  actor_role: string;
  event_type: string;
  entity_type: string;
  entity_id?: number | null;
  summary: string;
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
};
