"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";

import { apiFetch, clearToken, getToken } from "@/lib/api";
import type { User } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "總覽" },
  { href: "/employees", label: "員工" },
  { href: "/leaves", label: "請假" },
  { href: "/payroll", label: "薪資" },
  { href: "/payroll-items", label: "薪資項目" },
  { href: "/audit", label: "稽核紀錄" },
  { href: "/reports", label: "報表" },
];

const roleLabels: Record<string, string> = {
  admin: "系統管理員",
  hr: "人事",
  employee: "員工",
};

export function LayoutShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    apiFetch<User>("/auth/me")
      .then(setUser)
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  if (!user) {
    return <div className="p-8 text-sm text-slate-500">載入中...</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Hong Kong SME HR</div>
            <div className="text-lg font-semibold">MVP 控制台</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <div>{user.full_name}</div>
              <div className="text-slate-500">{roleLabels[user.role] ?? user.role}</div>
            </div>
            <button
              className="bg-slate-900 text-white"
              onClick={() => {
                clearToken();
                router.replace("/login");
              }}
            >
              登出
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2 text-sm ${active ? "bg-brand text-white" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
