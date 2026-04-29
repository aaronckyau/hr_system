"use client";

import { useEffect, useState } from "react";

import { Alert, Button, Card, PageHeader } from "@/components/ui";
import { apiFetch, downloadFile } from "@/lib/api";
import type { Employee, SettingOption } from "@/lib/types";

export function ReportsClient() {
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear()));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<SettingOption[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch<Employee[]>("/employees"),
      apiFetch<SettingOption[]>("/settings/options?category=department"),
    ])
      .then(([employeeData, departmentData]) => {
        setEmployees(employeeData);
        setDepartments(departmentData);
      })
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "無法載入報表篩選資料"));
  }, []);

  function reportPath(format: "csv" | "xlsx") {
    const params = new URLSearchParams();
    if (taxYear.trim()) params.set("tax_year", taxYear.trim());
    if (employeeId) params.set("employee_id", employeeId);
    if (department) params.set("department", department);
    const query = params.toString();
    return `/reports/ir56b.${format}${query ? `?${query}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="IR56B 報表"
        description="支援按年度、員工及部門篩選，再匯出 CSV 或 Excel，減少 HR 在 Excel 內二次篩選的錯誤風險。"
      />
      {error ? <Alert>{error}</Alert> : null}
      <Card>
        <div className="grid gap-5 xl:grid-cols-[1fr_220px_220px_220px_auto] xl:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">匯出報表</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">下載後可交由 HR、會計或稅務顧問覆核，再作正式申報用途。年度會按薪資月份篩選，員工及部門可二選一或同時使用。</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">年度</label>
            <input value={taxYear} onChange={(event) => setTaxYear(event.target.value)} inputMode="numeric" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">員工</label>
            <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">全部員工</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} ({employee.employee_no})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">部門</label>
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="">全部部門</option>
              {departments.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => downloadFile(reportPath("csv"), `IR56B-${taxYear}-報表.csv`)}>匯出 CSV</Button>
            <Button variant="secondary" onClick={() => downloadFile(reportPath("xlsx"), `IR56B-${taxYear}-報表.xlsx`)}>匯出 Excel</Button>
          </div>
        </div>
        <div className="mt-5 rounded-[1.25rem] bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-100">
          匯出範圍：{taxYear || "全部年度"} / {employeeId ? "指定員工" : "全部員工"} / {department ? departments.find((item) => item.value === department)?.label ?? department : "全部部門"}。
        </div>
      </Card>
    </div>
  );
}
