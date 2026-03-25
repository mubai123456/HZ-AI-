import { redirect } from "next/navigation";

import { PageTemplate } from "@/components/page-template";
import { StatCard } from "@/components/stat-card";
import { SurfaceCard } from "@/components/surface-card";
import { SyncIncidentsClient } from "@/components/sync-incidents-client";
import { getSyncOverview } from "@/lib/db/sync";
import { getCurrentSession } from "@/lib/session";

export default async function SyncPage() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/");
  }

  const sync = await getSyncOverview();

  return (
    <PageTemplate
        eyebrow="飞书同步"
        title="飞书同步中心"
        description="查看飞书同步链路、异常记录和重试情况。"
      contentClassName="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "同步成功", value: String(sync.successCount), trend: "累计记录" },
          { label: "同步失败", value: String(sync.failedCount), trend: "待处理" },
          { label: "待重试", value: String(sync.retryCount), trend: "可补救" },
          { label: "成功率", value: sync.successRate, trend: "当前表现" },
        ].map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <SurfaceCard title="最近同步异常" description="点击重试按钮重新同步到飞书。">
        <SyncIncidentsClient incidents={sync.incidents} />
      </SurfaceCard>
    </PageTemplate>
  );
}
