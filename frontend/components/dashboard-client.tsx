"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Card, EmptyState, PageHeader, StatCard, StatGrid } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Employee, LeaveRequest, PayrollRecord, User } from "@/lib/types";

const leaveTypeLabels: Record<string, string> = {
  annual: "年假",
  sick: "病假",
  unpaid: "無薪假",
  other: "其他",
};

const leaveStatusLabels: Record<string, string> = {
  pending: "待批",
  approved: "已批准",
  rejected: "已拒絕",
};

function money(amount: number) {
  return `HK$${amount.toFixed(2)}`;
}

export function DashboardClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiFetch<User>("/auth/me"), apiFetch<Employee[]>("/employees"), apiFetch<LeaveRequest[]>("/leaves"), apiFetch<PayrollRecord[]>("/payroll")])
      .then(([userData, employeeData, leaveData, payrollData]) => {
        setCurrentUser(userData);
        setEmployees(employeeData);
        setLeaves(leaveData);
        setPayroll(payrollData);
      })
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "無法載入控制台資料"));
  }, []);

  const pendingLeaves = leaves.filter((item) => item.status === "pending");
  const latestPayroll = payroll.slice(0, 5);
  const isHrUser = currentUser?.role === "admin" || currentUser?.role === "hr";
  const isManagerUser = currentUser?.role === "manager";
  const isEmployee = currentUser?.role === "employee";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MVP Dashboard"
        title={isEmployee ? "員工工作台" : "HR 控制台"}
        description={
          isEmployee
            ? "查看自己的假期、薪資與申請紀錄。員工入口會避免顯示 HR 管理操作。"
            : "快速查看員工、人手、請假與薪資狀況。手機版會優先顯示最重要的操作與摘要。"
        }
      />

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">{error}</div> : null}

      {isHrUser ? (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-teal-100 bg-gradient-to-br from-white to-teal-50/60">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">HR 管理捷徑</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">要新增員工？由這裡開始</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  HR / Admin 可先進入員工資料管理，建立員工檔案、指定部門職位、設定主管、合約類型、薪資與假期餘額。
                </p>
              </div>
              <Link
                href="/employees"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-brand/15 hover:bg-teal-700"
              >
                新增員工
              </Link>
            </div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">常用 HR 流程</div>
            <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-1">
              <Link className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-100 hover:bg-white" href="/employees">
                1. 新增 / 管理員工
              </Link>
              <Link className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-100 hover:bg-white" href="/leaves">
                2. 請假與審批
              </Link>
              <Link className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-100 hover:bg-white" href="/payroll">
                3. 生成薪資
              </Link>
            </div>
          </Card>
        </section>
      ) : null}

      {isManagerUser ? (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-teal-100 bg-gradient-to-br from-white to-teal-50/60">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">主管工作區</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">團隊、審批、日曆集中處理</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  主管入口只顯示直屬團隊、待審批申請及團隊假期日曆，避免混入 HR 專用的員工檔案或薪資設定。
                </p>
              </div>
              <Link
                href="/manager/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-brand/15 hover:bg-teal-700"
              >
                進入主管工作台
              </Link>
            </div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">主管常用功能</div>
            <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-1">
              <Link className="rounded-2xl bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-700 ring-1 ring-slate-100 hover:bg-white" href="/manager/team">
                團隊
              </Link>
              <Link className="rounded-2xl bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-700 ring-1 ring-slate-100 hover:bg-white" href="/manager/approvals">
                審批
              </Link>
              <Link className="rounded-2xl bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-700 ring-1 ring-slate-100 hover:bg-white" href="/manager/team-calendar">
                日曆
              </Link>
            </div>
          </Card>
        </section>
      ) : null}

      {isEmployee ? (
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-teal-100 bg-gradient-to-br from-white to-teal-50/60">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">員工自助區</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-slate-950">個人資料與假期狀況</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  員工可查看自己的假期餘額、請假紀錄及最近薪資，不會看到新增員工或公司設定等 HR 管理功能。
                </p>
              </div>
              <Link
                href="/me/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-brand/15 hover:bg-teal-700"
              >
                進入個人工作台
              </Link>
            </div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">員工常用功能</div>
            <div className="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-1">
              <Link className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-100 hover:bg-white" href="/me/dashboard">
                1. 查看個人資料
              </Link>
              <Link className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-100 hover:bg-white" href="/leaves">
                2. 提交請假申請
              </Link>
              <Link className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-100 hover:bg-white" href="/me/dashboard">
                3. 查看我的糧單
              </Link>
            </div>
          </Card>
        </section>
      ) : null}

      <StatGrid className="xl:grid-cols-4">
        <StatCard label="員工數" value={employees.length} helper="目前可見員工" tone="brand" />
        <StatCard label="待批請假" value={pendingLeaves.length} helper="需要主管或 HR 處理" />
        <StatCard label="本期薪資" value={payroll.length} helper="已產生薪資記錄" />
        <StatCard label="在職比例" value={`${employees.filter((item) => item.employment_status !== "terminated").length}/${employees.length || 0}`} helper="排除離職員工" tone="warm" />
      </StatGrid>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">最新請假</h2>
              <p className="mt-1 text-sm text-slate-500">最近 5 筆申請與審批狀態</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{leaves.length} 筆</span>
          </div>
          <div className="mt-5 space-y-3">
            {leaves.slice(0, 5).map((leave) => (
              <div key={leave.id} className="rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-950">{leave.employee_name}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {leaveTypeLabels[leave.leave_type] ?? leave.leave_type} / {leave.start_date} - {leave.end_date}
                    </div>
                  </div>
                  <div className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">{leaveStatusLabels[leave.status] ?? leave.status}</div>
                </div>
              </div>
            ))}
            {leaves.length === 0 ? <EmptyState title="暫時沒有請假記錄" description="員工提交申請後會在這裡顯示。" /> : null}
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">最近薪資</h2>
              <p className="mt-1 text-sm text-slate-500">最近 5 筆淨薪與薪資月份</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{payroll.length} 筆</span>
          </div>
          <div className="mt-5 space-y-3">
            {latestPayroll.map((item) => (
              <div key={item.id} className="rounded-[1.25rem] bg-white p-4 ring-1 ring-slate-200">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-950">{item.employee_name}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.payroll_month}</div>
                  </div>
                  <div className="text-xl font-semibold tracking-[-0.035em] text-brand">{money(item.net_salary)}</div>
                </div>
              </div>
            ))}
            {payroll.length === 0 ? <EmptyState title="暫時沒有薪資記錄" description="產生薪資後會在這裡顯示。" /> : null}
          </div>
        </Card>
      </section>
    </div>
  );
}
