"use client";

import { useEffect, useState } from "react";

import { Alert, Card, EmptyState, PageHeader } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { AuditLog } from "@/lib/types";

const eventLabels: Record<string, string> = {
  employee_created: "新增員工",
  employee_updated: "更新員工資料",
  employee_password_reset: "重設員工密碼",
  leave_created: "提交請假申請",
  leave_status_updated: "更新請假狀態",
  leave_config_updated: "更新請假設定",
  public_holiday_saved: "新增或更新公眾假期",
  setting_option_saved: "儲存公司設定",
  payroll_config_updated: "更新薪資規則",
  earning_created: "新增收入項目",
  deduction_created: "新增扣款項目",
  payroll_generated: "重算薪資",
  payroll_viewed: "查看薪資資料",
  final_pay_created: "建立離職結算",
  sensitive_employee_viewed: "查看員工敏感資料",
  report_downloaded: "下載報表",
  payslip_downloaded: "下載薪資單",
};

const roleLabels: Record<string, string> = {
  admin: "管理員",
  hr: "人事",
  manager: "主管",
  employee: "員工",
};

const entityLabels: Record<string, string> = {
  employee: "員工",
  payroll: "薪資",
  payroll_config: "薪資規則",
  earning_item: "收入項目",
  deduction_item: "扣款項目",
  final_pay: "離職結算",
  report: "報表",
  payslip: "薪資單",
  leave: "請假申請",
  setting_option: "公司設定",
  public_holiday: "公眾假期",
  leave_config: "請假設定",
};

const metadataLabels: Record<string, string> = {
  record_count: "記錄數量",
  employee_id: "員工系統編號",
  payroll_month: "薪資月份",
  employee_no: "員工編號",
  department: "部門",
  job_title: "職位",
  updated_fields: "更新欄位",
  amount: "金額",
  earning_type: "收入類型",
  deduction_type: "扣款類型",
  net_final_pay: "離職結算淨額",
  daily_salary_divisor: "日薪除數",
  mpf_rate: "MPF 比率",
  mpf_cap: "MPF 上限",
  min_relevant_income: "最低有關入息",
  max_relevant_income: "最高有關入息",
  category: "分類",
  value: "值",
  label: "名稱",
  format: "格式",
  leave_type: "假期類型",
  start_date: "開始日期",
  end_date: "結束日期",
  days: "日數",
  status: "狀態",
  previous_status: "原本狀態",
};

const valueLabels: Record<string, string> = {
  admin: "管理員",
  hr: "人事",
  manager: "主管",
  employee: "員工",
  active: "在職",
  probation: "試用中",
  terminated: "離職",
  suspended: "停職",
  annual: "年假",
  sick: "病假",
  unpaid: "無薪假",
  other: "其他",
  pending: "待批",
  approved: "已批准",
  rejected: "已拒絕",
  commission: "佣金",
  bonus: "花紅",
  reimbursement: "報銷",
  unpaid_leave: "無薪假扣款",
  absence: "缺勤",
  late: "遲到",
  department: "部門",
  position: "職位",
  work_location: "工作地點",
  employment_type: "合約類型",
  employment_status: "員工狀態",
  leave_type: "假期類型",
  earning_type: "收入項目類型",
  deduction_type: "扣款項目類型",
  csv: "CSV",
  xlsx: "Excel",
};

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(formatValue).join("、");
  }
  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  const raw = String(value);
  return valueLabels[raw] ?? raw;
}

function formatEntity(log: AuditLog) {
  const entity = entityLabels[log.entity_type] ?? log.entity_type;
  return log.entity_id ? `${entity} #${log.entity_id}` : entity;
}

function formatMetadata(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return "無";
  return entries
    .map(([key, value]) => {
      const label = metadataLabels[key] ?? key;
      const displayValue = formatValue(value);
      return `${label}：${displayValue}`;
    })
    .join(" / ");
}

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
                  <td>{formatEntity(log)}</td>
                  <td>{formatMetadata(log.metadata)}</td>
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
              <div className="mt-2 text-xs text-slate-500">{formatEntity(log)}</div>
              <div className="mt-1 text-xs text-slate-500">{formatMetadata(log.metadata)}</div>
            </div>
          ))}
          {logs.length === 0 ? <EmptyState title="暫時沒有稽核紀錄" /> : null}
        </div>
      </Card>
    </div>
  );
}
