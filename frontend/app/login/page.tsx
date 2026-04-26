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
        setError("無法連線到後端服務，請確認 API 服務已正常啟動。");
        return;
      }
      setError(submissionError instanceof Error ? submissionError.message : "登入失敗");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#ccfbf1,transparent_40%),linear-gradient(180deg,#f8fafc_0%,#ecfeff_100%)] px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand">Hong Kong SME HR</div>
          <h1 className="mt-2 text-3xl font-semibold">系統登入</h1>
          <p className="mt-2 text-sm text-slate-500">預設管理員帳號已建立，可直接登入驗證 MVP 流程。</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium">電郵</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">密碼</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {error ? <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
          <button className="w-full bg-brand text-white" type="submit">
            登入
          </button>
        </form>
      </div>
    </div>
  );
}
