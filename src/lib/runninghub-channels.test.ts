import { describe, expect, it } from "vitest";

import { normalizeRunningHubChannels } from "@/lib/runninghub-channels";

describe("normalizeRunningHubChannels", () => {
  it("treats legacy env-key configs as ENV credentials", () => {
    const channels = normalizeRunningHubChannels([
      {
        code: "safe",
        name: "Safe",
        apiKeyEnvName: "RUNNINGHUB_API_KEY_SAFE",
        concurrencyLimit: 5,
        priority: 1,
        enabled: true,
      },
    ]);

    expect(channels).toHaveLength(1);
    expect(channels[0]).toMatchObject({
      code: "safe",
      credentialMode: "ENV",
      apiKey: "RUNNINGHUB_API_KEY_SAFE",
    });
  });

  it("treats legacy raw secrets as DIRECT credentials so old data stays usable", () => {
    const channels = normalizeRunningHubChannels([
      {
        code: "unsafe",
        name: "Unsafe",
        apiKeyEnvName: "a5fa88f5502f4fc0820a4e9f0c32855e",
        concurrencyLimit: 5,
        priority: 1,
        enabled: true,
      },
    ]);

    expect(channels).toHaveLength(1);
    expect(channels[0]).toMatchObject({
      code: "unsafe",
      credentialMode: "DIRECT",
      apiKey: "a5fa88f5502f4fc0820a4e9f0c32855e",
    });
  });

  it("preserves the new credential fields when saving modern configs", () => {
    const channels = normalizeRunningHubChannels([
      {
        code: "direct",
        name: "Direct",
        credentialMode: "DIRECT",
        apiKey: "live_api_key",
        concurrencyLimit: 5,
        priority: 2,
        enabled: true,
      },
    ]);

    expect(channels).toHaveLength(1);
    expect(channels[0]).toMatchObject({
      code: "direct",
      credentialMode: "DIRECT",
      apiKey: "live_api_key",
    });
  });
});
