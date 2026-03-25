import { describe, expect, it } from "vitest";

import {
  buildTaskSyncPayload,
  mappingRecordToEntries,
  normalizeFeishuColumnMappings,
  resolveFeishuSyncConfig,
} from "@/lib/feishu-sync";
import {
  getAppFeishuSyncSourceKeys,
  getSharedFeishuSyncSourceKeys,
} from "@/lib/feishu-sync-fields";

describe("feishu sync config helpers", () => {
  it("normalizes and merges global defaults with app overrides", () => {
    const config = resolveFeishuSyncConfig({
      globalSettings: {
        feishuAppToken: "db-app-token",
        feishuTableId: "db-table-id",
        columnMappings: [
          { taskField: "taskNo", feishuColumn: "Task No" },
          { taskField: "status", feishuColumn: "Status" },
          { taskField: "createdAt", feishuColumn: "Created At" },
          { taskField: "allInfo", feishuColumn: "All Info" },
          { taskField: "taskNo", feishuColumn: "Task Number" },
          { taskField: "not-supported", feishuColumn: "Ignored" },
        ],
      },
      appSyncMappingJson: {
        status: "App Status",
        providerResultUrl: "Result URL",
        "params.prompt": "Prompt Column",
        ignoredField: "Ignored",
      },
      envTarget: {
        appToken: "env-app-token",
        tableId: "env-table-id",
      },
      envSecret: "env-secret",
    });

    expect(config.enabled).toBe(true);
    expect(config.target).toEqual({
      appToken: "db-app-token",
      tableId: "db-table-id",
    });
    expect(config.globalMapping).toEqual({
      taskNo: "Task Number",
      status: "Status",
      createdAt: "Created At",
      allInfo: "All Info",
    });
    expect(config.appMapping).toEqual({
      status: "App Status",
      providerResultUrl: "Result URL",
      "params.prompt": "Prompt Column",
    });
    expect(config.mapping).toEqual({
      taskNo: "Task Number",
      status: "App Status",
      createdAt: "Created At",
      allInfo: "All Info",
      providerResultUrl: "Result URL",
      "params.prompt": "Prompt Column",
    });
  });

  it("falls back to env target when db settings are empty or accidentally store the app secret", () => {
    const config = resolveFeishuSyncConfig({
      globalSettings: {
        feishuAppToken: "env-secret",
        feishuTableId: "",
        columnMappings: [],
      },
      appSyncMappingJson: {},
      envTarget: {
        appToken: "env-app-token",
        tableId: "env-table-id",
      },
      envSecret: "env-secret",
    });

    expect(config.target).toEqual({
      appToken: "env-app-token",
      tableId: "env-table-id",
    });
    expect(config.enabled).toBe(false);
  });

  it("supports params fields when normalizing and serializing app mappings", () => {
    const allowedSourceKeys = getAppFeishuSyncSourceKeys([
      { key: "prompt", label: "Prompt", type: "textarea" },
      { key: "style", label: "Style", type: "select" },
    ]);

    const record = normalizeFeishuColumnMappings(
      [
        { taskField: "taskNo", feishuColumn: "Task No" },
        { taskField: "params.prompt", feishuColumn: "Prompt" },
        { taskField: "params.style", feishuColumn: "Style" },
        { taskField: "params.missing", feishuColumn: "Missing" },
      ],
      { allowedSourceKeys },
    );

    expect(record).toEqual({
      taskNo: "Task No",
      "params.prompt": "Prompt",
      "params.style": "Style",
    });
    expect(mappingRecordToEntries(record)).toEqual([
      { taskField: "taskNo", feishuColumn: "Task No" },
      { taskField: "params.prompt", feishuColumn: "Prompt" },
      { taskField: "params.style", feishuColumn: "Style" },
    ]);
  });

  it("rejects params fields when normalizing global-only mappings", () => {
    const record = normalizeFeishuColumnMappings(
      {
        taskNo: "Task No",
        "params.prompt": "Prompt",
      },
      { allowedSourceKeys: getSharedFeishuSyncSourceKeys() },
    );

    expect(record).toEqual({
      taskNo: "Task No",
    });
  });

  it("builds task payload with createdAt, prompt fallback, and serialized params fields", () => {
    const payload = buildTaskSyncPayload({
      taskNo: "TASK-001",
      status: "SUCCEEDED",
      providerStatus: "SUCCESS",
      providerResultUrl: "https://example.com/result.png",
      providerErrorMessage: null,
      providerTaskId: "provider-001",
      ownerName: "Alice",
      appCode: "all-in-one-image-2",
      appName: "All In One Image 2.0",
      providerAppId: "2027211316242423809",
      prompt: null,
      createdAt: new Date("2026-03-22T13:41:14.619Z"),
      requestMappingJson: {
        prompt: "10.text",
        image1: "11.images[0]",
      },
      defaultParamsJson: {
        aspectRatio: "4:3",
      },
      formSchemaJson: [
        { key: "prompt", label: "Create Prompt", type: "textarea" },
        { key: "image1", label: "Reference Image", type: "image" },
        {
          key: "style",
          label: "Style",
          type: "select",
          options: [{ label: "Vintage", value: "vintage" }],
        },
      ],
      webhookUrl: "https://example.com/api/webhook",
      paramsJson: {
        prompt: "Prompt from params",
        image1: "https://example.com/reference.png",
        style: ["vintage", "film"],
        attempts: 3,
        advanced: { seed: 42 },
        empty: "   ",
      },
      resultJson: {
        promptTemplate: {
          id: "tpl-001",
          name: "Vintage Portrait",
          templatePrompt: "Use film grain and warm tones.",
        },
      },
    });

    expect(payload).toMatchObject({
      taskNo: "TASK-001",
      status: "SUCCEEDED",
      providerStatus: "SUCCESS",
      providerResultUrl: "https://example.com/result.png",
      providerTaskId: "provider-001",
      ownerName: "Alice",
      appName: "All In One Image 2.0",
      prompt: "Prompt from params",
      createdAt: "2026-03-22T13:41:14.619Z",
      "params.prompt": "Prompt from params",
      "params.image1": "https://example.com/reference.png",
      "params.style": "vintage\nfilm",
      "params.attempts": "3",
      "params.advanced": '{"seed":42}',
      promptTemplateName: "Vintage Portrait",
      promptTemplateContent: "Use film grain and warm tones.",
    });
    expect(payload).not.toHaveProperty("params.empty");
    expect(payload.allInfo).toContain('"providerAppId": "2027211316242423809"');
    expect(payload.allInfo).toContain('"taskNo": "TASK-001"');
    expect(payload.allInfo).toContain('"nodeInfoList"');
    expect(payload.allInfo).toContain('"image1": "https://example.com/reference.png"');
    expect(payload.allInfo).toContain('"name": "Vintage Portrait"');
    expect(payload.allInfo).toContain('"templatePrompt": "Use film grain and warm tones."');
  });
});
