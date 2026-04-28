"use client";

import { Button, Card, PageHeader } from "@/components/ui";
import { downloadFile } from "@/lib/api";

export function ReportsClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="IR56B 報表"
        description="第一版支援 CSV 與 Excel 匯出，欄位先覆蓋 MVP 必要的人事與收入資料。"
      />
      <Card>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950">匯出報表</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">下載後可交由 HR、會計或稅務顧問覆核，再作正式申報用途。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => downloadFile("/reports/ir56b.csv", "IR56B-報表.csv")}>匯出 CSV</Button>
            <Button variant="secondary" onClick={() => downloadFile("/reports/ir56b.xlsx", "IR56B-報表.xlsx")}>匯出 Excel</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
