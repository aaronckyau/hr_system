"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";

import { Button } from "@/components/ui";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import type { User, UserRole } from "@/lib/types";

const navItems: Array<{ href: string; label: string; description: string; roles?: UserRole[] }> = [
  { href: "/dashboard", label: "總覽", description: "今日重點" },
  { href: "/me/dashboard", label: "個人", description: "自助服務" },
  { href: "/manager/dashboard", label: "主管", description: "Team 狀況", roles: ["admin", "hr", "manager"] },
  { href: "/manager/team", label: "Team", description: "直屬員工", roles: ["admin", "hr", "manager"] },
  { href: "/manager/approvals", label: "審批", description: "待處理申請", roles: ["admin", "hr", "manager"] },
  { href: "/manager/team-calendar", label: "日曆", description: "Team Leave", roles: ["admin", "hr", "manager"] },
  { href: "/employees", label: "員工", description: "檔案與薪酬", roles: ["admin", "hr"] },
  { href: "/leaves", label: "請假", description: "申請與審批" },
  { href: "/payroll", label: "薪資", description: "MPF 與糧單" },
  { href: "/payroll-items", label: "薪資項目", description: "收入與扣款", roles: ["admin", "hr"] },
  { href: "/settings", label: "公司設定", description: "下拉選項", roles: ["admin", "hr"] },
  { href: "/audit", label: "稽核紀錄", description: "操作追蹤", roles: ["admin", "hr"] },
  { href: "/reports", label: "報表", description: "CSV / Excel", roles: ["admin", "hr"] },
];

const roleLabels: Record<UserRole, string> = {
  admin: "系統管理員",
  hr: "人事",
  manager: "主管",
  employee: "員工",
};

export function LayoutShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const visibleNavItems = navItems.filter((item) => !item.roles || item.roles.includes(user.role));
  const currentNavItem = visibleNavItems.find((item) => item.href === pathname);

  return (
    <div className="min-h-screen px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[280px_1fr] lg:gap-6">
        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="flex h-full flex-col rounded-[1.5rem] border border-white/70 bg-slate-950 p-3 text-white shadow-[0_28px_90px_rgb(15_23_42/0.22)] md:rounded-[2rem] md:p-4">
            <div className="rounded-[1.25rem] bg-white/8 p-4 ring-1 ring-white/10 md:rounded-[1.5rem] md:p-5">
              <div className="flex items-center justify-between gap-3 lg:block">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.28em] text-teal-200">Hong Kong SME HR</div>
                  <div className="mt-1 text-lg font-black tracking-[-0.04em] md:mt-3 md:text-2xl">MVP 控制台</div>
                  <div className="mt-1 text-xs text-slate-400 lg:hidden">{currentNavItem?.label ?? "工作台"}</div>
                </div>
                <Button
                  className="shrink-0 bg-white text-slate-950 hover:bg-teal-100 lg:hidden"
                  onClick={() => setMobileMenuOpen((current) => !current)}
                  type="button"
                >
                  {mobileMenuOpen ? "收起" : "選單"}
                </Button>
              </div>
              <div className="mt-2 hidden text-sm leading-6 text-slate-300 lg:block">給 30 人以下團隊使用的 HR、請假與薪資工作台。</div>
            </div>

            <nav className={`${mobileMenuOpen ? "grid" : "hidden"} mt-3 grid-cols-1 gap-2 sm:grid-cols-2 lg:mt-5 lg:block lg:space-y-2`}>
              {visibleNavItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`group block min-h-11 rounded-2xl px-3 py-3 transition lg:px-4 ${
                      active ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold lg:text-base">{item.label}</span>
                      <span className={`h-2 w-2 rounded-full ${active ? "bg-brand" : "bg-white/20 group-hover:bg-teal-200"}`} />
                    </div>
                    <div className={`mt-1 hidden text-xs lg:block ${active ? "text-slate-500" : "text-slate-500 group-hover:text-slate-300"}`}>{item.description}</div>
                  </Link>
                );
              })}
            </nav>

            <div className={`${mobileMenuOpen ? "block" : "hidden"} mt-3 rounded-[1.25rem] bg-white/8 p-3 ring-1 ring-white/10 lg:mt-auto lg:block lg:rounded-[1.5rem] lg:p-4`}>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal-200 text-sm font-black text-slate-950 lg:h-11 lg:w-11">
                  {user.full_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{user.full_name}</div>
                  <div className="text-xs text-slate-400">{roleLabels[user.role] ?? user.role}</div>
                </div>
              </div>
              <Button
                className="mt-3 w-full justify-center bg-white/10 text-white ring-1 ring-white/10 hover:bg-white hover:text-slate-950 lg:mt-4"
                variant="ghost"
                onClick={() => {
                  clearToken();
                  router.replace("/login");
                }}
              >
                登出
              </Button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 pb-16">{children}</main>
      </div>
    </div>
  );
}
