"use client";

import { FormEvent, useEffect, useState } from "react";

import { Alert, Button, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { DeductionLine, EarningLine, Employee, SettingOption } from "@/lib/types";

type ItemTab = "earnings" | "deductions";

const earningTypeDefaults: Record<string, { taxable: boolean; mpf: boolean }> = {
  commission: { taxable: true, mpf: true },
  bonus: { taxable: true, mpf: false },
  reimbursement: { taxable: false, mpf: false },
  other: { taxable: true, mpf: false },
};

const sourceLabels: Record<string, string> = {
  manual: "手動輸入",
  derived: "系統計算",
};

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

export function PayrollItemsClient() {
  const [activeTab, setActiveTab] = useState<ItemTab>("earnings");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [earnings, setEarnings] = useState<EarningLine[]>([]);
  const [deductions, setDeductions] = useState<DeductionLine[]>([]);
  const [settingOptions, setSettingOptions] = useState<SettingOption[]>([]);
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
    const [employeeData, earningData, deductionData, settingData] = await Promise.all([
      apiFetch<Employee[]>("/employees"),
      apiFetch<EarningLine[]>(`/payroll/earnings?payroll_month=${encodeURIComponent(earningForm.payroll_month)}`),
      apiFetch<DeductionLine[]>(`/payroll/deductions?payroll_month=${encodeURIComponent(deductionForm.payroll_month)}`),
      apiFetch<SettingOption[]>("/settings/options"),
    ]);
    setEmployees(employeeData);
    setEarnings(earningData);
    setDeductions(deductionData);
    setSettingOptions(settingData);
  }

  useEffect(() => {
    loadPageData().catch((error) => setPageError(error instanceof Error ? error.message : "無法載入薪資項目資料"));
  }, []);

  async function refreshEarnings(payrollMonth: string) {
    setEarnings(await apiFetch<EarningLine[]>(`/payroll/earnings?payroll_month=${encodeURIComponent(payrollMonth)}`));
  }

  async function refreshDeductions(payrollMonth: string) {
    setDeductions(await apiFetch<DeductionLine[]>(`/payroll/deductions?payroll_month=${encodeURIComponent(payrollMonth)}`));
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
    await apiFetch("/payroll/generate", { method: "POST", body: JSON.stringify({ payroll_month: earningForm.payroll_month }) });
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
    await apiFetch("/payroll/generate", { method: "POST", body: JSON.stringify({ payroll_month: deductionForm.payroll_month }) });
    setDeductionForm((current) => ({ ...current, amount: "0", reason: "" }));
    await refreshDeductions(deductionForm.payroll_month);
  }

  function optionsFor(category: string) {
    return settingOptions.filter((option) => option.category === category && option.is_active);
  }

  function labelFor(category: string, value: string) {
    return settingOptions.find((option) => option.category === category && option.value === value)?.label ?? value;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll Inputs"
        title="薪資項目"
        description="專門維護會影響跑薪結果的收入項目與扣款項目。薪資計算結果請回到「薪資」頁查看。"
      />

      {pageError ? <Alert>{pageError}</Alert> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="本月手動收入項目" value={earnings.length} helper={`月份：${earningForm.payroll_month}`} tone="brand" />
        <StatCard label="本月手動扣款項目" value={deductions.length} helper={`月份：${deductionForm.payroll_month}`} tone="warm" />
        <StatCard label="手動收入合計" value={money(earnings.reduce((sum, item) => sum + item.amount, 0))} helper="不包括基本月薪及固定津貼" />
        <StatCard label="手動扣款合計" value={money(deductions.reduce((sum, item) => sum + item.amount, 0))} helper="不包括系統自動扣款" tone="brand" />
      </section>

      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <button className={activeTab === "earnings" ? "bg-teal-50 text-teal-900 ring-1 ring-teal-100" : "bg-white text-slate-700 ring-1 ring-slate-200"} onClick={() => setActiveTab("earnings")} type="button">
            收入項目
          </button>
          <button className={activeTab === "deductions" ? "bg-teal-50 text-teal-900 ring-1 ring-teal-100" : "bg-white text-slate-700 ring-1 ring-slate-200"} onClick={() => setActiveTab("deductions")} type="button">
            扣款項目
          </button>
        </div>
      </Card>

      {activeTab === "earnings" ? (
        <ItemsPanel
          title="收入項目"
          description="加入佣金、花紅、報銷與其他收入，並標示是否應課稅及是否納入 MPF。"
          form={
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleAddEarning}>
              <EmployeeSelect employees={employees} value={earningForm.employee_id} onChange={(value) => setEarningForm((current) => ({ ...current, employee_id: value }))} />
              <Field label="薪資月份">
                <input value={earningForm.payroll_month} onChange={async (event) => {
                  const nextMonth = event.target.value;
                  setEarningForm((current) => ({ ...current, payroll_month: nextMonth }));
                  await refreshEarnings(nextMonth);
                }} />
              </Field>
              <Field label="收入類型">
                <select value={earningForm.earning_type} onChange={(event) => {
                  const defaults = earningTypeDefaults[event.target.value] ?? { taxable: true, mpf: false };
                  setEarningForm((current) => ({ ...current, earning_type: event.target.value as EarningLine["earning_type"], is_taxable: defaults.taxable, counts_for_mpf: defaults.mpf }));
                }}>
                  {optionsFor("earning_type").map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="金額">
                <input type="number" min="0" step="0.01" value={earningForm.amount} onChange={(event) => setEarningForm((current) => ({ ...current, amount: event.target.value }))} />
              </Field>
              <Field label="稅務分類">
                <select value={earningForm.is_taxable ? "yes" : "no"} onChange={(event) => setEarningForm((current) => ({ ...current, is_taxable: event.target.value === "yes" }))}>
                  <option value="yes">應課稅</option>
                  <option value="no">非應課稅</option>
                </select>
              </Field>
              <Field label="是否納入 MPF">
                <select value={earningForm.counts_for_mpf ? "yes" : "no"} onChange={(event) => setEarningForm((current) => ({ ...current, counts_for_mpf: event.target.value === "yes" }))}>
                  <option value="yes">是</option>
                  <option value="no">否</option>
                </select>
              </Field>
              <div className="md:col-span-2 xl:col-span-3">
                <Field label="說明">
                  <input value={earningForm.description} onChange={(event) => setEarningForm((current) => ({ ...current, description: event.target.value }))} />
                </Field>
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <Button className="w-full sm:w-auto" type="submit">新增收入</Button>
              </div>
            </form>
          }
          list={earnings.map((item, index) => {
            const employee = employees.find((entry) => entry.id === item.employee_id);
            return {
              key: `${item.id ?? index}-${item.employee_id}`,
              title: employee?.full_name ?? `#${item.employee_id}`,
              amount: money(item.amount),
              meta: `${labelFor("earning_type", item.earning_type)} / ${item.is_taxable ? "應課稅" : "非應課稅"} / ${item.counts_for_mpf ? "納入 MPF" : "不納入 MPF"} / ${sourceLabels[item.source] ?? item.source}`,
              note: displayPayrollText(item.description),
            };
          })}
        />
      ) : (
        <ItemsPanel
          title="扣款項目"
          description="支援缺勤、遲到與其他手動扣款。無薪假由請假記錄自動帶入。"
          form={
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleAddDeduction}>
              <EmployeeSelect employees={employees} value={deductionForm.employee_id} onChange={(value) => setDeductionForm((current) => ({ ...current, employee_id: value }))} />
              <Field label="薪資月份">
                <input value={deductionForm.payroll_month} onChange={async (event) => {
                  const nextMonth = event.target.value;
                  setDeductionForm((current) => ({ ...current, payroll_month: nextMonth }));
                  await refreshDeductions(nextMonth);
                }} />
              </Field>
              <Field label="扣款類型">
                <select value={deductionForm.deduction_type} onChange={(event) => setDeductionForm((current) => ({ ...current, deduction_type: event.target.value as DeductionLine["deduction_type"] }))}>
                  {optionsFor("deduction_type").map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="金額">
                <input type="number" min="0" step="0.01" value={deductionForm.amount} onChange={(event) => setDeductionForm((current) => ({ ...current, amount: event.target.value }))} />
              </Field>
              <div className="md:col-span-2">
                <Field label="原因">
                  <input value={deductionForm.reason} onChange={(event) => setDeductionForm((current) => ({ ...current, reason: event.target.value }))} />
                </Field>
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <Button className="w-full sm:w-auto" type="submit">新增扣款</Button>
              </div>
            </form>
          }
          list={deductions.map((item, index) => {
            const employee = employees.find((entry) => entry.id === item.employee_id);
            return {
              key: `${item.id ?? index}-${item.employee_id}`,
              title: employee?.full_name ?? `#${item.employee_id}`,
              amount: money(item.amount),
              meta: `${item.deduction_type === "unpaid_leave" ? "無薪假" : labelFor("deduction_type", item.deduction_type)} / ${sourceLabels[item.source] ?? item.source}`,
              note: displayPayrollText(item.reason),
            };
          })}
        />
      )}
    </div>
  );
}

function ItemsPanel({ title, description, form, list }: { title: string; description: string; form: React.ReactNode; list: Array<{ key: string; title: string; amount: string; meta: string; note?: string }> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card>
        <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        <div className="mt-5">{form}</div>
      </Card>
      <Card>
        <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">{title}記錄</h2>
        <div className="mt-5 grid gap-3">
          {list.map((item) => (
            <div key={item.key} className="rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold text-slate-950">{item.title}</div>
                <div className="font-semibold text-brand">{item.amount}</div>
              </div>
              <div className="mt-2 text-sm text-slate-500">{item.meta}</div>
              {item.note ? <div className="mt-2 text-sm text-slate-700">{item.note}</div> : null}
            </div>
          ))}
          {list.length === 0 ? <EmptyState title="暫時沒有記錄" /> : null}
        </div>
      </Card>
    </section>
  );
}

function EmployeeSelect({ employees, value, onChange }: { employees: Employee[]; value: string; onChange: (value: string) => void }) {
  return (
    <Field label="員工">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">請選擇</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>{employee.full_name} ({employee.employee_no})</option>
        ))}
      </select>
    </Field>
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
