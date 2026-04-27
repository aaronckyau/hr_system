"use client";

import { FormEvent, useEffect, useState } from "react";

import { Button, Card, PageHeader, SlideOver, StatusPill } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { SettingCategory, SettingOption, User } from "@/lib/types";

const categoryLabels: Record<SettingCategory, string> = {
  department: "部門",
  position: "職位",
  work_location: "工作地點",
  employment_type: "合約類型",
  employment_status: "員工狀態",
  bank: "銀行",
  leave_type: "假期類型",
  earning_type: "收入項目類型",
  deduction_type: "扣款項目類型",
};

const categories: SettingCategory[] = [
  "department",
  "position",
  "work_location",
  "employment_type",
  "employment_status",
  "bank",
  "leave_type",
  "earning_type",
  "deduction_type",
];

const restrictedCategories: SettingCategory[] = ["leave_type", "earning_type", "deduction_type", "employment_status"];

const initialForm = {
  category: "department" as SettingCategory,
  value: "",
  label: "",
  display_order: "0",
  is_active: true,
};

export function SettingsClient() {
  const [user, setUser] = useState<User | null>(null);
  const [options, setOptions] = useState<SettingOption[]>([]);
  const [activeCategory, setActiveCategory] = useState<SettingCategory>("department");
  const [form, setForm] = useState(initialForm);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadOptions() {
    const data = await apiFetch<SettingOption[]>("/settings/options?include_inactive=true");
    setOptions(data);
  }

  useEffect(() => {
    Promise.all([apiFetch<User>("/auth/me"), loadOptions()])
      .then(([currentUser]) => setUser(currentUser))
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "無法載入公司設定"));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiFetch<SettingOption>("/settings/options", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          value: form.value.trim(),
          label: form.label.trim(),
          display_order: Number(form.display_order),
        }),
      });
      setMessage(`${categoryLabels[form.category]}已儲存`);
      setForm({ ...initialForm, category: form.category });
      setEditingId(null);
      setDrawerOpen(false);
      await loadOptions();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "儲存公司設定失敗");
    }
  }

  function openCreateDrawer() {
    setForm({ ...initialForm, category: activeCategory });
    setEditingId(null);
    setError("");
    setMessage("");
    setDrawerOpen(true);
  }

  function openEditDrawer(option: SettingOption) {
    setForm({
      category: option.category,
      value: option.value,
      label: option.label,
      display_order: String(option.display_order),
      is_active: option.is_active,
    });
    setEditingId(option.id);
    setActiveCategory(option.category);
    setError("");
    setMessage("");
    setDrawerOpen(true);
  }

  const visibleOptions = options.filter((option) => option.category === activeCategory);
  const canManage = user?.role === "admin" || user?.role === "hr";
  const categoryIsRestricted = restrictedCategories.includes(form.category);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Company Settings"
        title="公司設定"
        description="HR/Admin 可自行維護部門、職位、工作地點、合約類型、員工狀態，以及假期和薪資項目選項。"
        action={canManage ? <Button onClick={openCreateDrawer}>新增選項</Button> : null}
      />

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{error}</div> : null}
      {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-100">{message}</div> : null}

      <Card className="p-3">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {categories.map((category) => {
            const active = activeCategory === category;
            const count = options.filter((option) => option.category === category).length;
            return (
              <button
                key={category}
                className={`rounded-[1.5rem] px-4 py-4 text-left transition ${active ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15" : "bg-white/70 text-slate-700 ring-1 ring-slate-200 hover:bg-white"}`}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                <div className="text-sm font-bold">{categoryLabels[category]}</div>
                <div className={`mt-1 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{count} 個選項</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">{categoryLabels[activeCategory]}</h2>
            <p className="mt-1 text-sm text-slate-500">排序數字越小越前。停用後不會出現在一般表單下拉選單。</p>
          </div>
          {canManage ? (
            <Button variant="secondary" onClick={openCreateDrawer} type="button">
              新增 {categoryLabels[activeCategory]}
            </Button>
          ) : null}
        </div>

        <div className="mt-5 space-y-3">
          {visibleOptions.map((option) => (
            <div key={option.id} className="grid gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 md:grid-cols-[1.5fr_1fr_auto_auto] md:items-center">
              <div>
                <div className="font-bold text-slate-950">{option.label}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">{option.value}</div>
              </div>
              <div className="text-sm text-slate-500">排序：{option.display_order}</div>
              <StatusPill active={option.is_active} />
              {canManage ? (
                <Button variant="ghost" onClick={() => openEditDrawer(option)} type="button">
                  編輯
                </Button>
              ) : (
                <span className="text-sm text-slate-400">只讀</span>
              )}
            </div>
          ))}
          {visibleOptions.length === 0 ? <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">這個類別暫時未有選項。</div> : null}
        </div>
      </Card>

      <SlideOver
        open={drawerOpen}
        title={editingId ? "編輯設定選項" : "新增設定選項"}
        description={categoryIsRestricted ? "此類別已連接系統邏輯，只可維護系統支援的選項值、名稱、排序及狀態。" : "新增後會即時出現在相關 HR 表單。"}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="ghost" onClick={() => setDrawerOpen(false)} type="button">
              取消
            </Button>
            <Button className="w-full sm:w-auto" form="setting-option-form" type="submit">
              儲存
            </Button>
          </div>
        }
      >
        <form id="setting-option-form" className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">類別</label>
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as SettingCategory }))}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">顯示名稱</label>
            <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="例如：人事部" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">選項值</label>
            <input value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} placeholder="例如：HR" disabled={Boolean(editingId)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">排序</label>
            <input type="number" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} />
          </div>
          <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
            啟用此選項
            <input className="h-5 w-5 rounded-lg" type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
          </label>
        </form>
      </SlideOver>
    </div>
  );
}
