"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useWorkbenchHeaderContent } from "@/components/workbench-header-slot";
import { getNavigationGroups, type NavGroup, type NavItem } from "@/lib/navigation";
import type { SiteBrandingConfig } from "@/lib/site-config";
import type { UserRole } from "@/lib/types";

type WorkbenchShellProps = {
  children: React.ReactNode;
  branding: SiteBrandingConfig;
  user: {
    displayName: string;
    role: UserRole;
  };
  sidebarCollapsedByDefault?: boolean;
};

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function getCurrentLocation(pathname: string, navigationGroups: NavGroup[]) {
  for (const group of navigationGroups) {
    const item = group.items.find((entry) => isActivePath(pathname, entry.href));
    if (item) {
      return { group, item };
    }
  }

  return {
    group: navigationGroups[0] ?? null,
    item: navigationGroups[0]?.items[0] ?? null,
  };
}

function NavigationList({
  navigationGroups,
  pathname,
  onNavigate,
}: {
  navigationGroups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-5">
      {navigationGroups.map((group) => (
        <section key={group.id} className="space-y-2">
          <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--label-quaternary)]">
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${
                      active
                        ? "bg-[var(--accent)] !text-white shadow-md shadow-blue-500/25 [&_*]:!text-white"
                        : "text-[var(--label-secondary)] hover:bg-[var(--gray-4)] hover:text-[var(--label-primary)]"
                    }`}
                  >
                    <span className="text-[15px] font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function BrandBlock({
  branding,
  role,
}: {
  branding: SiteBrandingConfig;
  role: UserRole;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#0066DD] to-indigo-600 shadow-md shadow-blue-500/20">
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--label-tertiary)]">
          {role === "ADMIN" ? branding.adminWorkspaceLabel : branding.workspaceLabel}
        </p>
        <p className="text-[17px] font-semibold text-[var(--label-primary)]">{branding.siteName}</p>
      </div>
    </div>
  );
}

function CurrentLocationCard({
  location,
}: {
  location: { group: NavGroup | null; item: NavItem | null };
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-[var(--bg-elevated)] p-4 shadow-sm dark:border-white/10">
      <p className="text-label text-[var(--label-tertiary)]">当前分组</p>
      <p className="mt-1 text-headline font-semibold text-[var(--label-primary)]">
        {location.group?.label ?? "工作入口"}
      </p>
      <p className="mt-1 text-footnote text-[var(--label-tertiary)]">
        {location.item?.description ?? "保持结构清晰，优先完成高频任务。"}
      </p>
    </div>
  );
}

export function WorkbenchShell({
  children,
  branding,
  user,
  sidebarCollapsedByDefault = false,
}: WorkbenchShellProps) {
  const pathname = usePathname();
  const navigationGroups = getNavigationGroups(user.role, branding.navLabels);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!sidebarCollapsedByDefault);
  const currentLocation = getCurrentLocation(pathname, navigationGroups);
  const customHeaderContent = useWorkbenchHeaderContent();

  return (
    <div className="app-shell flex min-h-screen">
      <aside
        className={`hidden shrink-0 transition-[width] duration-300 lg:flex ${
          sidebarOpen ? "w-[280px]" : "w-0 overflow-hidden"
        }`}
      >
        {sidebarOpen ? (
          <div className="flex h-screen w-[280px] flex-col border-r border-black/5 bg-[var(--bg-secondary)] dark:border-white/10">
            <div className="border-b border-black/5 p-5 dark:border-white/10">
              <BrandBlock branding={branding} role={user.role} />
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <NavigationList navigationGroups={navigationGroups} pathname={pathname} />
            </nav>

            <div className="border-t border-black/5 p-4 dark:border-white/10">
              <CurrentLocationCard location={currentLocation} />
            </div>
          </div>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-black/5 bg-[var(--bg-primary)]/80 px-5 backdrop-blur-xl dark:border-white/10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="-ml-2 rounded-lg p-2 transition-colors hover:bg-[var(--bg-secondary)] lg:hidden"
              aria-label="打开导航"
            >
              <svg className="h-5 w-5 text-[var(--label-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <button
              onClick={() => setSidebarOpen((open) => !open)}
              className="hidden items-center gap-2 rounded-lg px-3 py-1.5 text-[var(--label-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] lg:flex"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                )}
              </svg>
              <span className="text-footnote font-medium">{sidebarOpen ? "收起" : "展开"}</span>
            </button>

            {customHeaderContent ? (
              <div className="min-w-0 flex-1">{customHeaderContent}</div>
            ) : (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--label-quaternary)]">
                  {currentLocation.group?.label ?? "工作入口"}
                </p>
                <p className="text-headline font-semibold text-[var(--label-primary)]">
                  {currentLocation.item?.label ?? branding.siteName}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-4 py-1.5 text-subhead text-[var(--label-quaternary)] md:flex">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span>搜索</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-subhead font-semibold text-[var(--label-primary)]">{user.displayName}</p>
                <p className="text-caption text-[var(--label-tertiary)]">{user.role === "ADMIN" ? "管理员" : "成员"}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0066DD] to-indigo-600 text-headline font-semibold text-white shadow-md">
                {user.displayName.charAt(0)}
              </div>
            </div>

            <form action="/api/auth/logout" method="post">
              <button className="rounded-lg px-4 py-1.5 text-subhead text-[var(--label-tertiary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--label-secondary)]">
                退出
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 bg-[var(--bg-secondary)] p-6">{children}</main>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 cursor-default bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="关闭导航"
          />
          <aside className="absolute inset-y-0 left-0 w-[320px] border-r border-black/5 bg-[var(--bg-primary)] shadow-xl dark:border-white/10">
            <div className="flex items-center justify-between border-b border-black/5 p-5 dark:border-white/10">
              <BrandBlock branding={branding} role={user.role} />
              <button
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg p-2 transition-colors hover:bg-[var(--bg-secondary)]"
                aria-label="关闭导航"
              >
                <svg className="h-5 w-5 text-[var(--label-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="p-3">
              <NavigationList
                navigationGroups={navigationGroups}
                pathname={pathname}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </nav>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
