"use client";

import { FormEvent, useEffect, useState } from "react";

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
  const [form, setForm] = useState({
    employee_id: "",
    leave_type: "annual",
    start_date: "",
    end_date: "",
    is_half_day: false,
    reason: "",
  });
  const [holidayForm, setHolidayForm] = useState({
    holiday_date: "",
    name: "",
    is_active: true,
  });

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

  function labelFor(category: string, value: string) {
    return settingOptions.find((option) => option.category === category && option.value === value)?.label ?? value;
  }

  useEffect(() => {
    loadData().catch((fetchError) => {
      setError(fetchError instanceof Error ? fetchError.message : "無法載入請假資料");
    });
  }, []);

  async function submitLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await apiFetch<LeaveRequest>("/leaves", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          employee_id: form.employee_id ? Number(form.employee_id) : undefined,
        }),
      });
      setForm({
        employee_id: "",
        leave_type: "annual",
        start_date: "",
        end_date: "",
        is_half_day: false,
        reason: "",
      });
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交請假失敗");
    }
  }

  async function updateStatus(id: number, status: string) {
    setError("");
    try {
      await apiFetch<LeaveRequest>(`/leaves/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "更新請假狀態失敗");
    }
  }

  async function saveLeaveConfig() {
    setError("");
    try {
      await apiFetch<LeaveConfig>("/leaves/config", {
        method: "PUT",
        body: JSON.stringify(leaveConfig),
      });
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "儲存請假設定失敗");
    }
  }

  async function savePublicHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await apiFetch<PublicHoliday>("/leaves/public-holidays", {
        method: "POST",
        body: JSON.stringify(holidayForm),
      });
      setHolidayForm({ holiday_date: "", name: "", is_active: true });
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "儲存公眾假期失敗");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">請假系統</h1>
            <p className="mt-2 text-sm text-slate-500">目前請假天數已按工作天計算，並會自動排除已設定的公眾假期；單日請假可選半日假。</p>
          </div>
          {currentUser ? <div className="text-sm text-slate-500">目前角色：{roleLabels[currentUser.role] ?? currentUser.role}</div> : null}
        </div>

        {error ? <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}

        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submitLeave}>
          {canCreateLeaveForOthers ? (
            <div>
              <label className="mb-1 block text-sm font-medium">員工</label>
              <select value={form.employee_id} onChange={(event) => setForm((current) => ({ ...current, employee_id: event.target.value }))}>
                <option value="">請選擇</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-medium">請假類型</label>
            <select value={form.leave_type} onChange={(event) => setForm((current) => ({ ...current, leave_type: event.target.value }))}>
              {settingOptions.map((option) => (
                <option key={option.id} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">開始日期</label>
            <input type="date" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">結束日期</label>
            <input type="date" value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.is_half_day}
                onChange={(event) => setForm((current) => ({ ...current, is_half_day: event.target.checked }))}
              />
              單日半日假
            </label>
            <p className="mt-2 text-xs text-slate-500">半日假目前只支援單日申請，批核後會以 0.5 天計算，無薪假也會同步影響扣薪。</p>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">原因</label>
            <textarea value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <button className="bg-brand text-white">提交請假</button>
          </div>
        </form>
      </section>

      {canManageRules ? (
        <section className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">請假工作天設定</h2>
            <p className="mt-2 text-sm text-slate-500">第 1 段支援星期六是否算工作天，星期日固定不計算。</p>
            <label className="mt-4 flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={leaveConfig.saturday_is_workday}
                onChange={(event) => setLeaveConfig({ saturday_is_workday: event.target.checked })}
              />
              星期六列為工作天
            </label>
            <button className="mt-4 bg-brand text-white" onClick={saveLeaveConfig} type="button">
              儲存請假設定
            </button>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold">公眾假期</h2>
            <p className="mt-2 text-sm text-slate-500">系統已預載 2026 年香港公眾假期，你可以在這裡新增或覆蓋同日期設定。</p>
            <form className="mt-4 grid gap-4 md:grid-cols-[1fr,2fr,auto]" onSubmit={savePublicHoliday}>
              <div>
                <label className="mb-1 block text-sm font-medium">日期</label>
                <input
                  type="date"
                  value={holidayForm.holiday_date}
                  onChange={(event) => setHolidayForm((current) => ({ ...current, holiday_date: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">假期名稱</label>
                <input
                  type="text"
                  value={holidayForm.name}
                  onChange={(event) => setHolidayForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <button className="bg-brand text-white" type="submit">
                  儲存假期
                </button>
              </div>
            </form>
            <div className="mt-4 max-h-80 overflow-y-auto rounded-xl bg-slate-50 p-3">
              <div className="space-y-2 text-sm">
                {publicHolidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                    <div>
                      <div className="font-medium">{holiday.name}</div>
                      <div className="text-slate-500">{holiday.holiday_date}</div>
                    </div>
                    <div className={holiday.is_active ? "text-emerald-600" : "text-slate-400"}>{holiday.is_active ? "啟用中" : "停用"}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">請假記錄</h2>
        <div className="mt-4 space-y-3">
          {leaves.map((leave) => (
            <div key={leave.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <div className="font-medium">
                    {leave.employee_name} / {labelFor("leave_type", leave.leave_type)}
                    {leave.is_half_day ? " / 半日假" : ""}
                  </div>
                  <div className="text-sm text-slate-500">
                    {leave.start_date} - {leave.end_date} / 實際請假 {leave.days} 天 / 曆日 {leave.calendar_days} 天 / 扣除公眾假期 {leave.excluded_public_holidays} 天 /{" "}
                    {statusLabels[leave.status] ?? leave.status}
                  </div>
                </div>
                {canManageRules ? (
                  <div className="flex gap-2">
                    <button className="bg-emerald-600 text-white" onClick={() => updateStatus(leave.id, "approved")}>
                      批准
                    </button>
                    <button className="bg-red-600 text-white" onClick={() => updateStatus(leave.id, "rejected")}>
                      拒絕
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
