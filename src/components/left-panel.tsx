"use client";

import { SubmitForm } from "@/app/(workspace)/apps/[code]/submit-form";
import type { AppDefinition, TaskRecord, TaskSubmissionResult } from "@/lib/types";

interface LeftPanelProps {
  app: AppDefinition;
  onTaskSubmitted?: (result: TaskSubmissionResult) => void;
  reuseTaskRequest?: { task: TaskRecord; nonce: number } | null;
}

export function LeftPanel({ app, onTaskSubmitted, reuseTaskRequest }: LeftPanelProps) {
  return (
    <div className="h-full">
      <SubmitForm
        app={app}
        reuseTaskRequest={reuseTaskRequest}
        onSubmitSuccess={(result) => {
          onTaskSubmitted?.(result);
        }}
      />
    </div>
  );
}
