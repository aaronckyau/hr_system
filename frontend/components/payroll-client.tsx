"use client";

import { FormEvent, useEffect, useState } from "react";

import { Alert, Button, Card, EmptyState, PageHeader, SlideOver, StatCard } from "@/components/ui";
import { apiFetch, downloadFile } from "@/lib/api";
import type { Employee, FinalPayRecord, PayrollConfig, PayrollDetail, PayrollRecord } from "@/lib/types";

function money(amount: number) {
  return `HK$${amount.toFixed(2)}`;
}

function displayPayrollText(value?: string | null) {
  const translations: Record<string, string> = {
    "Production demo commission": "示範佣金",
    "Production demo late deduction": "示範遲到扣款",
    "Production demo 佣金": "示範佣金",
    "Production demo 遲到扣款": "示範遲到扣款",
  };
  return value ? translations[value] ?? value : "";
}

function currentPayrollMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isFuturePayrollMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month) && month > currentPayrollMonth();
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
  const [payrollMonth, setPayrollMonth] = useState(currentPayrollMonth());
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [pageError, setPageError] = useState("");
  const [finalPayForm, setFinalPayForm] = useState({
    employee_id: "",
    payroll_month: currentPayrollMonth(),
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
    await apiFetch<PayrollRecord[]>("/payroll/generate", { method: "POST", body: JSON.stringify({ payroll_month: payrollMonth }) });
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
    setFinalPayForm((current) => ({ ...current, unpaid_salary: "0", unused_leave_days: "0", payment_in_lieu_days: "0", notes: "" }));
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

  const totalNet = records.reduce((sum, record) => sum + record.net_salary, 0);
  const totalMpf = records.reduce((sum, record) => sum + record.employee_mpf + record.employer_mpf, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll / MPF"
        title="薪資與 MPF"
        description="保留薪資計算、MPF 規則、離職結算與糧單明細。收入項目與扣款項目已移到「薪資項目」頁。"
      />

      {pageError ? <Alert>{pageError}</Alert> : null}
      {detailError ? <Alert>{detailError}</Alert> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="薪資記錄" value={records.length} />
        <StatCard label="淨薪合計" value={money(totalNet)} tone="brand" />
        <StatCard label="MPF 合計" value={money(totalMpf)} />
        <StatCard label="離職結算" value={finalPays.length} tone="warm" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">產生薪資</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">選擇薪資月份後，系統會按目前員工資料、請假、收入項目、扣款項目與 MPF 規則重新計算。</p>
          <form className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" onSubmit={handleGenerate}>
            <input value={payrollMonth} onChange={(event) => setPayrollMonth(event.target.value)} placeholder="YYYY-MM" />
            <Button type="submit">生成薪資</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">薪資規則</h2>
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={handleSaveConfig}>
            <Field label="日薪除數">
              <input type="number" value={config.daily_salary_divisor} onChange={(event) => setConfig((current) => ({ ...current, daily_salary_divisor: Number(event.target.value) }))} />
            </Field>
            <Field label="MPF 比率">
              <input type="number" step="0.001" value={config.mpf_rate} onChange={(event) => setConfig((current) => ({ ...current, mpf_rate: Number(event.target.value) }))} />
            </Field>
            <Field label="MPF 上限">
              <input type="number" step="0.01" value={config.mpf_cap} onChange={(event) => setConfig((current) => ({ ...current, mpf_cap: Number(event.target.value) }))} />
            </Field>
            <Field label="最低有關入息">
              <input type="number" step="0.01" value={config.min_relevant_income} onChange={(event) => setConfig((current) => ({ ...current, min_relevant_income: Number(event.target.value) }))} />
            </Field>
            <Field label="最高有關入息">
              <input type="number" step="0.01" value={config.max_relevant_income} onChange={(event) => setConfig((current) => ({ ...current, max_relevant_income: Number(event.target.value) }))} />
            </Field>
            <Field label="新員工 MPF 豁免日數">
              <input type="number" value={config.new_employee_mpf_exempt_days} onChange={(event) => setConfig((current) => ({ ...current, new_employee_mpf_exempt_days: Number(event.target.value) }))} />
            </Field>
            <div className="sm:col-span-2">
              <Button className="w-full sm:w-auto" variant="secondary" type="submit">儲存規則</Button>
            </div>
          </form>
        </Card>
      </section>

      <Card>
        <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">離職結算</h2>
        <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleCreateFinalPay}>
          <Field label="員工">
            <select value={finalPayForm.employee_id} onChange={(event) => setFinalPayForm((current) => ({ ...current, employee_id: event.target.value }))}>
              <option value="">請選擇</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.full_name} ({employee.employee_no})</option>
              ))}
            </select>
          </Field>
          <Field label="薪資月份">
            <input value={finalPayForm.payroll_month} onChange={(event) => setFinalPayForm((current) => ({ ...current, payroll_month: event.target.value }))} />
          </Field>
          <Field label="離職日期">
            <input type="date" value={finalPayForm.termination_date} onChange={(event) => setFinalPayForm((current) => ({ ...current, termination_date: event.target.value }))} />
          </Field>
          <Field label="未發薪金">
            <input type="number" min="0" step="0.01" value={finalPayForm.unpaid_salary} onChange={(event) => setFinalPayForm((current) => ({ ...current, unpaid_salary: event.target.value }))} />
          </Field>
          <Field label="未放年假天數">
            <input type="number" min="0" step="0.5" value={finalPayForm.unused_leave_days} onChange={(event) => setFinalPayForm((current) => ({ ...current, unused_leave_days: event.target.value }))} />
          </Field>
          <Field label="代通知金天數">
            <input type="number" min="0" step="0.5" value={finalPayForm.payment_in_lieu_days} onChange={(event) => setFinalPayForm((current) => ({ ...current, payment_in_lieu_days: event.target.value }))} />
          </Field>
          <div className="md:col-span-2 xl:col-span-3">
            <Field label="備註">
              <input value={finalPayForm.notes} onChange={(event) => setFinalPayForm((current) => ({ ...current, notes: event.target.value }))} />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <Button className="w-full sm:w-auto" type="submit">建立離職結算</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">薪資記錄</h2>
            <p className="mt-1 text-sm text-slate-500">點擊任何一筆薪資記錄可查看詳細計算。</p>
          </div>
        </div>
        <div className="mt-5 hidden overflow-x-auto lg:block">
          <table className="responsive-table min-w-full">
            <thead>
              <tr>
                <th>員工</th>
                <th>月份</th>
                <th>總收入</th>
                <th>有關入息</th>
                <th>僱員 MPF</th>
                <th>僱主 MPF</th>
                <th>淨薪</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="cursor-pointer transition hover:bg-slate-50" onClick={() => openPayrollDetail(record.id)}>
                  <td className="font-semibold text-slate-950">{record.employee_name}</td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{record.payroll_month}</span>
                      {isFuturePayrollMonth(record.payroll_month) ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">預生成月份</span>
                      ) : null}
                    </div>
                  </td>
                  <td>{money(record.gross_income)}</td>
                  <td>{money(record.relevant_income)}</td>
                  <td>{money(record.employee_mpf)}</td>
                  <td>{money(record.employer_mpf)}</td>
                  <td className="font-semibold text-brand">{money(record.net_salary)}</td>
                  <td>
                    <Button
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        openPayrollDetail(record.id);
                      }}
                      type="button"
                    >
                      查看明細
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 lg:hidden">
          {records.map((record) => (
            <button key={record.id} className="rounded-[1.25rem] bg-slate-50 p-4 text-left ring-1 ring-slate-100" onClick={() => openPayrollDetail(record.id)} type="button">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-950">{record.employee_name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span>{record.payroll_month}</span>
                    {isFuturePayrollMonth(record.payroll_month) ? (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">預生成月份</span>
                    ) : null}
                  </div>
                </div>
                <div className="font-semibold text-brand">{money(record.net_salary)}</div>
              </div>
              <div className="mt-3 text-sm font-semibold text-brand">點擊查看明細</div>
              <div className="mt-3 grid gap-1 text-sm text-slate-600">
                <div>總收入：{money(record.gross_income)}</div>
                <div>僱員 MPF：{money(record.employee_mpf)}</div>
                <div>僱主 MPF：{money(record.employer_mpf)}</div>
              </div>
            </button>
          ))}
          {records.length === 0 ? <EmptyState title="暫時沒有薪資記錄" description="生成薪資後會在這裡顯示。" /> : null}
        </div>
      </Card>

      <PayrollDetailDrawer selectedPayroll={selectedPayroll} onClose={() => setSelectedPayroll(null)} />
    </div>
  );
}

function PayrollDetailDrawer({ selectedPayroll, onClose }: { selectedPayroll: PayrollDetail | null; onClose: () => void }) {
  return (
    <SlideOver
      open={Boolean(selectedPayroll)}
      title={selectedPayroll ? `${selectedPayroll.employee_name} 薪資明細` : "薪資明細"}
      description={selectedPayroll ? `${selectedPayroll.department} / ${selectedPayroll.job_title} / ${selectedPayroll.payroll_month}` : undefined}
      onClose={onClose}
      footer={
        selectedPayroll ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="ghost" onClick={onClose}>關閉</Button>
            <Button
              className="w-full sm:w-auto"
              variant="secondary"
              onClick={() => downloadFile(`/reports/payslip/${selectedPayroll.id}`, `薪資單-${selectedPayroll.employee_name}-${selectedPayroll.payroll_month}.html`)}
            >
              下載薪資單
            </Button>
          </div>
        ) : null
      }
    >
      {selectedPayroll ? (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2">
            <MiniStat label="總收入" value={money(selectedPayroll.gross_income)} />
            <MiniStat label="應課稅 / 非應課稅" value={`${money(selectedPayroll.taxable_income)} / ${money(selectedPayroll.non_taxable_income)}`} />
            <MiniStat label="扣款總額" value={money(selectedPayroll.deductions)} />
            <MiniStat label="淨薪" value={money(selectedPayroll.net_salary)} strong />
          </section>

          <Card className="bg-slate-50/80 shadow-none">
            <h3 className="text-lg font-semibold text-slate-950">收入拆解</h3>
            <div className="mt-4 space-y-3">
              {selectedPayroll.earnings_breakdown.map((item, index) => (
                <div key={`${item.source}-${item.id ?? index}`} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-800">{displayPayrollText(item.description)}</span>
                    <span className="font-semibold">{money(item.amount)}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {earningTypeLabels[item.earning_type] ?? item.earning_type} / {item.is_taxable ? "應課稅" : "非應課稅"} / {item.counts_for_mpf ? "納入 MPF" : "不納入 MPF"}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-slate-50/80 shadow-none">
            <h3 className="text-lg font-semibold text-slate-950">扣款拆解</h3>
            <div className="mt-4 space-y-3">
              {selectedPayroll.deductions_breakdown.length === 0 ? <p className="text-sm text-slate-500">沒有扣款項目。</p> : null}
              {selectedPayroll.deductions_breakdown.map((item, index) => (
                <div key={`${item.source}-${item.id ?? index}`} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-800">{deductionTypeLabels[item.deduction_type] ?? item.deduction_type}</span>
                    <span className="font-semibold">{money(item.amount)}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">{displayPayrollText(item.reason)}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">{sourceLabels[item.source] ?? item.source}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-teal-50 text-teal-900 ring-1 ring-teal-100 shadow-none">
            <h3 className="text-lg font-semibold">計算公式</h3>
            <div className="mt-4 space-y-3 text-sm">
              <Formula label="有關入息" value={selectedPayroll.relevant_income_formula} />
              <Formula label="僱員 MPF" value={selectedPayroll.employee_mpf_formula} />
              <Formula label="僱主 MPF" value={selectedPayroll.employer_mpf_formula} />
              <Formula label="淨薪" value={selectedPayroll.net_salary_formula} />
            </div>
          </Card>
        </div>
      ) : null}
    </SlideOver>
  );
}

function MiniStat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${strong ? "bg-teal-50 text-teal-950 ring-teal-100" : "bg-white text-slate-950 ring-slate-100"}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-[-0.035em]">{value}</div>
    </div>
  );
}

function Formula({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-teal-100">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">{label}</div>
      <div className="mt-1 break-words text-slate-700">{value}</div>
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
