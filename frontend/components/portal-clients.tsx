"use client";

import { useEffect, useState } from "react";

import { Alert, Button, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { apiFetch } from "@/lib/api";
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
  "HR Officer": "人事主任",
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

  useEffect(() => {
    Promise.all([apiFetch<User>("/auth/me"), apiFetch<Employee[]>("/employees"), apiFetch<LeaveRequest[]>("/leaves"), apiFetch<PayrollRecord[]>("/payroll")])
      .then(([userData, employeeData, leaveData, payrollData]) => {
        setUser(userData);
        setEmployees(employeeData);
        setLeaves(leaveData);
        setPayroll(payrollData);
      })
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "無法載入個人工作台"));
  }, []);

  const profile = employees[0];
  const latestPayroll = payroll[0];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Employee Portal" title="個人工作台" description="查看個人資料、假期餘額、請假紀錄與最新糧單。資料範圍由後端權限控制。" />
      {error ? <Alert>{error}</Alert> : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="登入身份" value={user?.full_name ?? "-"} helper={user?.role} tone="brand" />
        <StatCard label="年假餘額" value={profile?.annual_leave_balance ?? 0} />
        <StatCard label="最新淨薪" value={latestPayroll ? money(latestPayroll.net_salary) : "HK$0.00"} tone="brand" />
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
  const title = view === "team" ? "Team Members" : view === "approvals" ? "審批中心" : view === "calendar" ? "Team Leave Calendar" : "主管工作台";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Manager Portal" title={title} description="主管只會看到被指派為直屬主管的員工；HR/Admin 可看到全部。" />
      {error ? <Alert>{error}</Alert> : null}

      {view === "dashboard" ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Team 人數" value={employees.length} tone="brand" />
          <StatCard label="待審批" value={pendingLeaves.length} tone="warm" />
          <StatCard label="可用功能" value="Team / Approval / Calendar" />
        </section>
      ) : null}

      {view === "team" || view === "dashboard" ? (
        <Card>
          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">Team Members</h2>
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
          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">Team Leave Calendar</h2>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-800">{value}</div>
    </div>
  );
}
