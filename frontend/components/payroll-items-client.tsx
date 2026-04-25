"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { DeductionLine, EarningLine, Employee } from "@/lib/types";

type ItemTab = "earnings" | "deductions";

const earningTypeOptions: Array<{ value: EarningLine["earning_type"]; label: string; taxable: boolean; mpf: boolean }> = [
  { value: "commission", label: "佣金", taxable: true, mpf: true },
  { value: "bonus", label: "花紅", taxable: true, mpf: false },
  { value: "reimbursement", label: "報銷", taxable: false, mpf: false },
  { value: "other", label: "其他收入", taxable: true, mpf: false },
];

const deductionTypeOptions: Array<{ value: DeductionLine["deduction_type"]; label: string }> = [
  { value: "absence", label: "缺勤" },
  { value: "late", label: "遲到" },
  { value: "other", label: "其他扣款" },
];

const earningTypeLabels: Record<string, string> = {
  commission: "佣金",
  bonus: "花紅",
  reimbursement: "報銷",
  other: "其他收入",
};

const deductionTypeLabels: Record<string, string> = {
  absence: "缺勤",
  late: "遲到",
  other: "其他扣款",
  unpaid_leave: "無薪假",
};

const sourceLabels: Record<string, string> = {
  manual: "手動輸入",
  derived: "系統計算",
};

function formatCurrency(amount: number) {
  return `HK$${amount.toFixed(2)}`;
}

export function PayrollItemsClient() {
  const [activeTab, setActiveTab] = useState<ItemTab>("earnings");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [earnings, setEarnings] = useState<EarningLine[]>([]);
  const [deductions, setDeductions] = useState<DeductionLine[]>([]);
  const [pageError, setPageError] = useState("");
  const [earningForm, setEarningForm] = useState({
    employee_id: "",
    payroll_month: "2026-04",
    earning_type: "commission" as EarningLine["earning_type"],
    amount: "0",
    description: "",
    is_taxable: true,
    counts_for_mpf: true,
  });
  const [deductionForm, setDeductionForm] = useState({
    employee_id: "",
    payroll_month: "2026-04",
    deduction_type: "other" as DeductionLine["deduction_type"],
    amount: "0",
    reason: "",
  });

  async function loadPageData() {
    const [employeeData, earningData, deductionData] = await Promise.all([
      apiFetch<Employee[]>("/employees"),
      apiFetch<EarningLine[]>(`/payroll/earnings?payroll_month=${encodeURIComponent(earningForm.payroll_month)}`),
      apiFetch<DeductionLine[]>(`/payroll/deductions?payroll_month=${encodeURIComponent(deductionForm.payroll_month)}`),
    ]);
    setEmployees(employeeData);
    setEarnings(earningData);
    setDeductions(deductionData);
  }

  useEffect(() => {
    loadPageData().catch((error) => setPageError(error instanceof Error ? error.message : "無法載入薪資項目資料"));
  }, []);

  async function refreshEarnings(payrollMonth: string) {
    const data = await apiFetch<EarningLine[]>(`/payroll/earnings?payroll_month=${encodeURIComponent(payrollMonth)}`);
    setEarnings(data);
  }

  async function refreshDeductions(payrollMonth: string) {
    const data = await apiFetch<DeductionLine[]>(`/payroll/deductions?payroll_month=${encodeURIComponent(payrollMonth)}`);
    setDeductions(data);
  }

  async function handleAddEarning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError("");
    await apiFetch<EarningLine>("/payroll/earnings", {
      method: "POST",
      body: JSON.stringify({
        employee_id: Number(earningForm.employee_id),
        payroll_month: earningForm.payroll_month,
        earning_type: earningForm.earning_type,
        amount: Number(earningForm.amount),
        description: earningForm.description,
        is_taxable: earningForm.is_taxable,
        counts_for_mpf: earningForm.counts_for_mpf,
      }),
    });
    await apiFetch("/payroll/generate", {
      method: "POST",
      body: JSON.stringify({ payroll_month: earningForm.payroll_month }),
    });
    setEarningForm((current) => ({ ...current, amount: "0", description: "" }));
    await refreshEarnings(earningForm.payroll_month);
  }

  async function handleAddDeduction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError("");
    await apiFetch<DeductionLine>("/payroll/deductions", {
      method: "POST",
      body: JSON.stringify({
        employee_id: Number(deductionForm.employee_id),
        payroll_month: deductionForm.payroll_month,
        deduction_type: deductionForm.deduction_type,
        amount: Number(deductionForm.amount),
        reason: deductionForm.reason,
      }),
    });
    await apiFetch("/payroll/generate", {
      method: "POST",
      body: JSON.stringify({ payroll_month: deductionForm.payroll_month }),
    });
    setDeductionForm((current) => ({ ...current, amount: "0", reason: "" }));
    await refreshDeductions(deductionForm.payroll_month);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold">薪資項目</h1>
        <p className="mt-2 text-sm text-slate-500">這裡專門維護會影響跑薪結果的輸入資料，包括收入項目與扣款項目。薪資計算結果請回到「薪資」頁查看。</p>
        <div className="mt-4 flex gap-2">
          <button
            className={activeTab === "earnings" ? "bg-brand text-white" : "bg-slate-100 text-slate-700"}
            onClick={() => setActiveTab("earnings")}
            type="button"
          >
            收入項目
          </button>
          <button
            className={activeTab === "deductions" ? "bg-brand text-white" : "bg-slate-100 text-slate-700"}
            onClick={() => setActiveTab("deductions")}
            type="button"
          >
            扣款項目
          </button>
        </div>
      </section>

      {pageError ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{pageError}</div> : null}

      {activeTab === "earnings" ? (
        <>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">收入項目</h2>
            <p className="mt-2 text-sm text-slate-500">可在此加入佣金、花紅、報銷與其他收入，並標示是否應課稅及是否納入 MPF。</p>
            <form className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={handleAddEarning}>
              <div>
                <label className="mb-1 block text-sm font-medium">員工</label>
                <select value={earningForm.employee_id} onChange={(event) => setEarningForm((current) => ({ ...current, employee_id: event.target.value }))}>
                  <option value="">請選擇</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">薪資月份</label>
                <input
                  value={earningForm.payroll_month}
                  onChange={async (event) => {
                    const nextMonth = event.target.value;
                    setEarningForm((current) => ({ ...current, payroll_month: nextMonth }));
                    await refreshEarnings(nextMonth);
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">收入類型</label>
                <select
                  value={earningForm.earning_type}
                  onChange={(event) => {
                    const option = earningTypeOptions.find((item) => item.value === event.target.value)!;
                    setEarningForm((current) => ({
                      ...current,
                      earning_type: option.value,
                      is_taxable: option.taxable,
                      counts_for_mpf: option.mpf,
                    }));
                  }}
                >
                  {earningTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">金額</label>
                <input type="number" min="0" step="0.01" value={earningForm.amount} onChange={(event) => setEarningForm((current) => ({ ...current, amount: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">稅務分類</label>
                <select value={earningForm.is_taxable ? "yes" : "no"} onChange={(event) => setEarningForm((current) => ({ ...current, is_taxable: event.target.value === "yes" }))}>
                  <option value="yes">應課稅</option>
                  <option value="no">非應課稅</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">是否納入 MPF</label>
                <select value={earningForm.counts_for_mpf ? "yes" : "no"} onChange={(event) => setEarningForm((current) => ({ ...current, counts_for_mpf: event.target.value === "yes" }))}>
                  <option value="yes">是</option>
                  <option value="no">否</option>
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="mb-1 block text-sm font-medium">說明</label>
                <input value={earningForm.description} onChange={(event) => setEarningForm((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <button className="bg-brand text-white" type="submit">
                  新增收入
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">收入記錄</h2>
              <div className="text-sm text-slate-500">月份：{earningForm.payroll_month}</div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2">員工</th>
                    <th className="py-2">類型</th>
                    <th className="py-2">金額</th>
                    <th className="py-2">稅務分類</th>
                    <th className="py-2">MPF</th>
                    <th className="py-2">來源</th>
                    <th className="py-2">說明</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((item, index) => {
                    const employee = employees.find((entry) => entry.id === item.employee_id);
                    return (
                      <tr key={`${item.id ?? index}-${item.employee_id}`} className="border-b border-slate-100">
                        <td className="py-3">{employee?.full_name ?? `#${item.employee_id}`}</td>
                        <td>{earningTypeLabels[item.earning_type] ?? item.earning_type}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td>{item.is_taxable ? "應課稅" : "非應課稅"}</td>
                        <td>{item.counts_for_mpf ? "納入" : "不納入"}</td>
                        <td>{sourceLabels[item.source] ?? item.source}</td>
                        <td>{item.description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">扣款項目</h2>
            <p className="mt-2 text-sm text-slate-500">支援缺勤、遲到與其他手動扣款。無薪假會由請假記錄自動帶入，不需在這裡重複輸入。</p>
            <form className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={handleAddDeduction}>
              <div>
                <label className="mb-1 block text-sm font-medium">員工</label>
                <select value={deductionForm.employee_id} onChange={(event) => setDeductionForm((current) => ({ ...current, employee_id: event.target.value }))}>
                  <option value="">請選擇</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">薪資月份</label>
                <input
                  value={deductionForm.payroll_month}
                  onChange={async (event) => {
                    const nextMonth = event.target.value;
                    setDeductionForm((current) => ({ ...current, payroll_month: nextMonth }));
                    await refreshDeductions(nextMonth);
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">扣款類型</label>
                <select value={deductionForm.deduction_type} onChange={(event) => setDeductionForm((current) => ({ ...current, deduction_type: event.target.value as DeductionLine["deduction_type"] }))}>
                  {deductionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">金額</label>
                <input type="number" min="0" step="0.01" value={deductionForm.amount} onChange={(event) => setDeductionForm((current) => ({ ...current, amount: event.target.value }))} />
              </div>
              <div className="md:col-span-2 lg:col-span-2">
                <label className="mb-1 block text-sm font-medium">原因</label>
                <input value={deductionForm.reason} onChange={(event) => setDeductionForm((current) => ({ ...current, reason: event.target.value }))} />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <button className="bg-brand text-white" type="submit">
                  新增扣款
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">扣款記錄</h2>
              <div className="text-sm text-slate-500">月份：{deductionForm.payroll_month}</div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2">員工</th>
                    <th className="py-2">類型</th>
                    <th className="py-2">金額</th>
                    <th className="py-2">來源</th>
                    <th className="py-2">原因</th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.map((item, index) => {
                    const employee = employees.find((entry) => entry.id === item.employee_id);
                    return (
                      <tr key={`${item.id ?? index}-${item.employee_id}`} className="border-b border-slate-100">
                        <td className="py-3">{employee?.full_name ?? `#${item.employee_id}`}</td>
                        <td>{deductionTypeLabels[item.deduction_type] ?? item.deduction_type}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td>{sourceLabels[item.source] ?? item.source}</td>
                        <td>{item.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
