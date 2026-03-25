import { describe, expect, it } from "vitest";

import { resolveNextSelectedTaskId } from "@/components/use-app-tasks";
import type { TaskRecord } from "@/lib/types";

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-1",
    siteTaskNo: "WB-000001",
    taskNo: "TASK-001",
    appCode: "demo-app",
    appName: "Demo App",
    title: "Task 1",
    ownerId: "user-1",
    ownerName: "User One",
    status: "SUCCEEDED",
    providerStatus: "SUCCESS",
    createdAt: "03/22 21:00",
    createdAtIso: "2026-03-22T13:00:00.000Z",
    prompt: "",
    params: {},
    resultSummary: "Ready",
    resultItems: [],
    inputAssets: [],
    outputAssets: [],
    systemLogs: [],
    syncLogs: [],
    ...overrides,
  };
}

describe("resolveNextSelectedTaskId", () => {
  it("prefers the current selection when that task still exists", () => {
    const result = resolveNextSelectedTaskId(
      [
        createTask({ id: "task-1", taskNo: "TASK-001" }),
        createTask({ id: "task-2", taskNo: "TASK-002", createdAtIso: "2026-03-22T13:05:00.000Z" }),
      ],
      "task-1",
      "task-2",
    );

    expect(result).toBe("task-1");
  });

  it("falls back to the preferred task id before using the newest task", () => {
    const result = resolveNextSelectedTaskId(
      [
        createTask({ id: "task-1", taskNo: "TASK-001" }),
        createTask({ id: "task-2", taskNo: "TASK-002", createdAtIso: "2026-03-22T13:05:00.000Z" }),
      ],
      "task-missing",
      "task-2",
    );

    expect(result).toBe("task-2");
  });

  it("falls back to the newest task when neither current nor preferred id exists", () => {
    const result = resolveNextSelectedTaskId(
      [
        createTask({ id: "task-2", taskNo: "TASK-002", createdAtIso: "2026-03-22T13:05:00.000Z" }),
        createTask({ id: "task-3", taskNo: "TASK-003", createdAtIso: "2026-03-22T13:10:00.000Z" }),
      ],
      "task-1",
      "task-missing",
    );

    expect(result).toBe("task-3");
  });
});
