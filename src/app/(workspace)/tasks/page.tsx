import { AdminTasksClient } from "@/components/admin-tasks-client";
import { redirect } from "next/navigation";

import { PageTemplate } from "@/components/page-template";
import { StatCard } from "@/components/stat-card";
import { SurfaceCard } from "@/components/surface-card";
import { getTasksForUser } from "@/lib/db/tasks";
import { getCurrentSession } from "@/lib/session";

export default async function TasksPage() {
  const session = await getCurrentSession();
  const isAdmin = session!.role === "ADMIN";

  if (!isAdmin) {
    redirect("/apps");
  }

  let tasks: Awaited<ReturnType<typeof getTasksForUser>> = [];

  try {
    tasks = await getTasksForUser(session!.role, session!.sub, { limit: 100 });
  } catch (error) {
    console.error("[tasks] Failed to load task list.", error);
  }

  const total = tasks.length;
  const running = tasks.filter((task) => task.status === "RUNNING").length;
  const queued = tasks.filter((task) => task.status === "QUEUED").length;
  const succeeded = tasks.filter((task) => task.status === "SUCCEEDED").length;
  const failed = tasks.filter((task) => task.status === "FAILED").length;
  const syncFailed = tasks.filter((task) => task.syncStatus === "FAILED").length;

  const stats = [
    { label: "总任务", value: String(total), trend: "当前范围" },
    { label: "运行中", value: String(running), trend: "实时占用" },
    { label: "排队中", value: String(queued), trend: "等待处理" },
    { label: "成功", value: String(succeeded), trend: "已完成" },
    { label: "失败", value: String(failed), trend: "需关注" },
    { label: "同步异常", value: String(syncFailed), trend: "待处理" },
  ];

  return (
    <PageTemplate
        eyebrow="任务中心"
        title="任务中心"
        description="统一查看任务状态、执行链路和后台处理情况。"
      contentClassName="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <SurfaceCard title="任务列表" description="所有应用的任务统一入口。">
        <AdminTasksClient initialTasks={tasks} />
      </SurfaceCard>
    </PageTemplate>
  );
}
