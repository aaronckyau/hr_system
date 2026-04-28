# 香港中小企 HR 系統 MVP - UAT 測試報告

測試日期：2026-04-28  
測試環境：本機開發環境  
Frontend：Next.js / http://127.0.0.1:3000  
Backend：FastAPI / http://127.0.0.1:8000  
Database：SQLite

## 1. 測試結論

本輪 UAT 結果：通過。

- 後端 API UAT：31 / 31 通過
- 瀏覽器頁面冒煙測試：12 / 12 通過
- 後端 pytest：12 / 12 通過
- 前端 production build：通過
- 主要錯誤 `Failed to fetch`：未再出現
- Admin / Employee 入口分離：已修正並通過重測

## 2. 本輪已修正問題

### 2.1 Audit Trail API 500

問題：`/api/audit` 回傳 500。

根本原因：Audit metadata 內有 `updated_fields: [...]` 陣列，但 schema 原本只接受 string / number / boolean / null，Pydantic 驗證失敗。

修復：將 `AuditLogRead.metadata` 改為 `dict[str, Any]`，並同步前端 `AuditLog.metadata` 型別為 `Record<string, unknown>`。

結果：`/api/audit` 已可正常回傳，UAT 顯示 audit logs count > 0。

### 2.2 Admin / Employee Portal 混在一起

問題：Admin 不應看到「個人」入口；Employee 也不應看到 HR 管理捷徑或新增員工入口。

修復：

- `/me/dashboard` 導航入口只給 `employee` role。
- Dashboard 依 `/auth/me` 的角色顯示不同內容。
- Employee dashboard 顯示「員工工作台」與個人常用功能。
- Admin / HR / Manager dashboard 顯示 HR 管理捷徑。
- Employee 不再看到 `/employees` 入口。

結果：瀏覽器重測通過。

## 3. API UAT 結果

測試檔案：`docs/uat-api-results.json`

| 模組 | 測試項目 | 結果 |
|---|---|---|
| 系統健康 | `/health` | PASS |
| 登入 | Admin login | PASS |
| 登入 | Manager login | PASS |
| 登入 | Employee login | PASS |
| Auth | `/auth/me` | PASS |
| 員工 | Admin list employees | PASS |
| 權限 | Employee only list self | PASS |
| 權限 | Manager list assigned team | PASS |
| 員工 | Create employee | PASS |
| 員工 | Update employee | PASS |
| 公司設定 | Create setting option | PASS |
| 公司設定 | List setting options | PASS |
| 請假設定 | Read / update leave config | PASS |
| 公眾假期 | Create / list public holiday | PASS |
| 請假 | Employee create leave request | PASS |
| 請假 | Manager approve direct report leave | PASS |
| Payroll | Read / update payroll config | PASS |
| 薪資項目 | Create earning item | PASS |
| 薪資項目 | Create deduction item | PASS |
| Payroll | Generate payroll | PASS |
| Payroll | Read payroll detail | PASS |
| 糧單 | Download payslip HTML | PASS |
| Final Pay | Create final pay | PASS |
| 報表 | Download IR56B CSV | PASS |
| 報表 | Download IR56B Excel | PASS |
| 稽核 | List audit logs | PASS |
| 權限 | Employee denied payroll config | PASS |
| 權限 | Employee denied other payroll detail | PASS |

## 4. 瀏覽器頁面 UAT 結果

測試檔案：`docs/uat-browser-results.json`

| 頁面 | 結果 |
|---|---|
| `/dashboard` | PASS |
| `/employees` | PASS |
| `/leaves` | PASS |
| `/payroll` | PASS |
| `/payroll-items` | PASS |
| `/settings` | PASS |
| `/audit` | PASS |
| `/reports` | PASS |
| `/manager/dashboard` | PASS |
| `/manager/team` | PASS |
| `/manager/approvals` | PASS |
| `/manager/team-calendar` | PASS |

檢查重點：

- 頁面可正常載入。
- 沒有 `Failed to fetch`。
- 沒有 `無法連線`。
- 沒有瀏覽器 console error。
- Admin dashboard 不顯示 Employee Portal 個人入口。
- Employee dashboard 不顯示 HR 新增員工入口。

## 5. 測試帳號

| 角色 | Email | 密碼 |
|---|---|---|
| Admin | `admin@company.com` | `admin123` |
| Manager | `ben.wong@demo.hk` | `password123` |
| Employee | `alice.chan@demo.hk` | `password123` |

## 6. 測試資料狀態

本輪 UAT 會新增測試資料，包括：

- `UAT Test Staff` 員工
- `UAT 測試職位` 公司設定選項
- `UAT 公司假期`
- UAT 請假申請
- UAT earning / deduction item
- UAT payroll record
- UAT final pay record

這些資料保留在本機 SQLite，用作後續展示與測試。如要轉為乾淨 demo database，建議下一步建立 seed / reset script。

## 7. 剩餘風險與建議

目前 MVP 可展示主要流程，但仍未達正式 production HRMS 要求。

- 糧單目前是 HTML 下載，不是 PDF；若要正式給員工下載，建議下一步做 PDF payslip。
- UAT 目前以 API + 頁面載入為主，尚未完整覆蓋所有前端表單互動細節。
- SQLite 適合 MVP，本地測試通過不代表多人同時使用可靠；正式部署建議 PostgreSQL。
- Payroll / MPF / IR56B 計算已可配置，但正式上線前仍需香港 HR / 會計覆核。
- UAT 測試資料會累積，建議建立可重置 demo seed。

## 8. 建議下一步

1. 建立 `seed-demo` / `reset-demo-db` 指令，方便每次 demo 前還原乾淨資料。
2. 補 PDF payslip。
3. 補前端表單 E2E 測試，覆蓋新增員工、提交請假、薪資項目、公司設定。
4. 建立 payroll lock / publish payslip 流程。
5. 把目前 UAT 流程整理成可重複執行的 automated test script。
