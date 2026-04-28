"use client";

import { FormEvent, useEffect, useState } from "react";

import { Alert, Button, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
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

function optionsByCategory(options: SettingOption[], category: string) {
  return options.filter((option) => option.category === category && option.is_active);
}

function money(amount: number) {
  return `HK$${amount.toFixed(2)}`;
}

export function EmployeesClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settingOptions, setSettingOptions] = useState<SettingOption[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [resetEmployeeId, setResetEmployeeId] = useState("");
  const [resetResult, setResetResult] = useState<ResetEmployeePasswordResult | null>(null);

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

  const canResetPassword = currentUser?.role === "admin" || currentUser?.role === "hr";
  const managerOptions = employees.filter((employee) => employee.role === "manager" || employee.role === "admin" || employee.role === "hr");

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
        <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleSubmit}>
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
          <Field label="員工編號">
            <input value={form.employee_no} onChange={(event) => setForm((current) => ({ ...current, employee_no: event.target.value }))} />
          </Field>
          <Field label="HKID / 護照">
            <input value={form.hk_id} onChange={(event) => setForm((current) => ({ ...current, hk_id: event.target.value }))} />
          </Field>
          <Field label="部門">{renderOptionSelect("department", "department", "請選擇部門")}</Field>
          <Field label="職位">{renderOptionSelect("job_title", "position", "請選擇職位")}</Field>
          <Field label="入職日期">
            <input type="date" value={form.employment_start_date} onChange={(event) => setForm((current) => ({ ...current, employment_start_date: event.target.value }))} />
          </Field>
          <Field label="離職日期">
            <input type="date" value={form.employment_end_date} onChange={(event) => setForm((current) => ({ ...current, employment_end_date: event.target.value }))} />
          </Field>
          <Field label="合約類型">{renderOptionSelect("employment_type", "employment_type", "請選擇合約類型")}</Field>
          <Field label="員工狀態">{renderOptionSelect("employment_status", "employment_status", "請選擇員工狀態")}</Field>
          <Field label="工作地點">{renderOptionSelect("work_location", "work_location", "請選擇工作地點")}</Field>
          <Field label="銀行">{renderOptionSelect("bank_name", "bank", "請選擇銀行")}</Field>
          <Field label="電話">
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </Field>
          <Field label="銀行戶口">
            <input value={form.bank_account_no} onChange={(event) => setForm((current) => ({ ...current, bank_account_no: event.target.value }))} />
          </Field>
          <Field label="年假餘額">
            <input type="number" value={form.annual_leave_balance} onChange={(event) => setForm((current) => ({ ...current, annual_leave_balance: Number(event.target.value) }))} />
          </Field>
          <Field label="基本月薪">
            <input type="number" value={form.base_salary} onChange={(event) => setForm((current) => ({ ...current, base_salary: Number(event.target.value) }))} />
          </Field>
          <Field label="津貼">
            <input type="number" value={form.allowances} onChange={(event) => setForm((current) => ({ ...current, allowances: Number(event.target.value) }))} />
          </Field>
          <div className="md:col-span-2 xl:col-span-3">
            <Field label="地址">
              <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <Button className="w-full sm:w-auto" type="submit">
              新增員工
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">員工列表</h2>
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
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const manager = employees.find((item) => item.user_id === employee.manager_user_id);
                return (
                  <tr key={employee.id}>
                    <td className="font-semibold text-slate-950">{employee.full_name}</td>
                    <td>{employee.employee_no}</td>
                    <td>{statusLabels[employee.employment_status] ?? employee.employment_status}</td>
                    <td>{employee.department}</td>
                    <td>{employee.job_title}</td>
                    <td>{manager?.full_name ?? "-"}</td>
                    <td>{money(employee.base_salary)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 lg:hidden">
          {employees.map((employee) => {
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
                  <div>部門：{employee.department || "-"}</div>
                  <div>職位：{employee.job_title || "-"}</div>
                  <div>主管：{manager?.full_name ?? "-"}</div>
                  <div className="font-semibold text-brand">月薪：{money(employee.base_salary)}</div>
                </div>
              </div>
            );
          })}
          {employees.length === 0 ? <EmptyState title="暫時沒有員工" description="新增員工後會在這裡顯示。" /> : null}
        </div>
      </Card>
    </div>
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
