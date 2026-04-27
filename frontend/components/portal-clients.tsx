"use client";

import { useEffect, useState } from "react";

import { Button, Card, PageHeader } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Employee, LeaveRequest, PayrollRecord, User } from "@/lib/types";

const statusLabels: Record<string, string> = {
  pending: "待批",
  approved: "已批准",
  rejected: "已拒絕",
};

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
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">登入身份</div>
          <div className="mt-3 text-2xl font-black">{user?.full_name ?? "-"}</div>
          <div className="mt-1 text-sm text-slate-500">{user?.role}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">年假餘額</div>
          <div className="mt-3 text-3xl font-black">{profile?.annual_leave_balance ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">最新淨薪</div>
          <div className="mt-3 text-3xl font-black">HK${latestPayroll ? latestPayroll.net_salary.toFixed(2) : "0.00"}</div>
        </Card>
      </section>
      <Card>
        <h2 className="text-xl font-black">個人資料</h2>
        {profile ? (
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div>員工編號：{profile.employee_no}</div>
            <div>部門：{profile.department}</div>
            <div>職位：{profile.job_title}</div>
            <div>狀態：{profile.employment_status}</div>
            <div>電話：{profile.phone || "-"}</div>
            <div>工作地點：{profile.work_location || "-"}</div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">未找到員工資料。</p>
        )}
      </Card>
      <Card>
        <h2 className="text-xl font-black">最近請假</h2>
        <div className="mt-4 space-y-3">
          {leaves.slice(0, 5).map((leave) => (
            <div key={leave.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold">{leave.start_date} - {leave.end_date}</div>
              <div className="text-sm text-slate-500">{leave.leave_type} / {leave.days} 日 / {statusLabels[leave.status] ?? leave.status}</div>
            </div>
          ))}
          {leaves.length === 0 ? <p className="text-sm text-slate-500">未有請假紀錄。</p> : null}
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
      await apiFetch<LeaveRequest>(`/leaves/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新審批失敗");
    }
  }

  const pendingLeaves = leaves.filter((leave) => leave.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Manager Portal" title={view === "team" ? "Team Members" : view === "approvals" ? "審批中心" : view === "calendar" ? "Team Leave Calendar" : "主管工作台"} description="主管只會看到被指派為直屬主管的員工；HR/Admin 可看到全部。" />
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div> : null}
      {view === "dashboard" ? (
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <div className="text-sm text-slate-500">Team 人數</div>
            <div className="mt-3 text-3xl font-black">{employees.length}</div>
          </Card>
          <Card>
            <div className="text-sm text-slate-500">待審批</div>
            <div className="mt-3 text-3xl font-black">{pendingLeaves.length}</div>
          </Card>
          <Card>
            <div className="text-sm text-slate-500">今日可用功能</div>
            <div className="mt-3 text-lg font-black">Team / Approval / Calendar</div>
          </Card>
        </section>
      ) : null}
      {view === "team" || view === "dashboard" ? (
        <Card>
          <h2 className="text-xl font-black">Team Members</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {employees.map((employee) => (
              <div key={employee.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="font-bold">{employee.full_name}</div>
                <div className="mt-1 text-sm text-slate-500">{employee.employee_no} / {employee.department} / {employee.job_title}</div>
                <div className="mt-2 text-xs font-bold text-slate-400">狀態：{employee.employment_status}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      {view === "approvals" || view === "dashboard" ? (
        <Card>
          <h2 className="text-xl font-black">待審批請假</h2>
          <div className="mt-4 space-y-3">
            {pendingLeaves.map((leave) => (
              <div key={leave.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-bold">{leave.employee_name}</div>
                  <div className="text-sm text-slate-500">{leave.start_date} - {leave.end_date} / {leave.leave_type} / {leave.days} 日</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => updateStatus(leave.id, "approved")}>批准</Button>
                  <Button variant="danger" onClick={() => updateStatus(leave.id, "rejected")}>拒絕</Button>
                </div>
              </div>
            ))}
            {pendingLeaves.length === 0 ? <p className="text-sm text-slate-500">暫時沒有待審批申請。</p> : null}
          </div>
        </Card>
      ) : null}
      {view === "calendar" ? (
        <Card>
          <h2 className="text-xl font-black">Team Leave Calendar</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {leaves.map((leave) => (
              <div key={leave.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="font-bold">{leave.employee_name}</div>
                <div className="mt-1 text-sm text-slate-500">{leave.start_date} - {leave.end_date}</div>
                <div className="mt-2 text-xs font-bold text-slate-400">{leave.leave_type} / {statusLabels[leave.status] ?? leave.status}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
