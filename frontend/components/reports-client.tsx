"use client";

import { downloadFile } from "@/lib/api";

export function ReportsClient() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold">IR56B 報表</h1>
        <p className="mt-2 text-sm text-slate-500">第一版支援 CSV 與 Excel 匯出，欄位先覆蓋 MVP 必要的人事與收入資料。</p>
        <div className="mt-4 flex gap-3">
          <button className="bg-brand text-white" onClick={() => downloadFile("/reports/ir56b.csv", "IR56B-報表.csv")}>
            匯出 CSV
          </button>
          <button className="bg-slate-900 text-white" onClick={() => downloadFile("/reports/ir56b.xlsx", "IR56B-報表.xlsx")}>
            匯出 Excel
          </button>
        </div>
      </section>
    </div>
  );
}
