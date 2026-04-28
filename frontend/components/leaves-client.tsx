"use client";

import { FormEvent, useEffect, useState } from "react";

import { Alert, Button, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Employee, LeaveConfig, LeaveRequest, PublicHoliday, SettingOption, User } from "@/lib/types";

const statusLabels: Record<string, string> = {
  pending: "待批",
  approved: "已批准",
  rejected: "已拒絕",
};

const roleLabels: Record<string, string> = {
  admin: "管理員",
  hr: "人事",
  manager: "主管",
  employee: "員工",
};

export function LeavesClient() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveConfig, setLeaveConfig] = useState<LeaveConfig>({ saturday_is_workday: false });
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [settingOptions, setSettingOptions] = useState<SettingOption[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ employee_id: "", leave_type: "annual", start_date: "", end_date: "", is_half_day: false, reason: "" });
  const [holidayForm, setHolidayForm] = useState({ holiday_date: "", name: "", is_active: true });

  const canManageRules = currentUser?.role === "admin" || currentUser?.role === "hr";
  const canCreateLeaveForOthers = currentUser?.role === "admin" || currentUser?.role === "hr";

  async function loadData() {
    const [meData, employeeData, leaveData, configData, holidayData, settingData] = await Promise.all([
      apiFetch<User>("/auth/me"),
      apiFetch<Employee[]>("/employees"),
      apiFetch<LeaveRequest[]>("/leaves"),
      apiFetch<LeaveConfig>("/leaves/config"),
      apiFetch<PublicHoliday[]>("/leaves/public-holidays?year=2026"),
      apiFetch<SettingOption[]>("/settings/options?category=leave_type"),
    ]);
    setCurrentUser(meData);
    setEmployees(employeeData);
    setLeaves(leaveData);
    setLeaveConfig(configData);
    setPublicHolidays(holidayData);
    setSettingOptions(settingData);
  }

  function labelFor(value: string) {
    return settingOptions.find((option) => option.value === value)?.label ?? value;
  }

  useEffect(() => {
    loadData().catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "無法載入請假資料"));
  }, []);

  async function submitLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await apiFetch<LeaveRequest>("/leaves", {
        method: "POST",
        body: JSON.stringify({ ...form, employee_id: form.employee_id ? Number(form.employee_id) : undefined }),
      });
      setForm({ employee_id: "", leave_type: "annual", start_date: "", end_date: "", is_half_day: false, reason: "" });
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交請假失敗");
    }
  }

  async function updateStatus(id: number, status: string) {
    setError("");
    try {
      await apiFetch<LeaveRequest>(`/leaves/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新請假狀態失敗");
    }
  }

  async function saveLeaveConfig() {
    setError("");
    try {
      await apiFetch<LeaveConfig>("/leaves/config", { method: "PUT", body: JSON.stringify(leaveConfig) });
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "儲存請假設定失敗");
    }
  }

  async function savePublicHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await apiFetch<PublicHoliday>("/leaves/public-holidays", { method: "POST", body: JSON.stringify(holidayForm) });
      setHolidayForm({ holiday_date: "", name: "", is_active: true });
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "儲存公眾假期失敗");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Leave Management"
        title="請假系統"
        description="支援員工提交、主管審批、半日假、工作天計算及可配置公眾假期。"
        action={currentUser ? <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold ring-1 ring-white/10">目前角色：{roleLabels[currentUser.role] ?? currentUser.role}</div> : null}
      />

      {error ? <Alert>{error}</Alert> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="請假記錄" value={leaves.length} />
        <StatCard label="待批" value={leaves.filter((leave) => leave.status === "pending").length} tone="warm" />
        <StatCard label="已批准" value={leaves.filter((leave) => leave.status === "approved").length} tone="brand" />
        <StatCard label="公眾假期" value={publicHolidays.filter((holiday) => holiday.is_active).length} tone="brand" />
      </section>

      <Card>
        <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">提交請假</h2>
        <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={submitLeave}>
          {canCreateLeaveForOthers ? (
            <Field label="員工">
              <select value={form.employee_id} onChange={(event) => setForm((current) => ({ ...current, employee_id: event.target.value }))}>
                <option value="">請選擇</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="請假類型">
            <select value={form.leave_type} onChange={(event) => setForm((current) => ({ ...current, leave_type: event.target.value }))}>
              {settingOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="開始日期">
            <input type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} />
          </Field>
          <Field label="結束日期">
            <input type="date" value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} />
          </Field>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-100">
              <input type="checkbox" checked={form.is_half_day} onChange={(event) => setForm((current) => ({ ...current, is_half_day: event.target.checked }))} />
              單日半日假
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-500">半日假目前只支援單日申請，批核後以 0.5 天計算。</p>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <Field label="原因">
              <textarea value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <Button className="w-full sm:w-auto" type="submit">提交請假</Button>
          </div>
        </form>
      </Card>

      {canManageRules ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">工作天設定</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">目前支援星期六是否計作工作天；星期日固定不計算。</p>
            <label className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-100">
              <input type="checkbox" checked={leaveConfig.saturday_is_workday} onChange={(event) => setLeaveConfig({ saturday_is_workday: event.target.checked })} />
              星期六列為工作天
            </label>
            <Button className="mt-5 w-full sm:w-auto" onClick={saveLeaveConfig} type="button">儲存請假設定</Button>
          </Card>

          <Card>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">公眾假期</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">假期日曆可配置，不硬編碼在程式內。</p>
            <form className="mt-5 grid gap-4 md:grid-cols-[1fr_1.5fr_auto]" onSubmit={savePublicHoliday}>
              <Field label="日期">
                <input type="date" value={holidayForm.holiday_date} onChange={(event) => setHolidayForm((current) => ({ ...current, holiday_date: event.target.value }))} />
              </Field>
              <Field label="假期名稱">
                <input value={holidayForm.name} onChange={(event) => setHolidayForm((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <div className="flex items-end">
                <Button className="w-full" type="submit">儲存</Button>
              </div>
            </form>
            <div className="mt-5 max-h-80 overflow-y-auto rounded-[1.25rem] bg-slate-50 p-3">
              <div className="space-y-2 text-sm">
                {publicHolidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-3 ring-1 ring-slate-100">
                    <div>
                      <div className="font-semibold text-slate-950">{holiday.name}</div>
                      <div className="text-slate-500">{holiday.holiday_date}</div>
                    </div>
                    <div className={holiday.is_active ? "font-semibold text-emerald-600" : "font-semibold text-slate-400"}>{holiday.is_active ? "啟用" : "停用"}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      <Card>
        <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">請假記錄</h2>
        <div className="mt-5 grid gap-3">
          {leaves.map((leave) => (
            <div key={leave.id} className="rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="font-semibold text-slate-950">
                    {leave.employee_name} / {labelFor(leave.leave_type)}
                    {leave.is_half_day ? " / 半日假" : ""}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    {leave.start_date} - {leave.end_date} / 實際 {leave.days} 天 / 曆日 {leave.calendar_days} 天 / 扣除公眾假期 {leave.excluded_public_holidays} 天 / {statusLabels[leave.status] ?? leave.status}
                  </div>
                </div>
                {canManageRules ? (
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button onClick={() => updateStatus(leave.id, "approved")}>批准</Button>
                    <Button variant="danger" onClick={() => updateStatus(leave.id, "rejected")}>拒絕</Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {leaves.length === 0 ? <EmptyState title="暫時沒有請假記錄" description="提交請假後會在這裡顯示。" /> : null}
        </div>
      </Card>
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
