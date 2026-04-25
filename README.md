# 香港中小企 HR 系統 MVP

技術棧：

- 前端：Next.js + Tailwind CSS
- 後端：FastAPI + SQLModel
- 資料庫：SQLite
- 認證：JWT
- 匯出：CSV / Excel

## 系統架構

- `frontend/`：Next.js App Router 管理介面
- `backend/`：FastAPI API、資料模型、認證、薪資與報表邏輯
- `docs/system-design.md`：架構、Schema、API、頁面與開發步驟

## 核心功能

- 員工資料管理
- 請假系統
- 薪資與 MPF 計算
- IR56B CSV / Excel 報表
- `人事 / 管理員 + 員工` 雙角色 JWT 登入

## 啟動方式

### 後端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

預設管理員：

- 電郵：`admin@company.com`
- 密碼：`admin123`

### 前端

```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run build
npm run start
```

前端 API 位址透過 `frontend/.env.local` 設定：

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
```

本機開發支援：

- `http://localhost:3000`
- `http://127.0.0.1:3000`

### 建議啟動方式

不要再用 `npm run dev` 配合 IAB。這個環境下 `next dev` 容易出現 webpack chunk 或 `.next` 快取失效。

改用 repo root 的腳本：

```powershell
.\run-backend.ps1
.\run-frontend.ps1
```

或直接一鍵開兩個視窗：

```powershell
.\run-all.ps1
```

## MVP 假設

- MPF 採用月薪有關入息 5%，僱員供款最低有關入息門檻為 `HKD 7,100`，供款上限按 `HKD 30,000` 計，最高 `HKD 1,500`
- IR56B 先輸出 MVP 欄位集合，不是完整法定 eTAX 申報格式
- 無薪假會按 `base_salary / 30 * days` 扣減
