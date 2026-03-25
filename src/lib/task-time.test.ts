import { describe, expect, it } from "vitest";

import { formatElapsedDuration, getTaskElapsedSeconds } from "@/lib/task-time";

describe("task-time", () => {
  it("formats elapsed duration in seconds and minutes", () => {
    expect(formatElapsedDuration(8)).toBe("8秒");
    expect(formatElapsedDuration(65)).toBe("1分5秒");
    expect(formatElapsedDuration(120)).toBe("2分");
  });

  it("calculates elapsed time from submit to completion", () => {
    const seconds = getTaskElapsedSeconds(
      {
        createdAtIso: "2026-03-22T13:00:00.000Z",
        completedAtIso: "2026-03-22T13:02:05.000Z",
      },
      Date.parse("2026-03-22T13:10:00.000Z"),
    );

    expect(seconds).toBe(125);
  });

  it("calculates live elapsed time for active tasks", () => {
    const seconds = getTaskElapsedSeconds(
      {
        createdAtIso: "2026-03-22T13:00:00.000Z",
      },
      Date.parse("2026-03-22T13:01:10.000Z"),
    );

    expect(seconds).toBe(70);
  });
});
