"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button, Card, PageHeader } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Employee, ResetEmployeePasswordResult, SettingOption, User } from "@/lib/types";

const roleOptions = [
  { value: "employee", label: "員工" },
  { value: "manager", label: "主管" },
  { value: "hr", label: "人事" },
  { value: "admin", label: "管理員" },
];

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
      <PageHeader eyebrow="HR Master Data" title="員工資料管理" description="可設定員工狀態、直屬主管、部門、職位、工作地點及合約類型。下拉選項來自公司設定。" />

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{error}</div> : null}

      {canResetPassword ? (
        <Card>
          <h2 className="text-xl font-black text-slate-950">員工密碼重設</h2>
          <form className="mt-4 flex flex-col gap-3 md:flex-row" onSubmit={handleResetPassword}>
            <select className="md:max-w-sm" value={resetEmployeeId} onChange={(event) => setResetEmployeeId(event.target.value)}>
              <option value="">請選擇員工</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} ({employee.employee_no})
                </option>
              ))}
            </select>
            <Button type="submit">重設為臨時密碼</Button>
          </form>
          {resetResult ? (
            <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <div className="font-medium">{resetResult.employee_name} 的臨時密碼</div>
              <div className="mt-2 font-mono text-base">{resetResult.temporary_password}</div>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <h2 className="text-xl font-black text-slate-950">新增員工</h2>
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-bold">電郵</label>
            <input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">姓名</label>
            <input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">角色</label>
            <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">直屬主管</label>
            <select value={form.manager_user_id} onChange={(event) => setForm((current) => ({ ...current, manager_user_id: event.target.value }))}>
              <option value="">未指定</option>
              {managerOptions.map((employee) => (
                <option key={employee.id} value={employee.user_id ?? ""}>
                  {employee.full_name} ({employee.employee_no})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">員工編號</label>
            <input value={form.employee_no} onChange={(event) => setForm((current) => ({ ...current, employee_no: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">HKID / 護照</label>
            <input value={form.hk_id} onChange={(event) => setForm((current) => ({ ...current, hk_id: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">部門</label>
            {renderOptionSelect("department", "department", "請選擇部門")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">職位</label>
            {renderOptionSelect("job_title", "position", "請選擇職位")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">入職日期</label>
            <input type="date" value={form.employment_start_date} onChange={(event) => setForm((current) => ({ ...current, employment_start_date: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">離職日期</label>
            <input type="date" value={form.employment_end_date} onChange={(event) => setForm((current) => ({ ...current, employment_end_date: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">合約類型</label>
            {renderOptionSelect("employment_type", "employment_type", "請選擇合約類型")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">員工狀態</label>
            {renderOptionSelect("employment_status", "employment_status", "請選擇員工狀態")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">工作地點</label>
            {renderOptionSelect("work_location", "work_location", "請選擇工作地點")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">銀行</label>
            {renderOptionSelect("bank_name", "bank", "請選擇銀行")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">電話</label>
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">銀行戶口</label>
            <input value={form.bank_account_no} onChange={(event) => setForm((current) => ({ ...current, bank_account_no: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">年假餘額</label>
            <input type="number" value={form.annual_leave_balance} onChange={(event) => setForm((current) => ({ ...current, annual_leave_balance: Number(event.target.value) }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">基本月薪</label>
            <input type="number" value={form.base_salary} onChange={(event) => setForm((current) => ({ ...current, base_salary: Number(event.target.value) }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">津貼</label>
            <input type="number" value={form.allowances} onChange={(event) => setForm((current) => ({ ...current, allowances: Number(event.target.value) }))} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold">地址</label>
            <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">新增員工</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-slate-950">員工列表</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                <th className="px-3 py-3">姓名</th>
                <th className="px-3 py-3">編號</th>
                <th className="px-3 py-3">狀態</th>
                <th className="px-3 py-3">部門</th>
                <th className="px-3 py-3">職位</th>
                <th className="px-3 py-3">主管</th>
                <th className="px-3 py-3">月薪</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const manager = employees.find((item) => item.user_id === employee.manager_user_id);
                return (
                  <tr key={employee.id} className="border-t border-slate-100">
                    <td className="px-3 py-4 font-semibold">{employee.full_name}</td>
                    <td className="px-3 py-4">{employee.employee_no}</td>
                    <td className="px-3 py-4">{employee.employment_status}</td>
                    <td className="px-3 py-4">{employee.department}</td>
                    <td className="px-3 py-4">{employee.job_title}</td>
                    <td className="px-3 py-4">{manager?.full_name ?? "-"}</td>
                    <td className="px-3 py-4">HK${employee.base_salary.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
