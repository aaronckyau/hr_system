"use client";

import { Dispatch, FormEvent, SetStateAction, useEffect, useState } from "react";

import { Alert, Button, Card, EmptyState, PageHeader, SlideOver, StatCard } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Employee, ResetEmployeePasswordResult, SettingOption, User } from "@/lib/types";

const roleOptions = [
  { value: "employee", label: "員工" },
  { value: "manager", label: "主管" },
  { value: "hr", label: "人事" },
  { value: "admin", label: "管理員" },
];

const statusLabels: Record<string, string> = {
  active: "在職",
  probation: "試用",
  terminated: "離職",
  suspended: "停職",
};

const initialForm = {
  email: "",
  full_name: "",
  role: "employee",
  manager_user_id: "",
  employee_no: "",
  hk_id: "",
  tax_file_no: "",
  department: "",
  job_title: "",
  employment_start_date: "",
  employment_end_date: "",
  employment_type: "full_time",
  employment_status: "active",
  work_location: "",
  phone: "",
  address: "",
  annual_leave_balance: 14,
  base_salary: 0,
  allowances: 0,
  bank_name: "",
  bank_account_no: "",
};

const initialEditForm = {
  manager_user_id: "",
  department: "",
  job_title: "",
  employment_end_date: "",
  employment_type: "",
  employment_status: "active",
  work_location: "",
  phone: "",
  address: "",
  annual_leave_balance: 0,
  base_salary: 0,
  allowances: 0,
  bank_name: "",
  bank_account_no: "",
};

function optionsByCategory(options: SettingOption[], category: string) {
  return options.filter((option) => option.category === category && option.is_active);
}

function optionLabel(options: SettingOption[], category: string, value?: string | null) {
  if (!value) return "";
  return options.find((option) => option.category === category && option.value === value)?.label ?? value;
}

const fallbackDisplayLabels: Record<string, string> = {
  "Human Resources": "人事部",
  Operations: "營運部",
  Finance: "財務部",
  Sales: "銷售部",
  Admin: "行政部",
  "HR Officer": "人事主任",
  "Operations Manager": "營運經理",
  "Operations Assistant": "營運助理",
  Officer: "主任",
  Analyst: "分析員",
  Manager: "經理",
  Assistant: "助理",
  full_time: "全職",
  part_time: "兼職",
  contract: "合約",
  intern: "實習",
};

function displayOptionLabel(options: SettingOption[], category: string, value?: string | null) {
  if (!value) return "-";
  const label = optionLabel(options, category, value);
  return label !== value ? label : fallbackDisplayLabels[value] ?? value;
}

function money(amount: number) {
  return `HK$${amount.toFixed(2)}`;
}

function validateEmployeeForm(form: typeof initialForm) {
  const errors: string[] = [];
  if (!form.email.trim()) errors.push("請輸入電郵");
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.push("電郵格式不正確");
  if (!form.full_name.trim()) errors.push("請輸入姓名");
  if (!form.employee_no.trim()) errors.push("請輸入員工編號");
  if (!form.hk_id.trim()) errors.push("請輸入 HKID / 護照");
  if (!form.department) errors.push("請選擇部門");
  if (!form.job_title) errors.push("請選擇職位");
  if (!form.employment_start_date) errors.push("請選擇入職日期");
  if (!form.employment_type) errors.push("請選擇合約類型");
  if (!form.employment_status) errors.push("請選擇員工狀態");
  if (Number(form.annual_leave_balance) < 0) errors.push("年假餘額不可少於 0");
  if (Number(form.base_salary) < 0) errors.push("基本月薪不可少於 0");
  if (Number(form.allowances) < 0) errors.push("津貼不可少於 0");
  return errors;
}

export function EmployeesClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settingOptions, setSettingOptions] = useState<SettingOption[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [resetEmployeeId, setResetEmployeeId] = useState("");
  const [resetResult, setResetResult] = useState<ResetEmployeePasswordResult | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [filters, setFilters] = useState({ keyword: "", department: "", status: "" });

  async function loadData() {
    const [employeeData, settingData, meData] = await Promise.all([
      apiFetch<Employee[]>("/employees"),
      apiFetch<SettingOption[]>("/settings/options"),
      apiFetch<User>("/auth/me"),
    ]);
    setEmployees(employeeData);
    setSettingOptions(settingData);
    setCurrentUser(meData);
  }

  useEffect(() => {
    loadData().catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "無法載入員工資料"));
  }, []);

  function renderOptionSelect(key: keyof typeof initialForm, category: string, placeholder: string) {
    return (
      <select value={String(form[key])} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}>
        <option value="">{placeholder}</option>
        {optionsByCategory(settingOptions, category).map((option) => (
          <option key={option.id} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validationErrors = validateEmployeeForm(form);
    if (validationErrors.length > 0) {
      setError(validationErrors.join("；"));
      return;
    }
    try {
      await apiFetch<Employee>("/employees", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          manager_user_id: form.manager_user_id ? Number(form.manager_user_id) : null,
          employment_end_date: form.employment_end_date || null,
          annual_leave_balance: Number(form.annual_leave_balance),
          base_salary: Number(form.base_salary),
          allowances: Number(form.allowances),
        }),
      });
      setForm(initialForm);
      await loadData();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "建立員工失敗");
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResetResult(null);
    try {
      const result = await apiFetch<ResetEmployeePasswordResult>("/auth/reset-employee-password", {
        method: "POST",
        body: JSON.stringify({ employee_id: Number(resetEmployeeId) }),
      });
      setResetResult(result);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "重設密碼失敗");
    }
  }

  function openEmployeeEditor(employee: Employee) {
    setSelectedEmployee(employee);
    setEditForm({
      manager_user_id: employee.manager_user_id ? String(employee.manager_user_id) : "",
      department: employee.department || "",
      job_title: employee.job_title || "",
      employment_end_date: employee.employment_end_date || "",
      employment_type: employee.employment_type || "",
      employment_status: employee.employment_status || "active",
      work_location: employee.work_location || "",
      phone: employee.phone || "",
      address: employee.address || "",
      annual_leave_balance: employee.annual_leave_balance,
      base_salary: employee.base_salary,
      allowances: employee.allowances,
      bank_name: employee.bank_name || "",
      bank_account_no: employee.bank_account_no || "",
    });
  }

  async function handleUpdateEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployee) return;
    setError("");
    try {
      const updated = await apiFetch<Employee>(`/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...editForm,
          manager_user_id: editForm.manager_user_id ? Number(editForm.manager_user_id) : null,
          employment_end_date: editForm.employment_end_date || null,
          annual_leave_balance: Number(editForm.annual_leave_balance),
          base_salary: Number(editForm.base_salary),
          allowances: Number(editForm.allowances),
        }),
      });
      setSelectedEmployee(updated);
      await loadData();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "更新員工資料失敗");
    }
  }

  const canResetPassword = currentUser?.role === "admin" || currentUser?.role === "hr";
  const managerOptions = employees.filter((employee) => employee.role === "manager" || employee.role === "admin" || employee.role === "hr");
  const filteredEmployees = employees.filter((employee) => {
    const keyword = filters.keyword.trim().toLowerCase();
    const matchesKeyword =
      !keyword ||
      [employee.full_name, employee.employee_no, employee.email, employee.department, employee.job_title]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    const matchesDepartment = !filters.department || employee.department === filters.department;
    const matchesStatus = !filters.status || employee.employment_status === filters.status;
    return matchesKeyword && matchesDepartment && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="HR Master Data"
        title="員工資料管理"
        description="以手機、平板及桌面都可操作的方式管理員工檔案、主管、部門、職位、狀態與薪酬資料。下拉選項來自公司設定。"
      />

      {error ? <Alert>{error}</Alert> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="員工總數" value={employees.length} />
        <StatCard label="在職" value={employees.filter((employee) => employee.employment_status === "active").length} tone="brand" />
        <StatCard label="試用" value={employees.filter((employee) => employee.employment_status === "probation").length} tone="warm" />
        <StatCard label="主管人數" value={managerOptions.length} tone="brand" />
      </section>

      {canResetPassword ? (
        <Card>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">員工密碼重設</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">系統會產生一次性臨時密碼，發送給員工後應要求對方首次登入後立即修改。</p>
            </div>
          </div>
          <form className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleResetPassword}>
            <select value={resetEmployeeId} onChange={(event) => setResetEmployeeId(event.target.value)}>
              <option value="">請選擇員工</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} ({employee.employee_no})
                </option>
              ))}
            </select>
            <Button type="submit">重設臨時密碼</Button>
          </form>
          {resetResult ? (
            <div className="mt-4 rounded-[1.25rem] bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <div className="font-semibold">{resetResult.employee_name} 的臨時密碼</div>
              <div className="mt-2 rounded-xl bg-white px-3 py-2 font-mono text-base ring-1 ring-amber-100">{resetResult.temporary_password}</div>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">新增員工</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">先填必需資料，再補充僱傭、薪酬及聯絡資料。分段輸入可減少一次過面對太多欄位的壓力。</p>
        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <FormSection title="1. 登入與身份" description="建立員工帳戶及基本識別資料。">
            <Field label="電郵">
              <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="姓名">
              <input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} />
            </Field>
            <Field label="角色">
              <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="員工編號">
              <input value={form.employee_no} onChange={(event) => setForm((current) => ({ ...current, employee_no: event.target.value }))} />
            </Field>
            <Field label="HKID / 護照">
              <input value={form.hk_id} onChange={(event) => setForm((current) => ({ ...current, hk_id: event.target.value }))} />
            </Field>
            <Field label="直屬主管">
              <select value={form.manager_user_id} onChange={(event) => setForm((current) => ({ ...current, manager_user_id: event.target.value }))}>
                <option value="">未指定</option>
                {managerOptions.map((employee) => (
                  <option key={employee.id} value={employee.user_id ?? ""}>
                    {employee.full_name} ({employee.employee_no})
                  </option>
                ))}
              </select>
            </Field>
          </FormSection>

          <FormSection title="2. 僱傭資料" description="部門、職位及合約資料來自公司設定，方便日後報表及權限管理。">
            <Field label="部門">{renderOptionSelect("department", "department", "請選擇部門")}</Field>
            <Field label="職位">{renderOptionSelect("job_title", "position", "請選擇職位")}</Field>
            <Field label="工作地點">{renderOptionSelect("work_location", "work_location", "請選擇工作地點")}</Field>
            <Field label="入職日期">
              <input type="date" value={form.employment_start_date} onChange={(event) => setForm((current) => ({ ...current, employment_start_date: event.target.value }))} />
            </Field>
            <Field label="離職日期">
              <input type="date" value={form.employment_end_date} onChange={(event) => setForm((current) => ({ ...current, employment_end_date: event.target.value }))} />
            </Field>
            <Field label="合約類型">{renderOptionSelect("employment_type", "employment_type", "請選擇合約類型")}</Field>
            <Field label="員工狀態">{renderOptionSelect("employment_status", "employment_status", "請選擇員工狀態")}</Field>
          </FormSection>

          <FormSection title="3. 薪酬與銀行" description="銀行名稱由 HR 或員工自由輸入，支援不同銀行或虛擬銀行名稱。">
            <Field label="基本月薪">
              <input type="number" value={form.base_salary} onChange={(event) => setForm((current) => ({ ...current, base_salary: Number(event.target.value) }))} />
            </Field>
            <Field label="津貼">
              <input type="number" value={form.allowances} onChange={(event) => setForm((current) => ({ ...current, allowances: Number(event.target.value) }))} />
            </Field>
            <Field label="年假餘額">
              <input type="number" value={form.annual_leave_balance} onChange={(event) => setForm((current) => ({ ...current, annual_leave_balance: Number(event.target.value) }))} />
            </Field>
            <Field label="銀行">
              <input placeholder="例：HSBC、恒生銀行、ZA Bank" value={form.bank_name} onChange={(event) => setForm((current) => ({ ...current, bank_name: event.target.value }))} />
            </Field>
            <Field label="銀行戶口">
              <input value={form.bank_account_no} onChange={(event) => setForm((current) => ({ ...current, bank_account_no: event.target.value }))} />
            </Field>
          </FormSection>

          <FormSection title="4. 聯絡資料" description="電話及地址可稍後補充，適合先快速建立員工檔案。">
            <Field label="電話">
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <div className="md:col-span-2">
              <Field label="地址">
                <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
              </Field>
            </div>
          </FormSection>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">提交前請確認必填欄位已完成，系統會即時提示缺漏資料。</p>
            <Button className="w-full sm:w-auto" type="submit">
              新增員工
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">員工列表</h2>
            <p className="mt-1 text-sm text-slate-500">顯示 {filteredEmployees.length} / {employees.length} 名員工</p>
          </div>
          <Button
            className="w-full md:w-auto"
            variant="ghost"
            onClick={() => setFilters({ keyword: "", department: "", status: "" })}
            type="button"
          >
            清除篩選
          </Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Field label="搜尋員工">
            <input
              placeholder="姓名、員工編號、電郵、部門、職位"
              value={filters.keyword}
              onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
            />
          </Field>
          <Field label="部門">
            <select value={filters.department} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}>
              <option value="">全部部門</option>
              {optionsByCategory(settingOptions, "department").map((option) => (
                <option key={option.id} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="狀態">
            <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">全部狀態</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-5 hidden overflow-x-auto lg:block">
          <table className="responsive-table min-w-full">
            <thead>
              <tr>
                <th>姓名</th>
                <th>編號</th>
                <th>狀態</th>
                <th>部門</th>
                <th>職位</th>
                <th>主管</th>
                <th>月薪</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => {
                const manager = employees.find((item) => item.user_id === employee.manager_user_id);
                return (
                  <tr key={employee.id}>
                    <td className="font-semibold text-slate-950">{employee.full_name}</td>
                    <td>{employee.employee_no}</td>
                    <td>{statusLabels[employee.employment_status] ?? employee.employment_status}</td>
                    <td>{displayOptionLabel(settingOptions, "department", employee.department)}</td>
                    <td>{displayOptionLabel(settingOptions, "position", employee.job_title)}</td>
                    <td>{manager?.full_name ?? "-"}</td>
                    <td>{money(employee.base_salary)}</td>
                    <td>
                      <Button variant="ghost" onClick={() => openEmployeeEditor(employee)} type="button">查看 / 編輯</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 lg:hidden">
          {filteredEmployees.map((employee) => {
            const manager = employees.find((item) => item.user_id === employee.manager_user_id);
            return (
              <div key={employee.id} className="rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-950">{employee.full_name}</div>
                    <div className="mt-1 text-sm text-slate-500">{employee.employee_no}</div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{statusLabels[employee.employment_status] ?? employee.employment_status}</div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <div>部門：{displayOptionLabel(settingOptions, "department", employee.department)}</div>
                  <div>職位：{displayOptionLabel(settingOptions, "position", employee.job_title)}</div>
                  <div>主管：{manager?.full_name ?? "-"}</div>
                  <div className="font-semibold text-brand">月薪：{money(employee.base_salary)}</div>
                </div>
                <Button className="mt-4 w-full" variant="ghost" onClick={() => openEmployeeEditor(employee)} type="button">查看 / 編輯</Button>
              </div>
            );
          })}
          {filteredEmployees.length === 0 ? <EmptyState title="找不到員工" description="請調整搜尋字眼或篩選條件。" /> : null}
        </div>
      </Card>

      <EmployeeEditorDrawer
        employee={selectedEmployee}
        editForm={editForm}
        managerOptions={managerOptions}
        settingOptions={settingOptions}
        onChange={setEditForm}
        onClose={() => setSelectedEmployee(null)}
        onSubmit={handleUpdateEmployee}
      />
    </div>
  );
}

function EmployeeEditorDrawer({
  employee,
  editForm,
  managerOptions,
  settingOptions,
  onChange,
  onClose,
  onSubmit,
}: {
  employee: Employee | null;
  editForm: typeof initialEditForm;
  managerOptions: Employee[];
  settingOptions: SettingOption[];
  onChange: Dispatch<SetStateAction<typeof initialEditForm>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function renderOptionSelect(key: keyof typeof initialEditForm, category: string, placeholder: string) {
    const value = String(editForm[key] ?? "");
    const options = optionsByCategory(settingOptions, category);
    const hasCurrentValue = value ? options.some((option) => option.value === value) : false;
    return (
      <select value={value} onChange={(event) => onChange((current) => ({ ...current, [key]: event.target.value }))}>
        <option value="">{placeholder}</option>
        {value && !hasCurrentValue ? (
          <option value={value}>{optionLabel(settingOptions, category, value)}（目前值）</option>
        ) : null}
        {options.map((option) => (
          <option key={option.id} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <SlideOver
      open={Boolean(employee)}
      title={employee ? `${employee.full_name} 員工檔案` : "員工檔案"}
      description={employee ? `${employee.employee_no} / ${employee.email}` : undefined}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant="ghost" onClick={onClose} type="button">關閉</Button>
          <Button className="w-full sm:w-auto" form="employee-edit-form" type="submit">儲存更改</Button>
        </div>
      }
    >
      {employee ? (
        <form id="employee-edit-form" className="space-y-5" onSubmit={onSubmit}>
          <Card className="bg-slate-50/80 shadow-none">
            <h3 className="text-lg font-semibold text-slate-950">基本資料</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-600">
              <div>登入電郵：{employee.email}</div>
              <div>員工編號：{employee.employee_no}</div>
              <div>HKID / 護照：{employee.hk_id}</div>
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="直屬主管">
              <select value={editForm.manager_user_id} onChange={(event) => onChange((current) => ({ ...current, manager_user_id: event.target.value }))}>
                <option value="">未指定</option>
                {managerOptions.map((manager) => (
                  <option key={manager.id} value={manager.user_id ?? ""}>{manager.full_name} ({manager.employee_no})</option>
                ))}
              </select>
            </Field>
            <Field label="部門">{renderOptionSelect("department", "department", "請選擇部門")}</Field>
            <Field label="職位">{renderOptionSelect("job_title", "position", "請選擇職位")}</Field>
            <Field label="合約類型">{renderOptionSelect("employment_type", "employment_type", "請選擇合約類型")}</Field>
            <Field label="員工狀態">{renderOptionSelect("employment_status", "employment_status", "請選擇員工狀態")}</Field>
            <Field label="工作地點">{renderOptionSelect("work_location", "work_location", "請選擇工作地點")}</Field>
            <Field label="離職日期">
              <input type="date" value={editForm.employment_end_date} onChange={(event) => onChange((current) => ({ ...current, employment_end_date: event.target.value }))} />
            </Field>
            <Field label="電話">
              <input value={editForm.phone} onChange={(event) => onChange((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="年假餘額">
              <input type="number" value={editForm.annual_leave_balance} onChange={(event) => onChange((current) => ({ ...current, annual_leave_balance: Number(event.target.value) }))} />
            </Field>
            <Field label="基本月薪">
              <input type="number" value={editForm.base_salary} onChange={(event) => onChange((current) => ({ ...current, base_salary: Number(event.target.value) }))} />
            </Field>
            <Field label="津貼">
              <input type="number" value={editForm.allowances} onChange={(event) => onChange((current) => ({ ...current, allowances: Number(event.target.value) }))} />
            </Field>
            <Field label="銀行">
              <input placeholder="例：HSBC、恒生銀行、ZA Bank" value={editForm.bank_name} onChange={(event) => onChange((current) => ({ ...current, bank_name: event.target.value }))} />
            </Field>
            <Field label="銀行戶口">
              <input value={editForm.bank_account_no} onChange={(event) => onChange((current) => ({ ...current, bank_account_no: event.target.value }))} />
            </Field>
          </div>
          <Field label="地址">
            <textarea value={editForm.address} onChange={(event) => onChange((current) => ({ ...current, address: event.target.value }))} />
          </Field>
        </form>
      ) : null}
    </SlideOver>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] bg-slate-50/70 p-4 ring-1 ring-slate-100 sm:p-5">
      <div className="mb-4 max-w-2xl">
        <h3 className="text-lg font-semibold tracking-[-0.025em] text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}
