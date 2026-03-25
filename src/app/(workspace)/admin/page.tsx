import Link from "next/link";

import { PageTemplate } from "@/components/page-template";
import { StatCard } from "@/components/stat-card";
import { SurfaceCard } from "@/components/surface-card";
import { getAdminOverview } from "@/lib/db/admin";

export default async function AdminPage() {
  const overview = await getAdminOverview();

  return (
    <PageTemplate
        eyebrow="系统管理"
        title="系统管理"
        description="管理员视角：先用轻量但清晰的方式把健康状态、关键入口和模板配置能力组织起来。"
      contentClassName="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {overview.metrics.map((metric) => (
          <StatCard key={metric.label} {...metric} trend="系统视角" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SurfaceCard title="应用健康度" description="实时数据来自数据库统计。">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-slate-700/50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{overview.appHealth.appName} 成功率</p>
                <span className="text-sm font-semibold text-slate-950 dark:text-slate-50">{overview.appHealth.successRate}%</span>
              </div>
              <div className="mt-4 h-3 rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className="h-3 rounded-full bg-slate-950 dark:bg-slate-300"
                  style={{ width: `${overview.appHealth.successRate}%` }}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["今日调用", String(overview.appHealth.todayCalls)],
                ["平均耗时", overview.appHealth.avgDuration],
                ["队列峰值", String(overview.appHealth.queuePeak)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700/50 dark:bg-slate-800">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-100">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard title="管理入口" description="快速访问系统管理功能。">
          <div className="grid gap-3 md:grid-cols-2">
            {overview.managementLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover-lift btn-press rounded-[22px] border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700/50 dark:bg-slate-800/50"
              >
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">{link.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{link.description}</p>
              </Link>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </PageTemplate>
  );
}
