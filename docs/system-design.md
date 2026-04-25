# 系統設計

## 1. 系統架構

### Repo 結構

```text
HR/
├─ frontend/   # Next.js 使用者介面
├─ backend/    # FastAPI API
└─ docs/       # 設計文件
```

### 邏輯分層

- 前端
  - App Router 頁面
  - Client Components 呼叫 API
  - JWT Token 存在 `localStorage`
  - API Base URL 由 `NEXT_PUBLIC_API_BASE_URL` 控制
- 後端
  - `routers`：API 路由
  - `models`：SQLModel 資料表
  - `schemas`：請求 / 回應模型
  - `services`：薪資與匯出邏輯
  - `core`：設定與安全性
- CORS
  - 本機開發放行 `localhost:3000` 與 `127.0.0.1:3000`
- 資料庫
  - SQLite 單檔資料庫，適合 MVP

## 2. 資料庫 Schema

### `user`

- `id`
- `email`
- `full_name`
- `password_hash`
- `role`（`admin`、`hr`、`employee`）
- `is_active`
- `created_at`

### `employee`

- `id`
- `user_id`
- `employee_no`
- `hk_id`
- `tax_file_no`
- `department`
- `job_title`
- `employment_start_date`
- `employment_end_date`
- `employment_type`
- `phone`
- `address`
- `annual_leave_balance`
- `base_salary`
- `allowances`
- `bank_name`
- `bank_account_no`

### `leave_request`

- `id`
- `employee_id`
- `leave_type`
- `start_date`
- `end_date`
- `days`
- `reason`
- `status`
- `approver_user_id`
- `created_at`

### `payroll_record`

- `id`
- `employee_id`
- `payroll_month`
- `base_salary`
- `allowances`
- `gross_income`
- `taxable_income`
- `non_taxable_income`
- `deductions`
- `relevant_income`
- `employee_mpf`
- `employer_mpf`
- `net_salary`
- `status`
- `created_at`

## 3. API 路由

### 認證

- `POST /api/auth/login`
- `GET /api/auth/me`

### 員工

- `GET /api/employees`
- `POST /api/employees`
- `PATCH /api/employees/{employee_id}`

### 請假

- `GET /api/leaves`
- `POST /api/leaves`
- `PATCH /api/leaves/{leave_id}/status`

### 薪資

- `GET /api/payroll`
- `GET /api/payroll/config`
- `PUT /api/payroll/config`
- `GET /api/payroll/earnings`
- `POST /api/payroll/earnings`
- `GET /api/payroll/deductions`
- `POST /api/payroll/deductions`
- `GET /api/payroll/final-pay`
- `POST /api/payroll/final-pay`
- `GET /api/payroll/{payroll_id}`
- `POST /api/payroll/generate`

### 報表

- `GET /api/reports/ir56b.csv`
- `GET /api/reports/ir56b.xlsx`

## 4. 前端頁面

- `/login`
- `/dashboard`
- `/employees`
- `/leaves`
- `/payroll`
- `/reports`

## 5. 開發步驟

1. 建立前後端骨架與環境設定
2. 建立 SQLModel Schema 與 SQLite 初始化
3. 實作 JWT 登入與角色驗證
4. 完成員工 CRUD MVP
5. 完成請假申請與審批流程
6. 完成薪資與 MPF 計算
7. 完成 IR56B CSV / Excel 匯出
8. 串接前端頁面與 API
9. 加入測試、輸入驗證與部署設定

## 6. MVP 範圍與風險

### 已納入

- 可登入
- 預設 admin 種子帳號可直接驗證
- 可新增員工
- 可提交與審批請假
- 可生成薪資
- 可匯出 IR56B 報表

### 風險 / 後續建議

- SQLite 不適合多人並發與正式環境
- JWT 存在 `localStorage`，正式版應改用 httpOnly Cookie
- MPF 與 IR56B 規則目前仍屬 MVP 簡化版本，上線前需逐條對照香港法規與申報格式
- 請假天數目前按曆日計算，未涵蓋公眾假期與半日假規則
