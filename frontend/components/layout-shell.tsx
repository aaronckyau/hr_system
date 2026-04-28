"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui";
import { apiFetch, clearToken, getToken } from "@/lib/api";
import type { User, UserRole } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  description: string;
  group: "工作台" | "HR 管理" | "系統";
  roles?: UserRole[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "總覽", description: "今日重點", group: "工作台" },
  { href: "/me/dashboard", label: "個人", description: "員工自助服務", group: "工作台", roles: ["employee"] },
  { href: "/manager/dashboard", label: "主管", description: "Team 狀況", group: "工作台", roles: ["admin", "hr", "manager"] },
  { href: "/manager/team", label: "Team", description: "直屬員工", group: "工作台", roles: ["admin", "hr", "manager"] },
  { href: "/manager/approvals", label: "審批", description: "待處理申請", group: "工作台", roles: ["admin", "hr", "manager"] },
  { href: "/manager/team-calendar", label: "日曆", description: "Team Leave", group: "工作台", roles: ["admin", "hr", "manager"] },
  { href: "/employees", label: "員工", description: "檔案與薪酬", group: "HR 管理", roles: ["admin", "hr"] },
  { href: "/leaves", label: "請假", description: "申請與審批", group: "HR 管理" },
  { href: "/payroll", label: "薪資", description: "MPF 與糧單", group: "HR 管理" },
  { href: "/payroll-items", label: "薪資項目", description: "收入與扣款", group: "HR 管理", roles: ["admin", "hr"] },
  { href: "/settings", label: "公司設定", description: "下拉選項", group: "系統", roles: ["admin", "hr"] },
  { href: "/audit", label: "稽核紀錄", description: "操作追蹤", group: "系統", roles: ["admin", "hr"] },
  { href: "/reports", label: "報表", description: "CSV / Excel", group: "系統", roles: ["admin", "hr"] },
];

const roleLabels: Record<UserRole, string> = {
  admin: "系統管理員",
  hr: "人事",
  manager: "主管",
  employee: "員工",
};

function NavList({
  items,
  pathname,
  onNavigate,
  compact = false,
  userRole,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
  userRole: UserRole;
}) {
  const groups = Array.from(new Set(items.map((item) => item.group)));
  const groupLabels: Record<NavItem["group"], string> = {
    工作台: "工作台",
    "HR 管理": userRole === "employee" ? "員工自助" : "HR 管理",
    系統: "系統",
  };
  const groupDescriptions: Record<NavItem["group"], string> = {
    工作台: userRole === "employee" ? "個人入口與每日摘要" : "每日摘要與管理入口",
    "HR 管理": userRole === "employee" ? "請假與薪資紀錄" : "新增員工、請假、薪資",
    系統: "設定、稽核與報表",
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {groups.map((group) => (
        <div
          key={group}
          className={
            !compact && group === "HR 管理"
              ? "rounded-[1.35rem] border border-teal-100 bg-teal-50/55 p-2"
              : undefined
          }
        >
          {!compact ? (
            <div className="mb-2 px-2">
              <div className={`text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${group === "HR 管理" ? "text-brand" : "text-slate-400"}`}>
                {groupLabels[group]}
              </div>
              <div className="mt-1 text-xs text-slate-400">{groupDescriptions[group]}</div>
            </div>
          ) : null}
          <div className={compact ? "grid grid-cols-2 gap-2" : "space-y-1"}>
            {items
              .filter((item) => item.group === group)
              .map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`group block rounded-2xl px-3 py-3 transition ${
                      active
                        ? "bg-white text-teal-900 ring-1 ring-teal-100"
                        : group === "HR 管理"
                          ? "text-slate-700 hover:bg-white hover:text-slate-950"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{item.label}</span>
                      <span className={`h-2 w-2 rounded-full ${active ? "bg-brand" : "bg-slate-200 group-hover:bg-teal-200"}`} />
                    </div>
                    {!compact ? <div className={`mt-1 text-xs ${active ? "text-teal-700" : "text-slate-400"}`}>{item.description}</div> : null}
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LayoutShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const visibleNavItems = useMemo(() => {
    if (!user) {
      return [];
    }
    return navItems.filter((item) => !item.roles || item.roles.includes(user.role));
  }, [user]);

  const currentNavItem = visibleNavItems.find((item) => item.href === pathname);
  const bottomNavItems = visibleNavItems.filter((item) => ["/dashboard", "/employees", "/leaves", "/payroll"].includes(item.href)).slice(0, 4);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="rounded-3xl bg-white px-5 py-4 text-sm font-medium text-slate-500 shadow-sm ring-1 ring-slate-200">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-[1680px] gap-0 lg:grid-cols-[268px_1fr]">
        <aside className="sticky top-0 hidden h-screen p-4 lg:block">
          <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/92 p-3 shadow-sm">
            <div className="rounded-[1.25rem] bg-teal-50 p-4 ring-1 ring-teal-100">
              <div className="flex items-center justify-between gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-sm font-semibold text-brand ring-1 ring-teal-100">HR</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-brand">Hong Kong SME HR</div>
                  <div className="mt-1 truncate text-lg font-semibold tracking-[-0.035em] text-slate-950">MVP 控制台</div>
                </div>
              </div>
            </div>

            <nav className="mt-5 flex-1 overflow-y-auto pr-1">
              <NavList items={visibleNavItems} pathname={pathname} userRole={user.role} />
            </nav>

            <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-sm font-semibold text-brand ring-1 ring-slate-200">
                  {user.full_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950">{user.full_name}</div>
                  <div className="text-xs text-slate-500">{roleLabels[user.role] ?? user.role}</div>
                </div>
              </div>
              <Button
                className="mt-3 w-full"
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

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#fbfdfb]/88 px-4 py-3 backdrop-blur-xl lg:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Hong Kong SME HR</div>
                <div className="mt-1 truncate text-lg font-semibold tracking-[-0.035em] text-slate-950 md:text-xl">{currentNavItem?.label ?? "工作台"}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden rounded-2xl bg-white px-4 py-2 text-right shadow-sm ring-1 ring-slate-200 md:block">
                  <div className="text-sm font-semibold text-slate-950">{user.full_name}</div>
                  <div className="text-xs text-slate-500">{roleLabels[user.role] ?? user.role}</div>
                </div>
                <Button className="lg:hidden" variant="ghost" onClick={() => setDrawerOpen(true)} type="button">
                  選單
                </Button>
              </div>
            </div>
          </header>

          <main className="app-shell-surface min-h-[calc(100vh-73px)] px-4 py-5 pb-28 md:px-6 md:py-7 lg:pb-10">
            <div className="mx-auto max-w-[1280px]">{children}</div>
          </main>
        </div>
      </div>

      <nav className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/92 px-3 py-2 shadow-[0_-12px_32px_rgb(15_23_42/0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
          {bottomNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`rounded-2xl px-2 py-2 text-center text-xs font-semibold transition ${active ? "bg-teal-50 text-brand ring-1 ring-teal-100" : "text-slate-500 hover:bg-slate-50"}`}>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-teal-900/10 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute bottom-0 left-0 right-0 max-h-[88dvh] overflow-y-auto rounded-t-[2rem] bg-white p-4 shadow-[0_-18px_50px_rgb(15_23_42/0.12)]">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-[1.5rem] bg-teal-50 p-4 ring-1 ring-teal-100">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Hong Kong SME HR</div>
                <div className="mt-1 text-xl font-semibold text-slate-950">功能選單</div>
              </div>
              <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
                關閉
              </Button>
            </div>
            <NavList items={visibleNavItems} pathname={pathname} onNavigate={() => setDrawerOpen(false)} compact userRole={user.role} />
            <div className="mt-5 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-950">{user.full_name}</div>
              <div className="mt-1 text-xs text-slate-500">{roleLabels[user.role] ?? user.role}</div>
              <Button
                className="mt-4 w-full"
                variant="ghost"
                onClick={() => {
                  clearToken();
                  router.replace("/login");
                }}
              >
                登出
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
