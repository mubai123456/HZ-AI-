export function formatElapsedDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}秒`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return `${minutes}分`;
  }

  return `${minutes}分${seconds}秒`;
}

function parseIsoTimestamp(value?: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getTaskElapsedSeconds(
  task: {
    createdAtIso: string;
    completedAtIso?: string;
  },
  nowMs = Date.now(),
): number | null {
  const createdAtMs = parseIsoTimestamp(task.createdAtIso);
  if (createdAtMs === null) {
    return null;
  }

  const completedAtMs = parseIsoTimestamp(task.completedAtIso);
  const endMs = completedAtMs ?? nowMs;

  return Math.max(0, Math.round((endMs - createdAtMs) / 1000));
}

export function getTaskElapsedLabel(
  task: {
    createdAtIso: string;
    completedAtIso?: string;
  },
  nowMs = Date.now(),
): string | null {
  const totalSeconds = getTaskElapsedSeconds(task, nowMs);
  if (totalSeconds === null) {
    return null;
  }

  return `耗时 ${formatElapsedDuration(totalSeconds)}`;
}

export function isActiveTask(status: string): boolean {
  return status === "QUEUED" || status === "RUNNING";
}
