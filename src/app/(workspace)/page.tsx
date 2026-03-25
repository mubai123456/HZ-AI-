import Link from "next/link";

import { AppCardHorizontal } from "@/components/app-card-horizontal";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { SurfaceCard } from "@/components/surface-card";
import { getEnabledAppsWithStats } from "@/lib/db/apps";
import { getDashboardSummary } from "@/lib/db/tasks";
import { getCurrentSession } from "@/lib/session";
import type { DashboardSummary } from "@/lib/types";

function buildEmptyDashboardSummary(isAdmin: boolean): DashboardSummary {
  const stats = [
    { label: "总任务", value: "0", trend: "暂无" },
    { label: "运行中", value: "0", trend: "空闲" },
    { label: "排队中", value: "0", trend: "正常" },
    { label: "成功率", value: "0%", trend: "暂无" },
  ];

  if (isAdmin) {
    stats.push({ label: "同步异常", value: "0", trend: "正常" });
  }

  return {
    stats,
    recentTasks: [],
    alerts: [],
  };
}

export default async function DashboardPage() {
  const session = await getCurrentSession();
  const isAdmin = session!.role === "ADMIN";
  let summary = buildEmptyDashboardSummary(isAdmin);
  let apps: Awaited<ReturnType<typeof getEnabledAppsWithStats>> = [];

  try {
    summary = await getDashboardSummary(session!.role, session!.sub);
  } catch (error) {
    console.error("[dashboard] Failed to load summary.", error);
  }

  try {
    apps = await getEnabledAppsWithStats();
  } catch (error) {
    console.error("[dashboard] Failed to load enabled apps.", error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="工作台"
        title="AI 应用工作台"
        description={
          isAdmin ? "查看今日任务、异常提醒和系统处理状态。" : "查看常用应用入口和需要关注的运行提醒。"
        }
        action={
          <Link href="/apps/all-in-one-image-2" className="btn btn-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建任务
          </Link>
        }
      />

      <div className={`grid gap-4 md:grid-cols-2 ${isAdmin ? "xl:grid-cols-5" : "xl:grid-cols-4"} stagger`}>
        {summary.stats.map((stat) => (
          <div key={stat.label} className="animate-fade-in-up">
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard title="常用应用" description="快速访问已启用的 AI 应用。">
          <div className="-mx-2 flex flex-col">
            {apps.map((app) => (
              <AppCardHorizontal key={app.code} app={app} runCount={app.runCount} />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard title="异常提醒" description="需要关注的任务状态。">
          {summary.alerts.length > 0 ? (
            <div className="space-y-3">
              {summary.alerts.map((alert, index) => (
                <div
                  key={`${alert}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <p className="text-subhead leading-relaxed text-amber-800">{alert}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-headline font-semibold text-gray-900">当前没有待处理异常</p>
              <p className="mt-1 text-subhead text-gray-500">系统和任务状态都比较稳定</p>
            </div>
          )}
        </SurfaceCard>
      </div>

      {isAdmin ? (
        <SurfaceCard
          title="最近任务"
          description="快速访问最近的任务记录。"
          action={
            <Link href="/tasks" className="btn btn-ghost text-[#0066DD] hover:bg-sky-50">
              查看全部
            </Link>
          }
        >
          <div className="soft-scroll -mx-2 overflow-x-auto px-2">
            <table className="table">
              <thead>
                <tr>
                  <th>任务 ID</th>
                  <th>应用</th>
                  <th>状态</th>
                  <th>同步</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentTasks.map((task) => (
                  <tr key={task.id} className="transition-colors hover:bg-slate-50">
                    <td>
                      <Link href={`/tasks/${task.id}`} className="font-medium text-[#0066DD] hover:text-blue-700">
                        {task.taskNo}
                      </Link>
                    </td>
                    <td className="text-gray-600">{task.appName}</td>
                    <td>
                      <StatusBadge value={task.status} />
                    </td>
                    <td>{task.syncStatus ? <StatusBadge value={task.syncStatus} /> : "--"}</td>
                    <td className="text-gray-400">{task.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
