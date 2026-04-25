"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { Employee, ResetEmployeePasswordResult, User } from "@/lib/types";

const roleOptions = [
  { value: "employee", label: "員工" },
  { value: "hr", label: "人事" },
  { value: "admin", label: "管理員" },
];

const employmentTypeOptions = [
  { value: "full_time", label: "全職" },
  { value: "part_time", label: "兼職" },
  { value: "contract", label: "合約" },
];

const departmentOptions = [
  { value: "HR", label: "人事部" },
  { value: "Finance", label: "財務部" },
  { value: "Operations", label: "營運部" },
  { value: "Sales", label: "銷售部" },
  { value: "IT", label: "資訊科技部" },
];

const bankOptions = [
  { value: "", label: "請選擇銀行" },
  { value: "HSBC", label: "匯豐" },
  { value: "Hang Seng", label: "恒生" },
  { value: "BOC Hong Kong", label: "中銀香港" },
  { value: "Standard Chartered", label: "渣打" },
  { value: "DBS", label: "星展" },
];

const fieldLabels: Record<string, string> = {
  email: "電郵",
  full_name: "姓名",
  role: "角色",
  employee_no: "員工編號",
  hk_id: "香港身份證",
  tax_file_no: "稅務檔案號碼",
  department: "部門",
  job_title: "職位",
  employment_start_date: "入職日期",
  employment_type: "僱傭類型",
  phone: "電話",
  address: "地址",
  annual_leave_balance: "年假餘額",
  base_salary: "基本月薪",
  allowances: "津貼",
  bank_name: "銀行",
  bank_account_no: "銀行戶口號碼",
};

const initialForm = {
  email: "",
  full_name: "",
  role: "employee",
  employee_no: "",
  hk_id: "",
  tax_file_no: "",
  department: "",
  job_title: "",
  employment_start_date: "",
  employment_type: "full_time",
  phone: "",
  address: "",
  annual_leave_balance: 14,
  base_salary: 0,
  allowances: 0,
  bank_name: "",
  bank_account_no: "",
};

export function EmployeesClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [resetEmployeeId, setResetEmployeeId] = useState("");
  const [resetResult, setResetResult] = useState<ResetEmployeePasswordResult | null>(null);
  const [resetError, setResetError] = useState("");

  async function loadEmployees() {
    const data = await apiFetch<Employee[]>("/employees");
    setEmployees(data);
  }

  useEffect(() => {
    loadEmployees();
    apiFetch<User>("/auth/me").then(setCurrentUser).catch(() => null);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await apiFetch<Employee>("/employees", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          annual_leave_balance: Number(form.annual_leave_balance),
          base_salary: Number(form.base_salary),
          allowances: Number(form.allowances),
        }),
      });
      setForm(initialForm);
      await loadEmployees();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "建立失敗");
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetError("");
    setResetResult(null);
    try {
      const result = await apiFetch<ResetEmployeePasswordResult>("/auth/reset-employee-password", {
        method: "POST",
        body: JSON.stringify({ employee_id: Number(resetEmployeeId) }),
      });
      setResetResult(result);
    } catch (submissionError) {
      setResetError(submissionError instanceof Error ? submissionError.message : "重設密碼失敗");
    }
  }

  const canResetPassword = currentUser?.role === "admin" || currentUser?.role === "hr";

  return (
    <div className="space-y-6">
      {canResetPassword ? (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-semibold">員工密碼重設</h1>
          <p className="mt-2 text-sm text-slate-500">系統會產生一次性臨時密碼。發送給員工後，應要求對方首次登入後立即修改。</p>
          <form className="mt-4 flex flex-col gap-3 md:flex-row" onSubmit={handleResetPassword}>
            <select className="md:max-w-sm" value={resetEmployeeId} onChange={(event) => setResetEmployeeId(event.target.value)}>
              <option value="">請選擇員工</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} ({employee.employee_no})
                </option>
              ))}
            </select>
            <button className="bg-slate-900 text-white" type="submit">
              重設為臨時密碼
            </button>
          </form>
          {resetError ? <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{resetError}</div> : null}
          {resetResult ? (
            <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <div className="font-medium">{resetResult.employee_name} 的臨時密碼</div>
              <div className="mt-2 font-mono text-base">{resetResult.temporary_password}</div>
              <div className="mt-2 text-amber-800">此密碼只會在重設完成後顯示一次。</div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold">員工資料管理</h1>
        <p className="mt-2 text-sm text-slate-500">系統會自動產生員工初始密碼，此頁不會顯示或輸入密碼。</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          {Object.entries(form).map(([key, value]) => (
            <div key={key} className={key === "address" ? "md:col-span-2" : ""}>
              <label className="mb-1 block text-sm font-medium">{fieldLabels[key] ?? key}</label>
              {key === "role" ? (
                <select value={value} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : key === "employment_type" ? (
                <select value={value} onChange={(event) => setForm((current) => ({ ...current, employment_type: event.target.value }))}>
                  {employmentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : key === "department" ? (
                <select value={value} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}>
                  <option value="">請選擇部門</option>
                  {departmentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : key === "bank_name" ? (
                <select value={value} onChange={(event) => setForm((current) => ({ ...current, bank_name: event.target.value }))}>
                  {bankOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={["base_salary", "allowances", "annual_leave_balance"].includes(key) ? "number" : key.includes("date") ? "date" : "text"}
                  value={value}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                />
              )}
            </div>
          ))}
          {error ? <div className="md:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
          <div className="md:col-span-2">
            <button className="bg-brand text-white" type="submit">
              新增員工
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">員工列表</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">姓名</th>
                <th className="py-2">員工編號</th>
                <th className="py-2">部門</th>
                <th className="py-2">職位</th>
                <th className="py-2">月薪</th>
                {canResetPassword ? <th className="py-2">操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b border-slate-100">
                  <td className="py-3">{employee.full_name}</td>
                  <td>{employee.employee_no}</td>
                  <td>{employee.department}</td>
                  <td>{employee.job_title}</td>
                  <td>HK${employee.base_salary.toFixed(2)}</td>
                  {canResetPassword ? (
                    <td>
                      <button
                        className="bg-slate-100 text-slate-700"
                        onClick={() => {
                          setResetEmployeeId(String(employee.id));
                          setResetError("");
                          setResetResult(null);
                        }}
                        type="button"
                      >
                        選取重設
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
