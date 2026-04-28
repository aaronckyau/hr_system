"use client";

import { useEffect, useState } from "react";

import { Alert, Card, EmptyState, PageHeader } from "@/components/ui";
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
  manager: "主管",
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
      <PageHeader eyebrow="Audit Trail" title="稽核紀錄" description="集中查看誰在什麼時間做了哪些 HR / Payroll 操作，方便日後追查與對帳。" />

      {error ? <Alert>{error}</Alert> : null}

      <Card>
        <div className="hidden overflow-x-auto lg:block">
          <table className="responsive-table min-w-full">
            <thead>
              <tr>
                <th>時間</th>
                <th>操作者</th>
                <th>角色</th>
                <th>事件</th>
                <th>摘要</th>
                <th>對象</th>
                <th>明細</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap">{formatTimestamp(log.created_at)}</td>
                  <td>{log.actor_name}</td>
                  <td>{roleLabels[log.actor_role] ?? log.actor_role}</td>
                  <td>{eventLabels[log.event_type] ?? log.event_type}</td>
                  <td>{log.summary}</td>
                  <td>{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ""}</td>
                  <td>
                    {Object.entries(log.metadata).length === 0 ? "無" : Object.entries(log.metadata).map(([key, value]) => `${key}: ${String(value)}`).join(" / ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 lg:hidden">
          {logs.map((log) => (
            <div key={log.id} className="rounded-[1.25rem] bg-slate-50 p-4 ring-1 ring-slate-100">
              <div className="text-sm font-semibold text-slate-950">{eventLabels[log.event_type] ?? log.event_type}</div>
              <div className="mt-1 text-xs text-slate-500">{formatTimestamp(log.created_at)} / {log.actor_name} / {roleLabels[log.actor_role] ?? log.actor_role}</div>
              <div className="mt-3 text-sm text-slate-700">{log.summary}</div>
            </div>
          ))}
          {logs.length === 0 ? <EmptyState title="暫時沒有稽核紀錄" /> : null}
        </div>
      </Card>
    </div>
  );
}
