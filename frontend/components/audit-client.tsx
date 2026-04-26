"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { AuditLog } from "@/lib/types";

const eventLabels: Record<string, string> = {
  employee_created: "新增員工",
  employee_password_reset: "重設員工密碼",
  leave_config_updated: "更新請假設定",
  public_holiday_saved: "新增或更新公眾假期",
  setting_option_saved: "儲存公司設定",
  payroll_config_updated: "更新薪資規則",
  earning_created: "新增收入項目",
  deduction_created: "新增扣款項目",
  payroll_generated: "重算薪資",
  final_pay_created: "建立離職結算",
};

const roleLabels: Record<string, string> = {
  admin: "管理員",
  hr: "人事",
  employee: "員工",
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<AuditLog[]>("/audit")
      .then(setLogs)
      .catch((fetchError) => setError(fetchError instanceof Error ? fetchError.message : "無法載入稽核紀錄"));
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold">稽核紀錄</h1>
        <p className="mt-2 text-sm text-slate-500">集中查看誰在什麼時間做了哪些 HR / Payroll 相關操作，方便日後追查與對帳。</p>
      </section>

      {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">時間</th>
                <th className="py-2">操作者</th>
                <th className="py-2">角色</th>
                <th className="py-2">事件</th>
                <th className="py-2">摘要</th>
                <th className="py-2">對象</th>
                <th className="py-2">明細</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 align-top">
                  <td className="py-3 whitespace-nowrap">{formatTimestamp(log.created_at)}</td>
                  <td>{log.actor_name}</td>
                  <td>{roleLabels[log.actor_role] ?? log.actor_role}</td>
                  <td>{eventLabels[log.event_type] ?? log.event_type}</td>
                  <td>{log.summary}</td>
                  <td>
                    {log.entity_type}
                    {log.entity_id ? ` #${log.entity_id}` : ""}
                  </td>
                  <td>
                    <div className="space-y-1 text-slate-500">
                      {Object.entries(log.metadata).length === 0 ? (
                        <div>無</div>
                      ) : (
                        Object.entries(log.metadata).map(([key, value]) => (
                          <div key={key}>
                            {key}：{String(value)}
                          </div>
                        ))
                      )}
                    </div>
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
