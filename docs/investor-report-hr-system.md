# 香港中小企 HR 系統投資人簡報報告

版本：MVP / Demo Stage  
日期：2026-04-28  
產品定位：香港 5 至 30 人中小企 HR Management System

## 1. Executive Summary

本系統是一套針對香港中小企設計的 HR Management System，目標是協助公司把員工資料、請假、薪資、MPF、IR56B 報表及稽核紀錄，由 Excel、Email、WhatsApp 及人手流程，集中到一個可管理、可追蹤、可逐步合規化的平台。

目前產品已完成 MVP，可展示核心 HR 流程，包括：

- 員工資料管理
- 請假申請與審批
- 薪資與 MPF 計算
- 收入項目與扣款項目
- IR56B CSV / Excel 匯出
- 糧單 HTML 下載
- 公司設定可配置
- Manager / Employee / Admin 權限分流
- Audit Trail 操作紀錄

本 MVP 的目標不是立即取代大型企業 HRMS，而是先服務 30 人以下香港公司，提供一個比 Excel 更安全、更容易追蹤、更本地化的 HR 操作平台。

## 2. 市場痛點

香港很多 5 至 30 人中小企仍然使用 Excel、Email、WhatsApp 及人手方式處理 HR 工作。

常見問題包括：

- 員工資料分散在 Excel、PDF、Email 及紙本文件。
- 請假申請靠 WhatsApp 或 Email，難以追蹤審批狀態。
- 年假結餘、人手安排、請假衝突容易出錯。
- 薪資、MPF、無薪假、bonus、commission 等計算依賴人手。
- IR56B、Payroll、MPF 報表整理耗時。
- 沒有完整 Audit Trail，出現爭議時難以追溯誰改過資料。
- 員工無法自助查看假期、薪資及個人資料。
- 香港本地 HR 規則與中小企實際流程，需要比通用海外 SaaS 更貼地的設計。

## 3. 目標客戶

### 主要客戶

- 香港 5 至 30 人公司
- Startup
- SME
- 專業服務公司
- 小型貿易公司
- Agency
- Retail / Operations 小團隊

### 主要使用者

- HR / Admin
- 公司 Founder / Owner
- Finance / Accounting
- Department Manager
- 一般員工

## 4. 產品價值

本系統為中小企提供以下價值：

- 減少 Excel 錯誤及重複輸入。
- 將請假、薪資、MPF、IR56B 報表集中管理。
- 讓 HR/Admin 不需要改 code 也能維護部門、職位、工作地點、合約類型、假期類型及薪資項目。
- 讓 Manager 只查看自己 team 的資料及審批請假。
- 讓 Employee 只查看自己的資料、假期及薪資紀錄。
- 所有敏感操作可留下 Audit Trail。
- 以香港 HR 場景作為產品核心，而不是只套用海外 HR 系統流程。

## 5. 目前完成度

目前系統已完成可運行 MVP，並已完成本機 UAT。

### 已完成功能

| 模組 | 狀態 | 說明 |
|---|---|---|
| 登入 | 已完成 | JWT login，支援 Admin / HR / Manager / Employee |
| 員工資料 | 已完成 | 新增、更新、列表、敏感資料權限控制 |
| 公司設定 | 已完成 | 部門、職位、工作地點、合約類型、員工狀態等可配置 |
| Manager Assignment | 已完成 | 員工可指定直屬主管 |
| 請假系統 | 已完成 | 申請、審批、半日假、工作天計算、公眾假期設定 |
| 薪資計算 | 已完成 | Base salary、allowance、earning、deduction、MPF |
| 收入項目 | 已完成 | Bonus、commission、reimbursement、other |
| 扣款項目 | 已完成 | Unpaid leave、absence、late、other |
| Final Pay | 已完成 | 離職結算初版 |
| IR56B 報表 | 已完成 | CSV / Excel 匯出 |
| 糧單 | 已完成初版 | HTML payslip 下載 |
| Audit Trail | 已完成 | 員工、薪資、設定、報表下載等操作紀錄 |
| Admin / Employee 分流 | 已完成 | Admin 不顯示個人入口；Employee 不顯示 HR 管理入口 |
| UI / UX | 已完成初版 | 清新、簡單、responsive layout |
| UAT | 已完成 | API 31/31 pass，Browser 12/12 pass |

## 6. UAT 測試結果

最近一次 UAT 結果：

- API UAT：31 / 31 通過
- Browser UAT：12 / 12 通過
- Backend pytest：12 / 12 通過
- Frontend production build：通過
- `Failed to fetch`：未再出現
- Admin / Employee 權限入口分離：通過

完整技術 UAT 報告：

- `docs/uat-report-2026-04-28.md`

## 7. 產品架構

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- Responsive UI
- Role-based navigation

### Backend

- Python FastAPI
- JWT Authentication
- SQLModel ORM
- REST API
- Audit logging

### Database

- SQLite for MVP
- 後續 production 建議升級至 PostgreSQL

### Export

- CSV export
- Excel export
- Payslip HTML export

## 8. 權限設計

系統目前已支援 4 種角色：

| 角色 | 權限方向 |
|---|---|
| Admin | 全系統管理、員工、設定、薪資、報表、Audit |
| HR | HR 日常操作、員工、請假、薪資、報表 |
| Manager | 查看直屬員工、審批直屬員工請假 |
| Employee | 查看自己資料、自己的請假及薪資紀錄 |

目前已完成基礎權限隔離：

- Employee 只能看到自己資料。
- Manager 只能看到被指定為直屬主管的員工。
- Admin / HR 可管理員工與設定。
- Employee 不可查看 payroll config。
- Employee 不可查看其他員工薪資明細。

## 9. 香港本地化能力

系統已開始支援香港 HR 場景：

- MPF 計算初版
- 香港薪資項目分類
- 無薪假扣款
- Bonus / Commission
- Taxable / Non-taxable 分類
- IR56B CSV / Excel 初版
- 公眾假期可配置
- 新員工 MPF 首 30 日例外設定
- Payroll daily salary divisor 可配置

重要說明：

本系統所有法例、薪資及 MPF 計算目前應視為 MVP 產品邏輯。正式商用前，需由香港 HR 專業人士、會計或法律顧問覆核。

## 10. 商業模式建議

### SaaS Subscription

按公司人數收費：

- 1 至 10 人：入門版
- 11 至 30 人：標準版
- 31 人以上：進階版或 custom plan

### Setup Fee

對中小企可收一次性 setup fee：

- 員工資料匯入
- 假期政策設定
- Payroll / MPF 設定
- IR56B 格式設定

### Add-on 收費

可作為增值模組：

- PDF payslip
- Payroll approval
- Document management
- Attendance / clock-in
- Onboarding / offboarding
- Bank autopay export
- Xero / QuickBooks integration
- AI HR assistant

## 11. 競爭優勢

### 對比 Excel

- 更少手工錯誤
- 有權限控制
- 有 Audit Trail
- 有統一流程
- 可匯出報表

### 對比大型 HRMS

- 更適合 5 至 30 人公司
- 功能不過度複雜
- 成本較低
- 更快導入
- 更貼近香港 SME 實際流程

### 對比海外 SaaS

- 香港 MPF / IR56B / 假期場景優先
- 繁體中文介面
- 可配置本地公司政策
- 可逐步加入香港本地 payroll / compliance features

## 12. Roadmap

### Phase 1：MVP Core HR

狀態：已完成主要部分。

- 登入與角色
- 員工資料
- 公司設定
- 請假
- Payroll / MPF
- IR56B export
- Audit Trail
- Responsive UI

### Phase 2：Demo / Sales Ready

建議下一步：

- 建立 clean demo seed / reset demo database
- PDF payslip
- 更完整 payroll detail breakdown
- 更完整 frontend form validation
- Demo dashboard with realistic business data
- Investor / client presentation material

### Phase 3：Production Foundation

- PostgreSQL migration
- Docker deployment
- Backup / restore
- HTTPS
- Rate limiting
- Better password policy
- 2FA for Admin / HR
- More complete audit policy
- File upload security

### Phase 4：HR Workflow Expansion

- Onboarding workflow
- Offboarding workflow
- Document management
- Attendance / clock-in
- Leave calendar
- Payroll approval / lock
- Payslip publish flow

### Phase 5：Advanced Product

- AI HR assistant
- Policy Q&A
- Payroll anomaly detection
- Xero / QuickBooks integration
- Bank autopay export
- HR analytics
- Multi-company support

## 13. 目前限制

目前 MVP 尚未包括以下 production 級能力：

- PDF payslip
- Attendance clock-in
- Document upload and file permission
- Full onboarding / offboarding workflow
- Payroll lock / approval / publish
- Email notification
- 2FA
- PostgreSQL production database
- Automated backup
- Virus scanning
- Full legal compliance review

## 14. 投資角度摘要

這個產品的投資價值在於：

- 香港 SME HR digitalization 仍有大量 Excel-based workflow。
- 30 人以下公司需要簡單、低成本、可快速上手的 HR 工具。
- 本產品可以先從 HR core + payroll + leave + MPF + IR56B 切入。
- MVP 已完成可展示版本，不只是概念。
- 後續可延伸至 onboarding、attendance、document、AI assistant 及 payroll compliance。
- 若產品定位清晰，可以走 niche SaaS：香港 SME HRMS。

## 15. 建議投資人 Demo Flow

建議展示順序：

1. Admin 登入。
2. Dashboard 查看員工、請假、薪資摘要。
3. 新增員工，展示公司設定下拉選項。
4. 切換 Manager，展示直屬員工及請假審批。
5. 切換 Employee，展示個人工作台與權限隔離。
6. 建立請假申請並由 Manager approve。
7. 建立 bonus / deduction。
8. Generate payroll。
9. 查看 payroll detail 與 MPF 計算。
10. 匯出 IR56B CSV / Excel。
11. 查看 Audit Trail。

## 16. 結論

目前 HR 系統已達 MVP Demo Ready 狀態，核心功能可運行，主要流程已通過 UAT。下一階段應集中在兩個方向：

1. Demo / Sales Ready：改善 demo data、PDF payslip、報表展示、簡化操作流程。
2. Production Foundation：PostgreSQL、部署、備份、安全、權限及合規強化。

若目標客戶是 30 人以下香港公司，建議保持產品簡單、清晰、低導入成本，先解決最痛的 HR admin、leave、payroll、MPF、IR56B 問題，再逐步擴展至完整 HRMS。
