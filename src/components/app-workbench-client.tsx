"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { AppShowcaseGallery } from "@/components/app-showcase-gallery";
import { LeftPanel } from "@/components/left-panel";
import { RecentResultsPanel } from "@/components/recent-results-panel";
import { ResultsPanelClient } from "@/components/results-panel-client";
import { sortTasksByNewest, useAppTasks } from "@/components/use-app-tasks";
import { WorkbenchHeaderSlot } from "@/components/workbench-header-slot";
import { WorkbenchLayout } from "@/components/workbench-layout";
import type { AppDefinition, TaskRecord } from "@/lib/types";

interface Props {
  app: AppDefinition;
  allTasks: TaskRecord[];
}

export function AppWorkbenchClient({ app, allTasks }: Props) {
  const searchParams = useSearchParams();
  const requestedTaskId = searchParams.get("task");
  const [reuseTaskRequest, setReuseTaskRequest] = useState<{ task: TaskRecord; nonce: number } | null>(null);

  const initialTaskId = useMemo(() => {
    if (requestedTaskId) {
      return requestedTaskId;
    }

    return sortTasksByNewest(allTasks.filter((task) => task.appCode === app.code))[0]?.id ?? null;
  }, [allTasks, app.code, requestedTaskId]);

  const { tasks: liveTasks, selectedTaskId, setSelectedTaskId, refreshTasks } = useAppTasks(allTasks, {
    initialTaskId,
  });

  const selectedTask = useMemo(
    () => liveTasks.find((task) => task.id === selectedTaskId) ?? liveTasks[0] ?? null,
    [liveTasks, selectedTaskId],
  );

  const handleSelectTask = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
    },
    [setSelectedTaskId],
  );

  const handleReuseTask = useCallback(
    (task: TaskRecord) => {
      if (task.appCode !== app.code) {
        return;
      }

      setReuseTaskRequest({ task, nonce: Date.now() });
    },
    [app.code],
  );

  return (
    <>
      <WorkbenchHeaderSlot>
        <AppWorkbenchHeader appName={app.name} />
      </WorkbenchHeaderSlot>

      <WorkbenchLayout
        left={
          <LeftPanel app={app} onTaskSubmitted={handleSelectTask} reuseTaskRequest={reuseTaskRequest} />
        }
        middle={
          <ResultsPanelClient
            key={selectedTask?.id ?? "empty-task"}
            task={selectedTask}
            onRefreshTasks={refreshTasks}
            onReuseTask={handleReuseTask}
            canReuseTask={selectedTask?.appCode === app.code}
            leadingContent={
              <AppShowcaseGallery
                appName={app.name}
                showcaseImages={app.showcaseImages}
                coverPoster={app.coverPoster}
                variant="embedded"
              />
            }
          />
        }
        right={
          <RecentResultsPanel
            tasks={liveTasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={handleSelectTask}
          />
        }
        rightPanelToggle={{ panelName: "全站任务", defaultOpen: false }}
      />
    </>
  );
}

function AppWorkbenchHeader({ appName }: { appName: string }) {
  return (
    <div className="min-w-0">
      <Link
        href="/apps"
        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--label-quaternary)] transition hover:text-[var(--label-secondary)]"
      >
        <span aria-hidden="true">&larr;</span>
        返回应用列表
      </Link>
      <p className="mt-1 truncate text-headline font-semibold text-[var(--label-primary)]">{appName}</p>
    </div>
  );
}
