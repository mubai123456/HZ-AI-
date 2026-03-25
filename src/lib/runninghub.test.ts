import { describe, expect, it } from "vitest";

import { getRunningHubTaskErrorMessage } from "@/lib/runninghub";

describe("getRunningHubTaskErrorMessage", () => {
  it("prefers the detailed exception message from failedReason", () => {
    const message = getRunningHubTaskErrorMessage({
      errorMessage: "工作流运行失败",
      failedReason: {
        exception_message:
          "【显存不足告警】\n显存耗尽导致进程中断，建议调整如下：\n→ 降低生图或视频分辨率",
      },
    });

    expect(message).toBe(
      "【显存不足告警】\n显存耗尽导致进程中断，建议调整如下：\n→ 降低生图或视频分辨率",
    );
  });

  it("falls back to the generic error message when failedReason has no detail", () => {
    const message = getRunningHubTaskErrorMessage({
      errorMessage: "工作流运行失败",
      failedReason: {
        node_name: "KSampler",
      },
    });

    expect(message).toBe("工作流运行失败");
  });
});
