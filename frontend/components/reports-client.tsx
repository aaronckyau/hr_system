"use client";

import { useState } from "react";

import { Button, Card, PageHeader } from "@/components/ui";
import { downloadFile } from "@/lib/api";

export function ReportsClient() {
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear()));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="IR56B 報表"
        description="第一版支援 CSV 與 Excel 匯出，欄位先覆蓋 MVP 必要的人事與收入資料。"
      />
      <Card>
        <div className="grid gap-5 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">匯出報表</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">下載後可交由 HR、會計或稅務顧問覆核，再作正式申報用途。MVP 目前匯出全公司員工資料，年度欄位用作檔名及操作提示；正式年度篩選會在報表擴展加入後端條件。</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">年度</label>
            <input value={taxYear} onChange={(event) => setTaxYear(event.target.value)} inputMode="numeric" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => downloadFile("/reports/ir56b.csv", `IR56B-${taxYear}-報表.csv`)}>匯出 CSV</Button>
            <Button variant="secondary" onClick={() => downloadFile("/reports/ir56b.xlsx", `IR56B-${taxYear}-報表.xlsx`)}>匯出 Excel</Button>
          </div>
        </div>
        <div className="mt-5 rounded-[1.25rem] bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-100">
          匯出範圍：全公司員工、目前資料快照。下一階段會加入月份、員工、部門及報表類型篩選，避免 HR 不清楚下載內容。
        </div>
      </Card>
    </div>
  );
}
