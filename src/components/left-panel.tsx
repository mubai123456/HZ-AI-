"use client";

import { SubmitForm } from "@/app/(workspace)/apps/[code]/submit-form";
import type { AppDefinition, TaskRecord } from "@/lib/types";

interface LeftPanelProps {
  app: AppDefinition;
  onTaskSubmitted?: (taskId: string) => void;
  reuseTaskRequest?: { task: TaskRecord; nonce: number } | null;
}

export function LeftPanel({ app, onTaskSubmitted, reuseTaskRequest }: LeftPanelProps) {
  return (
    <div className="h-full">
      <SubmitForm
        app={app}
        reuseTaskRequest={reuseTaskRequest}
        onSubmitSuccess={(taskId) => {
          onTaskSubmitted?.(taskId);
        }}
      />
    </div>
  );
}
