"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TaskRecord } from "@/lib/types";

type UseAppTasksOptions = {
  appCode?: string;
  initialTaskId?: string | null;
  onSelectedTaskIdChange?: (taskId: string | null) => void;
};

export function sortTasksByNewest(tasks: TaskRecord[]) {
  return [...tasks].sort((a, b) => Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso));
}

export function resolveNextSelectedTaskId(
  tasks: TaskRecord[],
  currentTaskId?: string | null,
  preferredTaskId?: string | null,
) {
  if (currentTaskId && tasks.some((task) => task.id === currentTaskId)) {
    return currentTaskId;
  }

  if (preferredTaskId && tasks.some((task) => task.id === preferredTaskId)) {
    return preferredTaskId;
  }

  return sortTasksByNewest(tasks)[0]?.id ?? null;
}

/**
 * Hook to manage task list with SSE real-time updates.
 * Subscribes to SSE and refreshes task list when updates arrive.
 */
export function useAppTasks(initialTasks: TaskRecord[], options: UseAppTasksOptions = {}) {
  const { appCode, initialTaskId = null, onSelectedTaskIdChange } = options;
  const [tasks, setTasks] = useState<TaskRecord[]>(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() =>
    resolveNextSelectedTaskId(initialTasks, null, initialTaskId),
  );
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const selectedTaskIdRef = useRef<string | null>(selectedTaskId);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTaskId;
    onSelectedTaskIdChange?.(selectedTaskId);
  }, [onSelectedTaskIdChange, selectedTaskId]);

  const fetchUrl = useMemo(
    () =>
      appCode
        ? `/api/internal/tasks?appCode=${encodeURIComponent(appCode)}`
        : "/api/internal/tasks",
    [appCode],
  );

  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        return;
      }

      const data = await res.json();
      const nextTasks = Array.isArray(data.tasks) ? (data.tasks as TaskRecord[]) : [];
      setTasks(nextTasks);
      setSelectedTaskId((currentTaskId) =>
        resolveNextSelectedTaskId(nextTasks, currentTaskId ?? selectedTaskIdRef.current, initialTaskId),
      );
    } catch {
      // Silently fail on refresh error
    }
  }, [fetchUrl, initialTaskId]);

  useEffect(() => {
    const es = new EventSource("/api/internal/sse/all");
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") {
          return;
        }

        void refreshTasks();
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      window.setTimeout(() => {
        es.close();
        esRef.current = null;
      }, 5000);
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [refreshTasks]);

  return {
    tasks,
    selectedTaskId,
    setSelectedTaskId,
    connected,
    refreshTasks,
  };
}
