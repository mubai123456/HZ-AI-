import { notFound } from "next/navigation";

import { AssetThumbnail } from "@/components/asset-thumbnail";
import { PageTemplate } from "@/components/page-template";
import { StatusBadge } from "@/components/status-badge";
import { SurfaceCard } from "@/components/surface-card";
import { TaskOutputDownloadActions } from "@/components/task-output-download-actions";
import { getTaskById } from "@/lib/db/tasks";
import { getCurrentSession } from "@/lib/session";
import { getDisplayTaskId } from "@/lib/task-identity";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    notFound();
  }

  const { id } = await params;
  const isAdmin = session.role === "ADMIN";
  const task = await getTaskById(id, {
    role: session.role,
    userId: session.sub,
  });

  if (!task) {
    notFound();
  }

  const showInputs = task.inputAssets.length > 0 || Boolean(task.prompt) || Object.keys(task.params).length > 0;
  const showOwner = isAdmin || !task.isSharedResult;

  const summaryMetrics = [
    { label: "站内编号", value: task.siteTaskNo },
    { label: "任务 ID", value: getDisplayTaskId(task) },
    { label: "应用", value: task.appName },
    ...(task.estimatedPriceLabel ? [{ label: "预计费用", value: task.estimatedPriceLabel }] : []),
    ...(showOwner ? [{ label: "创建人", value: task.ownerName }] : []),
    { label: "创建时间", value: task.createdAt },
    { label: "当前状态", value: task.status },
    ...(isAdmin
      ? [
          { label: "来源状态", value: task.providerStatus },
          { label: "同步状态", value: task.syncStatus ?? "-" },
        ]
      : []),
  ];

  return (
    <PageTemplate
      eyebrow="任务详情"
      title={task.siteTaskNo}
      description={
        task.isSharedResult && !isAdmin
          ? "这是团队共享的成功结果页，仅展示当前可见的结果内容。"
          : "查看任务结果、输入信息和执行摘要。"
      }
      action={<StatusBadge value={task.status} />}
      contentClassName="space-y-6"
    >
      <div className={`grid gap-4 md:grid-cols-2 ${isAdmin ? "xl:grid-cols-6" : "xl:grid-cols-4"}`}>
        {summaryMetrics.map((item) => (
          <div key={item.label} className="metric-highlight rounded-[22px] border border-slate-200 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
            <p className="mt-3 break-all text-sm font-semibold text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>

      <div className={`grid gap-6 ${isAdmin ? "xl:grid-cols-[1.15fr_0.85fr]" : ""}`}>
        <div className="space-y-6">
          <SurfaceCard title="概览" description="当前任务的执行摘要和结果说明。">
            <div className="space-y-3">
              {[
                `标题：${task.title}`,
                `来源状态：${task.providerStatus}`,
                `结果摘要：${task.resultSummary}`,
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard
            title="输入与输出"
            description={
              task.isSharedResult && !isAdmin
                ? "共享结果仅开放最终产出，不展示原始输入。"
                : "查看输入素材、参数和最终产出。"
            }
          >
            <div className={`grid gap-6 ${showInputs ? "xl:grid-cols-2" : ""}`}>
              {showInputs ? (
                <div>
                  <p className="text-sm font-semibold text-slate-800">输入信息</p>
                  {task.inputAssets.length > 0 ? (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {task.inputAssets.map((asset) => (
                        <AssetThumbnail key={asset.id} asset={asset} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400">暂无输入素材</p>
                  )}

                  {task.prompt ? (
                    <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                      {task.prompt}
                    </div>
                  ) : null}

                  {Object.keys(task.params).length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(task.params).map(([key, value]) => (
                        <span
                          key={key}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                        >
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <p className="text-sm font-semibold text-slate-800">输出结果</p>
                {task.outputAssets.length > 0 ? (
                  <>
                    <div className="mt-4">
                      <TaskOutputDownloadActions taskId={task.id} assets={task.outputAssets} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {task.outputAssets.map((asset) => (
                        <AssetThumbnail key={asset.id} asset={asset} />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">暂无输出结果</p>
                )}
              </div>
            </div>
          </SurfaceCard>
        </div>

        {isAdmin ? (
          <div className="space-y-6">
            <SurfaceCard title="系统日志" description="用于定位任务来源和执行链路。">
              <div className="space-y-3">
                {task.systemLogs.length > 0 ? (
                  task.systemLogs.map((log) => (
                    <div
                      key={log}
                      className="rounded-[20px] bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100"
                    >
                      {log}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">暂无系统日志</p>
                )}
              </div>
            </SurfaceCard>

            <SurfaceCard title="飞书同步" description="同步状态和重试记录。">
              <div className="space-y-3">
                {task.syncLogs.length > 0 ? (
                  task.syncLogs.map((log, index) => (
                    <div key={`${log.time}-${index}`} className="rounded-[20px] border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">{log.time}</p>
                        <StatusBadge value={log.status} />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{log.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">暂无同步日志</p>
                )}
              </div>
            </SurfaceCard>
          </div>
        ) : null}
      </div>
    </PageTemplate>
  );
}
