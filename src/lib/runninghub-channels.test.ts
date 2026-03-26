import { describe, expect, it } from "vitest";

import { normalizeRunningHubChannels } from "@/lib/runninghub-channels";

describe("normalizeRunningHubChannels", () => {
  it("filters out invalid env key values so raw secrets are not treated as env names", () => {
    const channels = normalizeRunningHubChannels([
      {
        code: "unsafe",
        name: "Unsafe",
        apiKeyEnvName: "a5fa88f5502f4fc0820a4e9f0c32855e",
        concurrencyLimit: 5,
        priority: 1,
        enabled: true,
      },
      {
        code: "safe",
        name: "Safe",
        apiKeyEnvName: "RUNNINGHUB_API_KEY_SAFE",
        concurrencyLimit: 5,
        priority: 2,
        enabled: true,
      },
    ]);

    expect(channels).toHaveLength(1);
    expect(channels[0]?.code).toBe("safe");
  });
});
