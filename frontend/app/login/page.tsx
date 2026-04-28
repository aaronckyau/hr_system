"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, setToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const response = await apiFetch<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(response.access_token);
      router.push("/dashboard");
    } catch (submissionError) {
      if (submissionError instanceof TypeError || (submissionError instanceof Error && submissionError.message === "Failed to fetch")) {
        setError("無法連線到後端服務，請確認 FastAPI API 服務已正常啟動。");
        return;
      }
      setError(submissionError instanceof Error ? submissionError.message : "登入失敗");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <main className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm md:grid-cols-[0.95fr_1.05fr]">
        <section className="bg-gradient-to-br from-teal-50 via-white to-amber-50 p-6 md:p-8 lg:p-10">
          <div className="flex h-full min-h-[320px] flex-col justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.26em] text-brand">Hong Kong SME HR</div>
              <h1 className="mt-6 max-w-lg text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-slate-950 md:text-5xl">
                簡單處理員工、請假與薪資
              </h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-slate-600 md:text-base">
                為 30 人以下香港公司設計，集中管理 HR 日常流程，減少 Excel、Email 與 WhatsApp 來回追蹤。
              </p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
              {["員工檔案", "請假審批", "薪資 MPF"].map((item) => (
                <div key={item} className="rounded-2xl bg-white/80 p-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="mb-7">
              <h2 className="text-3xl font-semibold tracking-[-0.045em] text-slate-950">系統登入</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">預設管理員帳號已建立，可直接登入驗證 MVP 流程。</p>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                <input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{error}</div> : null}
              <button className="w-full bg-brand text-white shadow-sm shadow-brand/15 hover:bg-teal-700" type="submit">
                登入
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
