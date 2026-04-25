"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { Employee, LeaveRequest, PayrollRecord } from "@/lib/types";

const leaveTypeLabels: Record<string, string> = {
  annual: "年假",
  sick: "病假",
  unpaid: "無薪假",
  other: "其他",
};

export function DashboardClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch<Employee[]>("/employees"),
      apiFetch<LeaveRequest[]>("/leaves"),
      apiFetch<PayrollRecord[]>("/payroll"),
    ]).then(([employeeData, leaveData, payrollData]) => {
      setEmployees(employeeData);
      setLeaves(leaveData);
      setPayroll(payrollData);
    });
  }, []);

  const cards = [
    { label: "員工數", value: employees.length },
    { label: "待批請假", value: leaves.filter((item) => item.status === "pending").length },
    { label: "本期薪資筆數", value: payroll.length },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="text-sm text-slate-500">{card.label}</div>
            <div className="mt-3 text-3xl font-semibold">{card.value}</div>
          </div>
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold">最新請假</h2>
          <div className="mt-4 space-y-3">
            {leaves.slice(0, 5).map((leave) => (
              <div key={leave.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="font-medium">{leave.employee_name}</div>
                <div className="text-slate-500">
                  {leaveTypeLabels[leave.leave_type] ?? leave.leave_type} / {leave.start_date} - {leave.end_date}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold">最近薪資</h2>
          <div className="mt-4 space-y-3">
            {payroll.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="font-medium">{item.employee_name}</div>
                <div className="text-slate-500">
                  {item.payroll_month} / 淨薪 HK${item.net_salary.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
