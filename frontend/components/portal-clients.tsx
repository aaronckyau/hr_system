"use client";

import { FormEvent, useEffect, useState } from "react";

import { Alert, Button, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { apiFetch, downloadFile } from "@/lib/api";
import type { Employee, LeaveRequest, PayrollRecord, User } from "@/lib/types";

const statusLabels: Record<string, string> = {
  pending: "待批",
  approved: "已批准",
  rejected: "已拒絕",
};

const employeeStatusLabels: Record<string, string> = {
  active: "在職",
  probation: "試用",
  terminated: "離職",
  suspended: "停職",
};

const leaveTypeLabels: Record<string, string> = {
  annual: "年假",
  sick: "病假",
  unpaid: "無薪假",
  maternity: "產假",
  paternity: "侍產假",
  compensation: "補假",
  other: "其他",
};

const profileDisplayLabels: Record<string, string> = {
  "Human Resources": "人事部",
  Operations: "營運部",
  Finance: "財務部",
  Sales: "銷售部",
  IT: "資訊科技部",
  "HR Officer": "人事主任",
  "Finance Analyst": "財務分析員",
  "Operations Manager": "營運經理",
  "Operations Assistant": "營運助理",
};

function displayLabel(value?: string | null) {
  if (!value) return "-";
  return profileDisplayLabels[value] ?? value;
}

function leaveTypeLabel(value: string) {
  return leaveTypeLabels[value] ?? value;
}

function money(amount: number) {
  return `HK$${amount.toFixed(2)}`;
}

export function EmployeePortalClient() {
  const [user, setUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "annual",
    start_date: "",
    end_date: "",
    is_half_day: false,
    reason: "",
  });

  async function loadEmployeePortalData() {
    const [userData, employeeData, leaveData, payrollData] = await Promise.all([
      apiFetch<User>("/auth/me"),
      apiFetch<Employee[]>("/employees"),
      apiFetch<LeaveRequest[]>("/leaves"),
      apiFetch<PayrollRecord[]>("/payroll"),
    ]);
    setUser(userData);
    setEmployees(employeeData);
    setLeaves(leaveData);
    setPayroll(payrollData);
  }

  useEffect(() => {
    loadEmployeePortalData().catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "無法載入個人工作台"));
  }, []);

  async function handleSubmitLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiFetch<LeaveRequest>("/leaves", {
        method: "POST",
        body: JSON.stringify({
          leave_type: leaveForm.leave_type,
          start_date: leaveForm.start_date,
          end_date: leaveForm.end_date,
          is_half_day: leaveForm.is_half_day,
          reason: leaveForm.reason || null,
        }),
      });
      setSuccess("請假申請已提交，狀態為待批。");
      setLeaveForm({ leave_type: "annual", start_date: "", end_date: "", is_half_day: false, reason: "" });
      await loadEmployeePortalData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交請假申請失敗");
    }
  }

  async function handleDownloadPayslip(record: PayrollRecord) {
    setError("");
    try {
      await downloadFile(`/reports/payslip/${record.id}`, `薪資單-${record.employee_name}-${record.payroll_month}.html`);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "下載糧單失敗");
    }
  }

  const profile = employees[0];
  const latestPayroll = payroll[0];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Employee Portal" title="個人工作台" description="查看個人資料、假期餘額、請假紀錄與最新糧單。資料範圍由後端權限控制。" />
      {error ? <Alert>{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="登入身份" value={user?.full_name ?? "-"} helper={user?.role} tone="brand" />
        <StatCard label="年假餘額" value={profile?.annual_leave_balance ?? 0} />
        <StatCard label="最新淨薪" value={latestPayroll ? money(latestPayroll.net_salary) : "HK$0.00"} tone="brand" />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">提交請假申請</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">員工不需要選擇姓名，系統會自動使用目前登入者的員工檔案。</p>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmitLeave}>
            <Field label="請假類型">
              <select value={leaveForm.leave_type} onChange={(event) => setLeaveForm((current) => ({ ...current, leave_type: event.target.value }))}>
                <option value="annual">年假</option>
                <option value="sick">病假</option>
                <option value="unpaid">無薪假</option>
                <option value="other">其他</option>
              </select>
            </Field>
            <Field label="半日假">
              <select value={leaveForm.is_half_day ? "yes" : "no"} onChange={(event) => setLeaveForm((current) => ({ ...current, is_half_day: event.target.value === "yes" }))}>
                <option value="no">否</option>
                <option value="yes">是</option>
              </select>
            </Field>
            <Field label="開始日期">
              <input type="date" value={leaveForm.start_date} onChange={(event) => setLeaveForm((current) => ({ ...current, start_date: event.target.value }))} />
            </Field>
            <Field label="結束日期">
              <input type="date" value={leaveForm.end_date} onChange={(event) => setLeaveForm((current) => ({ ...current, end_date: event.target.value }))} />
            </Field>
            <div className="md:col-span-2">
              <Field label="原因 / 備註">
                <textarea value={leaveForm.reason} onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Button className="w-full sm:w-auto" type="submit">提交申請</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">最新糧單</h2>
          {latestPayroll ? (
            <div className="mt-5 rounded-[1.25rem] bg-teal-50 p-5 text-teal-950 ring-1 ring-teal-100">
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-700">{latestPayroll.payroll_month}</div>
              <div className="mt-3 text-3xl font-semibold tracking-[-0.035em]">{money(latestPayroll.net_salary)}</div>
              <div className="mt-3 grid gap-2 text-sm text-teal-900">
                <div>總收入：{money(latestPayroll.gross_income)}</div>
                <div>僱員 MPF：{money(latestPayroll.employee_mpf)}</div>
                <div>僱主 MPF：{money(latestPayroll.employer_mpf)}</div>
              </div>
              <Button className="mt-5 w-full sm:w-auto" variant="secondary" onClick={() => handleDownloadPayslip(latestPayroll)} type="button">
                下載糧單
              </Button>
            </div>
          ) : (
            <EmptyState title="暫時沒有糧單" description="HR 發佈或產生薪資後會在這裡顯示。" />
          )}
        </Card>
      </section>
      <Card>
        <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">個人資料</h2>
        {profile ? (
          <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
            <Info label="員工編號" value={profile.employee_no} />
            <Info label="部門" value={displayLabel(profile.department)} />
            <Info label="職位" value={displayLabel(profile.job_title)} />
            <Info label="狀態" value={employeeStatusLabels[profile.employment_status] ?? profile.employment_status} />
            <Info label="電話" value={profile.phone || "-"} />
            <Info label="工作地點" value={profile.work_location || "-"} />
          </div>
        ) : (
          <EmptyState title="未找到員工資料" />
        )}
      </Card>
      <Card>
        <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">最近請假</h2>
        <div className="mt-5 grid gap-3">
          {leaves.slice(0, 5).map((leave) => (
            <div key={leave.id} className="rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="font-semibold text-slate-950">{leave.start_date} - {leave.end_date}</div>
              <div className="mt-1 text-sm text-slate-500">{leaveTypeLabel(leave.leave_type)} / {leave.days} 日 / {statusLabels[leave.status] ?? leave.status}</div>
            </div>
          ))}
          {leaves.length === 0 ? <EmptyState title="暫時沒有請假紀錄" /> : null}
        </div>
      </Card>
    </div>
  );
}

export function ManagerDashboardClient({ view }: { view: "dashboard" | "team" | "approvals" | "calendar" }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [error, setError] = useState("");

  async function loadData() {
    const [employeeData, leaveData] = await Promise.all([apiFetch<Employee[]>("/employees"), apiFetch<LeaveRequest[]>("/leaves")]);
    setEmployees(employeeData);
    setLeaves(leaveData);
  }

  useEffect(() => {
    loadData().catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "無法載入主管工作台"));
  }, []);

  async function updateStatus(id: number, status: string) {
    setError("");
    try {
      await apiFetch<LeaveRequest>(`/leaves/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新審批失敗");
    }
  }

  const pendingLeaves = leaves.filter((leave) => leave.status === "pending");
  const title = view === "team" ? "團隊成員" : view === "approvals" ? "審批中心" : view === "calendar" ? "團隊假期日曆" : "主管工作台";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Manager Portal" title={title} description="主管只會看到被指派為直屬主管的員工；HR/Admin 可看到全部。" />
      {error ? <Alert>{error}</Alert> : null}

      {view === "dashboard" ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Team 人數" value={employees.length} tone="brand" />
          <StatCard label="待審批" value={pendingLeaves.length} tone="warm" />
          <StatCard label="可用功能" value="團隊 / 審批 / 日曆" />
        </section>
      ) : null}

      {view === "team" || view === "dashboard" ? (
        <Card>
          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">團隊成員</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {employees.map((employee) => (
              <div key={employee.id} className="rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="font-semibold text-slate-950">{employee.full_name}</div>
                <div className="mt-1 text-sm text-slate-500">{employee.employee_no} / {displayLabel(employee.department)} / {displayLabel(employee.job_title)}</div>
                <div className="mt-3 w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">狀態：{employeeStatusLabels[employee.employment_status] ?? employee.employment_status}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {view === "approvals" || view === "dashboard" ? (
        <Card>
          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">待審批請假</h2>
          <div className="mt-5 grid gap-3">
            {pendingLeaves.map((leave) => (
              <div key={leave.id} className="flex flex-col gap-4 rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-100 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold text-slate-950">{leave.employee_name}</div>
                  <div className="mt-1 text-sm text-slate-500">{leave.start_date} - {leave.end_date} / {leaveTypeLabel(leave.leave_type)} / {leave.days} 日</div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button onClick={() => updateStatus(leave.id, "approved")}>批准</Button>
                  <Button variant="danger" onClick={() => updateStatus(leave.id, "rejected")}>拒絕</Button>
                </div>
              </div>
            ))}
            {pendingLeaves.length === 0 ? <EmptyState title="暫時沒有待審批申請" /> : null}
          </div>
        </Card>
      ) : null}

      {view === "calendar" ? (
        <Card>
          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">團隊假期日曆</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {leaves.map((leave) => (
              <div key={leave.id} className="rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="font-semibold text-slate-950">{leave.employee_name}</div>
                <div className="mt-1 text-sm text-slate-500">{leave.start_date} - {leave.end_date}</div>
                <div className="mt-3 w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">{leaveTypeLabel(leave.leave_type)} / {statusLabels[leave.status] ?? leave.status}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
    </div>
  );
}
