"use client";

import { FormEvent, useEffect, useState } from "react";

import { Alert, Button, Card, EmptyState, PageHeader, SlideOver, StatusPill } from "@/components/ui";
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

const categoryHints: Record<SettingCategory, string> = {
  department: "例：HR、Finance、Sales",
  position: "例：Officer、Manager、Analyst",
  work_location: "例：香港辦公室、遙距、客戶現場",
  employment_type: "例：全職、兼職、臨時、實習",
  employment_status: "例：在職、試用、離職、停職",
  bank: "例：HSBC、Hang Seng、BOC",
  leave_type: "例：年假、病假、無薪假",
  earning_type: "例：佣金、花紅、報銷",
  deduction_type: "例：遲到、缺勤、其他扣款",
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
        description="HR/Admin 可自行維護部門、職位、工作地點、合約類型、員工狀態，以及假期和薪資項目選項，不需要改程式碼。"
        action={canManage ? <Button className="w-full md:w-auto" onClick={openCreateDrawer}>新增選項</Button> : null}
      />

      {error ? <Alert>{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {categories.map((category) => {
            const active = activeCategory === category;
            const count = options.filter((option) => option.category === category).length;
            return (
              <button
                key={category}
                className={`rounded-[1.35rem] px-4 py-4 text-left transition ${
                  active ? "bg-teal-50 text-teal-900 ring-1 ring-teal-100" : "bg-white/75 text-slate-700 ring-1 ring-slate-200 hover:bg-white"
                }`}
                onClick={() => setActiveCategory(category)}
                type="button"
              >
                <div className="text-sm font-semibold">{categoryLabels[category]}</div>
                <div className={`mt-1 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>{count} 個選項</div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">{categoryLabels[activeCategory]}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{categoryHints[activeCategory]}。排序數字越小越前；停用後不會出現在一般表單下拉選單。</p>
          </div>
          {canManage ? (
            <Button variant="secondary" onClick={openCreateDrawer} type="button">
              新增 {categoryLabels[activeCategory]}
            </Button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3">
          {visibleOptions.map((option) => (
            <div key={option.id} className="grid gap-3 rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-100 md:grid-cols-[1.5fr_1fr_auto_auto] md:items-center">
              <div>
                <div className="font-semibold text-slate-950">{option.label}</div>
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
          {visibleOptions.length === 0 ? <EmptyState title="暫時沒有選項" description="新增後會立即用於相關 HR 表單。" /> : null}
        </div>
      </Card>

      <SlideOver
        open={drawerOpen}
        title={editingId ? "編輯設定選項" : "新增設定選項"}
        description={categoryIsRestricted ? "此類別已連接系統邏輯，請保持選項值與系統支援值一致。" : "新增後會即時出現在相關 HR 表單。"}
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
          <Field label="類別">
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as SettingCategory }))}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="顯示名稱">
            <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="例如：人事部" />
          </Field>
          <Field label="選項值">
            <input value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} placeholder="例如：HR" disabled={Boolean(editingId)} />
          </Field>
          <Field label="排序">
            <input type="number" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} />
          </Field>
          <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
            啟用此選項
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
          </label>
        </form>
      </SlideOver>
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
