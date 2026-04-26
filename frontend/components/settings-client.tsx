"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { SettingCategory, SettingOption, User } from "@/lib/types";

const categoryLabels: Record<SettingCategory, string> = {
  department: "部門",
  position: "職位",
  work_location: "工作地點",
  employment_type: "合約類型",
  bank: "銀行",
};

const categories: SettingCategory[] = ["department", "position", "work_location", "employment_type", "bank"];

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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadOptions() {
    const data = await apiFetch<SettingOption[]>("/settings/options?include_inactive=true");
    setOptions(data);
  }

  useEffect(() => {
    Promise.all([apiFetch<User>("/auth/me"), loadOptions()]).then(([currentUser]) => {
      setUser(currentUser);
    }).catch((fetchError) => {
      setError(fetchError instanceof Error ? fetchError.message : "無法載入公司設定");
    });
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
      setMessage("公司設定已儲存");
      setForm({ ...initialForm, category: form.category });
      await loadOptions();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "儲存公司設定失敗");
    }
  }

  function editOption(option: SettingOption) {
    setForm({
      category: option.category,
      value: option.value,
      label: option.label,
      display_order: String(option.display_order),
      is_active: option.is_active,
    });
    setActiveCategory(option.category);
    setError("");
    setMessage("");
  }

  const visibleOptions = options.filter((option) => option.category === activeCategory);
  const canManage = user?.role === "admin" || user?.role === "hr";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold">公司設定</h1>
        <p className="mt-2 text-sm text-slate-500">HR / Admin 可維護員工資料表單使用的下拉選項，避免把部門、職位、工作地點及合約類型寫死在系統中。</p>

        {error ? <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
        {message ? <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}

        {!canManage && user ? (
          <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">只有 HR 或系統管理員可以修改公司設定。</div>
        ) : null}

        {canManage ? <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium">類別</label>
            <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as SettingCategory }))}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">排序</label>
            <input type="number" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">選項值</label>
            <input value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">顯示名稱</label>
            <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
          </div>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
            啟用
          </label>
          <div className="md:col-span-2">
            <button className="bg-brand text-white" type="submit">
              儲存設定
            </button>
          </div>
        </form> : null}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button key={category} className={activeCategory === category ? "bg-brand text-white" : "bg-slate-100 text-slate-700"} onClick={() => setActiveCategory(category)} type="button">
              {categoryLabels[category]}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">顯示名稱</th>
                <th className="py-2">選項值</th>
                <th className="py-2">排序</th>
                <th className="py-2">狀態</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {visibleOptions.map((option) => (
                <tr key={option.id} className="border-b border-slate-100">
                  <td className="py-3">{option.label}</td>
                  <td>{option.value}</td>
                  <td>{option.display_order}</td>
                  <td>{option.is_active ? "啟用" : "停用"}</td>
                  <td>
                    <button className="bg-slate-100 text-slate-700" onClick={() => editOption(option)} type="button">
                      編輯
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
