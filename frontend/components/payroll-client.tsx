"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiFetch, downloadFile } from "@/lib/api";
import type { Employee, FinalPayRecord, PayrollConfig, PayrollDetail, PayrollRecord } from "@/lib/types";
import { Button } from "@/components/ui";

function formatCurrency(amount: number) {
  return `HK$${amount.toFixed(2)}`;
}

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

export function PayrollClient() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [finalPays, setFinalPays] = useState<FinalPayRecord[]>([]);
  const [config, setConfig] = useState<PayrollConfig>({
    daily_salary_divisor: 30,
    mpf_rate: 0.05,
    mpf_cap: 1500,
    min_relevant_income: 7100,
    max_relevant_income: 30000,
    new_employee_mpf_exempt_days: 30,
  });
  const [payrollMonth, setPayrollMonth] = useState("2026-04");
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [pageError, setPageError] = useState("");
  const [finalPayForm, setFinalPayForm] = useState({
    employee_id: "",
    payroll_month: "2026-04",
    termination_date: "",
    unpaid_salary: "0",
    unused_leave_days: "0",
    payment_in_lieu_days: "0",
    notes: "",
  });

  async function loadPageData() {
    const [payrollData, employeeData, configData, finalPayData] = await Promise.all([
      apiFetch<PayrollRecord[]>("/payroll"),
      apiFetch<Employee[]>("/employees"),
      apiFetch<PayrollConfig>("/payroll/config"),
      apiFetch<FinalPayRecord[]>("/payroll/final-pay"),
    ]);
    setRecords(payrollData);
    setEmployees(employeeData);
    setConfig(configData);
    setFinalPays(finalPayData);
  }

  useEffect(() => {
    loadPageData().catch((error) => setPageError(error instanceof Error ? error.message : "無法載入薪資頁資料"));
  }, []);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError("");
    await apiFetch<PayrollRecord[]>("/payroll/generate", {
      method: "POST",
      body: JSON.stringify({ payroll_month: payrollMonth }),
    });
    await loadPageData();
  }

  async function handleSaveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError("");
    await apiFetch<PayrollConfig>("/payroll/config", {
      method: "PUT",
      body: JSON.stringify({
        daily_salary_divisor: Number(config.daily_salary_divisor),
        mpf_rate: Number(config.mpf_rate),
        mpf_cap: Number(config.mpf_cap),
        min_relevant_income: Number(config.min_relevant_income),
        max_relevant_income: Number(config.max_relevant_income),
        new_employee_mpf_exempt_days: Number(config.new_employee_mpf_exempt_days),
      }),
    });
    await loadPageData();
  }

  async function handleCreateFinalPay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError("");
    await apiFetch<FinalPayRecord>("/payroll/final-pay", {
      method: "POST",
      body: JSON.stringify({
        employee_id: Number(finalPayForm.employee_id),
        payroll_month: finalPayForm.payroll_month,
        termination_date: finalPayForm.termination_date,
        unpaid_salary: Number(finalPayForm.unpaid_salary),
        unused_leave_days: Number(finalPayForm.unused_leave_days),
        payment_in_lieu_days: Number(finalPayForm.payment_in_lieu_days),
        notes: finalPayForm.notes,
      }),
    });
    setFinalPayForm((current) => ({
      ...current,
      unpaid_salary: "0",
      unused_leave_days: "0",
      payment_in_lieu_days: "0",
      notes: "",
    }));
    await loadPageData();
  }

  async function openPayrollDetail(payrollId: number) {
    setDetailError("");
    try {
      const detail = await apiFetch<PayrollDetail>(`/payroll/${payrollId}`);
      setSelectedPayroll(detail);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "無法載入薪資明細");
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-xl font-semibold">薪資與 MPF</h1>
          <p className="mt-2 text-sm text-slate-500">這裡只保留薪資計算、規則設定、離職結算與薪資結果。收入項目與扣款項目已移到「薪資項目」頁。</p>
          <form className="mt-4 flex flex-col gap-3 md:flex-row" onSubmit={handleGenerate}>
            <input className="md:max-w-xs" value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} placeholder="YYYY-MM" />
            <button className="bg-brand text-white" type="submit">
              生成薪資
            </button>
          </form>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold">薪資規則設定</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSaveConfig}>
            <div>
              <label className="mb-1 block text-sm font-medium">日薪除數</label>
              <input type="number" value={config.daily_salary_divisor} onChange={(event) => setConfig((current) => ({ ...current, daily_salary_divisor: Number(event.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">MPF 比率</label>
              <input type="number" step="0.001" value={config.mpf_rate} onChange={(event) => setConfig((current) => ({ ...current, mpf_rate: Number(event.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">MPF 上限</label>
              <input type="number" step="0.01" value={config.mpf_cap} onChange={(event) => setConfig((current) => ({ ...current, mpf_cap: Number(event.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">最低有關入息</label>
              <input type="number" step="0.01" value={config.min_relevant_income} onChange={(event) => setConfig((current) => ({ ...current, min_relevant_income: Number(event.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">最高有關入息</label>
              <input type="number" step="0.01" value={config.max_relevant_income} onChange={(event) => setConfig((current) => ({ ...current, max_relevant_income: Number(event.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">新員工僱員 MPF 豁免日數</label>
              <input type="number" value={config.new_employee_mpf_exempt_days} onChange={(event) => setConfig((current) => ({ ...current, new_employee_mpf_exempt_days: Number(event.target.value) }))} />
            </div>
            <div className="md:col-span-2">
              <button className="bg-slate-900 text-white" type="submit">
                儲存規則
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">離職結算</h2>
        <p className="mt-2 text-sm text-slate-500">第一版包含未發薪金、未放年假折現及代通知金，金額按目前日薪除數計算。</p>
        <form className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3" onSubmit={handleCreateFinalPay}>
          <div>
            <label className="mb-1 block text-sm font-medium">員工</label>
            <select value={finalPayForm.employee_id} onChange={(event) => setFinalPayForm((current) => ({ ...current, employee_id: event.target.value }))}>
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
            <input value={finalPayForm.payroll_month} onChange={(event) => setFinalPayForm((current) => ({ ...current, payroll_month: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">離職日期</label>
            <input type="date" value={finalPayForm.termination_date} onChange={(event) => setFinalPayForm((current) => ({ ...current, termination_date: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">未發薪金</label>
            <input type="number" min="0" step="0.01" value={finalPayForm.unpaid_salary} onChange={(event) => setFinalPayForm((current) => ({ ...current, unpaid_salary: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">未放年假天數</label>
            <input type="number" min="0" step="0.5" value={finalPayForm.unused_leave_days} onChange={(event) => setFinalPayForm((current) => ({ ...current, unused_leave_days: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">代通知金天數</label>
            <input type="number" min="0" step="0.5" value={finalPayForm.payment_in_lieu_days} onChange={(event) => setFinalPayForm((current) => ({ ...current, payment_in_lieu_days: event.target.value }))} />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-sm font-medium">備註</label>
            <input value={finalPayForm.notes} onChange={(event) => setFinalPayForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <button className="bg-brand text-white" type="submit">
              建立離職結算
            </button>
          </div>
        </form>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">員工</th>
                <th className="py-2">離職日期</th>
                <th className="py-2">未發薪金</th>
                <th className="py-2">年假折現</th>
                <th className="py-2">代通知金</th>
                <th className="py-2">離職結算淨額</th>
              </tr>
            </thead>
            <tbody>
              {finalPays.map((record) => (
                <tr key={record.id} className="border-b border-slate-100">
                  <td className="py-3">{record.employee_name}</td>
                  <td>{record.termination_date}</td>
                  <td>{formatCurrency(record.unpaid_salary)}</td>
                  <td>{formatCurrency(record.annual_leave_payout)}</td>
                  <td>{formatCurrency(record.payment_in_lieu)}</td>
                  <td>{formatCurrency(record.net_final_pay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 text-sm text-slate-500">點擊任何一筆薪資記錄即可查看詳細計算。</div>
        {pageError ? <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{pageError}</div> : null}
        {detailError ? <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{detailError}</div> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">員工</th>
                <th className="py-2">月份</th>
                <th className="py-2">總收入</th>
                <th className="py-2">有關入息</th>
                <th className="py-2">僱員 MPF</th>
                <th className="py-2">淨薪</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50" onClick={() => openPayrollDetail(record.id)}>
                  <td className="py-3">{record.employee_name}</td>
                  <td>{record.payroll_month}</td>
                  <td>{formatCurrency(record.gross_income)}</td>
                  <td>{formatCurrency(record.relevant_income)}</td>
                  <td>{formatCurrency(record.employee_mpf)}</td>
                  <td>{formatCurrency(record.net_salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedPayroll ? (
        <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm" onClick={() => setSelectedPayroll(null)}>
          <aside className="absolute bottom-0 right-0 h-[94dvh] w-full overflow-y-auto rounded-t-[2rem] bg-[#fbfcf8] p-4 shadow-[-24px_0_80px_rgb(15_23_42/0.18)] md:top-0 md:h-full md:max-w-6xl md:rounded-none md:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 -mx-4 -mt-4 flex flex-col gap-4 border-b border-slate-200 bg-[#fbfcf8]/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-start sm:justify-between md:-mx-6 md:-mt-6 md:px-6 md:py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">薪資明細</div>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 md:text-3xl">{selectedPayroll.employee_name}</h2>
                <div className="mt-1 text-sm text-slate-500">
                  {selectedPayroll.department} / {selectedPayroll.job_title} / {selectedPayroll.payroll_month}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <Button
                  className="w-full sm:w-auto"
                  variant="secondary"
                  onClick={() => downloadFile(`/reports/payslip/${selectedPayroll.id}`, `薪資單-${selectedPayroll.employee_name}-${selectedPayroll.payroll_month}.html`)}
                  type="button"
                >
                  下載薪資單
                </Button>
                <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setSelectedPayroll(null)} type="button">
                  關閉
                </Button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-500">總收入</div>
                <div className="mt-2 text-2xl font-semibold">{formatCurrency(selectedPayroll.gross_income)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-500">應課稅 / 非應課稅</div>
                <div className="mt-2 text-lg font-semibold">{formatCurrency(selectedPayroll.taxable_income)} / {formatCurrency(selectedPayroll.non_taxable_income)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-500">扣款總額</div>
                <div className="mt-2 text-2xl font-semibold">{formatCurrency(selectedPayroll.deductions)}</div>
                <div className="mt-2 text-sm text-slate-500">
                  無薪假 {selectedPayroll.unpaid_leave_days} 天 / 日薪 {formatCurrency(selectedPayroll.daily_rate)} / 除數 {selectedPayroll.daily_salary_divisor}
                </div>
              </div>
              <div className="rounded-2xl bg-brand p-4 text-white">
                <div className="text-sm font-medium text-white/80">淨薪</div>
                <div className="mt-2 text-2xl font-semibold">{formatCurrency(selectedPayroll.net_salary)}</div>
                <div className="mt-2 text-sm text-white/80">
                  {selectedPayroll.employee_mpf_exempt ? selectedPayroll.employee_mpf_exempt_reason : "套用標準 MPF 規則"}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3 font-semibold">收入拆解</div>
                <div className="space-y-3 px-4 py-4 text-sm">
                  {selectedPayroll.earnings_breakdown.map((item, index) => (
                    <div key={`${item.source}-${item.id ?? index}`} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <span className="font-medium text-slate-700">{item.description}</span>
                        <span className="font-semibold">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="mt-1 text-slate-500">
                        {(earningTypeLabels[item.earning_type] ?? item.earning_type)} / {item.is_taxable ? "應課稅" : "非應課稅"} / {item.counts_for_mpf ? "納入 MPF" : "不納入 MPF"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3 font-semibold">扣款拆解</div>
                <div className="space-y-3 px-4 py-4 text-sm">
                  {selectedPayroll.deductions_breakdown.length === 0 ? (
                    <div className="text-slate-500">沒有扣款項目。</div>
                  ) : (
                    selectedPayroll.deductions_breakdown.map((item, index) => (
                      <div key={`${item.source}-${item.id ?? index}`} className="rounded-xl bg-slate-50 p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <span className="font-medium text-slate-700">{deductionTypeLabels[item.deduction_type] ?? item.deduction_type}</span>
                          <span className="font-semibold">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="mt-1 text-slate-500">{item.reason}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.15em] text-slate-400">{sourceLabels[item.source] ?? item.source}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3 font-semibold">計算公式</div>
              <div className="space-y-3 px-4 py-4 text-sm">
                <div className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                  <span className="font-medium text-slate-600">有關入息</span>
                  <span>{selectedPayroll.relevant_income_formula}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                  <span className="font-medium text-slate-600">僱員 MPF</span>
                  <span>{selectedPayroll.employee_mpf_formula}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                  <span className="font-medium text-slate-600">僱主 MPF</span>
                  <span>{selectedPayroll.employer_mpf_formula}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                  <span className="font-medium text-slate-600">淨薪</span>
                  <span>{selectedPayroll.net_salary_formula}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
