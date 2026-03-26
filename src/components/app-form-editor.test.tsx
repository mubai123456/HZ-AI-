import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppFormEditor, buildAdminAppPath, generateCode } from "@/components/app-form-editor";
import type { AppCategoryItem } from "@/lib/db/categories";
import type { AppDefinition, AppTagRecord, RunningHubChannelConfig } from "@/lib/types";

const categories: AppCategoryItem[] = [
  {
    id: "cat-1",
    name: "Images",
    sortOrder: 1,
    enabled: true,
    appCount: 0,
  },
];

const appTags: AppTagRecord[] = [
  {
    id: "tag-1",
    name: "Default Tag",
    color: "#2563EB",
    sortOrder: 1,
  },
];

const runninghubChannels: RunningHubChannelConfig[] = [
  {
    code: "consumer",
    name: "Consumer",
    credentialMode: "ENV",
    apiKey: "RUNNINGHUB_API_KEY",
    concurrencyLimit: 5,
    priority: 1,
    enabled: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    credentialMode: "ENV",
    apiKey: "RUNNINGHUB_API_KEY_ENTERPRISE",
    concurrencyLimit: 100,
    priority: 2,
    enabled: true,
  },
];

const existingApp: AppDefinition = {
  id: "app-1",
  code: "demo-app",
  name: "Demo App",
  description: "",
  provider: "RUNNINGHUB",
  providerAppId: "demo-provider",
  enabled: true,
  shareResults: false,
  statusLabel: "Enabled",
  outputType: "IMAGE",
  syncTarget: "RESULT_ARCHIVE",
  category: "Images",
  formSchemaJson: [
    {
      key: "prompt",
      label: "Prompt",
      type: "textarea",
      hidden: false,
    },
    {
      key: "style",
      label: "Style",
      type: "select",
      options: [{ label: "Vintage", value: "vintage" }],
      hidden: false,
    },
  ],
  requestMappingJson: {
    prompt: "30.text",
    style: "31.select",
  },
  defaultParamsJson: {},
  syncMappingJson: {
    taskNo: "Task Number",
    "params.prompt": "Prompt Column",
  },
  runninghubAllowedChannelCodesJson: ["consumer"],
  nodes: [
    {
      key: "prompt",
      label: "Prompt",
      type: "textarea",
      nodeId: "30",
      fieldName: "text",
      defaultValue: "",
      description: "",
      required: false,
      hidden: false,
      options: [],
    },
    {
      key: "style",
      label: "Style",
      type: "select",
      nodeId: "31",
      fieldName: "select",
      defaultValue: "vintage",
      description: "",
      required: false,
      hidden: false,
      options: [{ label: "Vintage", value: "vintage" }],
    },
  ],
  tags: [],
  showcaseImages: [],
  iconUrl: null,
  iconBgColor: null,
  coverPoster: null,
  authorName: null,
  authorAvatar: null,
  badgeLabel: null,
  estimatedPriceFen: 1250,
  estimatedPriceLabel: "¥12.50",
  sortOrder: 0,
  viewCount: 0,
};

function renderEditor(props?: Partial<ComponentProps<typeof AppFormEditor>>) {
  return render(
    <AppFormEditor
      mode="create"
      categories={categories}
      appTags={appTags}
      runninghubChannels={runninghubChannels}
      embedded
      {...props}
    />,
  );
}

describe("AppFormEditor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, app: { code: "server-generated-code" } }),
    }) as typeof fetch;
  });

  it("prefills structured sync mappings from site defaults in create mode", () => {
    renderEditor({
      defaultSyncMappingJson: {
        taskNo: "Task Number",
        status: "Task Status",
      },
    });

    fireEvent.click(screen.getByTestId("app-editor-tab-nodes"));

    expect(screen.getByTestId("app-sync-mapping-field-0")).toHaveValue("taskNo");
    expect(screen.getByTestId("app-sync-mapping-column-0")).toHaveValue("Task Number");
    expect(screen.getByTestId("app-sync-mapping-field-1")).toHaveValue("status");
    expect(screen.getByTestId("app-sync-mapping-column-1")).toHaveValue("Task Status");
  });

  it("shows app param fields in the sync mapping selector", () => {
    renderEditor({
      app: existingApp,
      mode: "edit",
    });

    fireEvent.click(screen.getByTestId("app-editor-tab-nodes"));

    expect(screen.getAllByRole("option", { name: "Prompt (params.prompt)" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("option", { name: "Style (params.style)" }).length).toBeGreaterThan(0);
  });

  it("saves app-level param mappings as structured syncMappingJson", async () => {
    renderEditor({
      app: existingApp,
      mode: "edit",
    });

    fireEvent.click(screen.getByTestId("app-editor-tab-nodes"));
    fireEvent.click(screen.getByTestId("app-sync-mapping-add"));
    fireEvent.change(screen.getByTestId("app-sync-mapping-field-2"), {
      target: { value: "params.style" },
    });
    fireEvent.change(screen.getByTestId("app-sync-mapping-column-2"), {
      target: { value: "Style Column" },
    });
    fireEvent.click(screen.getByRole("button", { name: /保存配置/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/internal/admin/apps/demo-app",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining(
            '"syncMappingJson":{"taskNo":"Task Number","params.prompt":"Prompt Column","params.style":"Style Column"}',
          ),
        }),
      );
    });
  });

  it("saves restricted runninghub channel codes", async () => {
    renderEditor({
      app: existingApp,
      mode: "edit",
    });

    fireEvent.click(screen.getByLabelText("指定通道"));
    fireEvent.click(screen.getByRole("button", { name: "Enterprise" }));
    fireEvent.click(screen.getByRole("button", { name: /保存配置/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/internal/admin/apps/demo-app",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining(
            '"runninghubAllowedChannelCodesJson":["consumer","enterprise"]',
          ),
        }),
      );
    });
  });

  it("uses provider app id as fallback code when the app name cannot produce an ASCII slug", () => {
    renderEditor();

    fireEvent.change(screen.getByTestId("app-name-input"), {
      target: { value: "一键换装：完美替换衣物" },
    });
    fireEvent.change(screen.getByTestId("app-provider-app-id-input"), {
      target: { value: "2012848202482978818" },
    });

    expect(screen.getByTestId("app-code-input")).toHaveValue("2012848202482978818");
  });

  it("posts the ASCII-safe code during app creation", async () => {
    renderEditor();

    fireEvent.change(screen.getByTestId("app-name-input"), {
      target: { value: "一键换装：完美替换衣物" },
    });
    fireEvent.change(screen.getByTestId("app-provider-app-id-input"), {
      target: { value: "2012848202482978818" },
    });
    fireEvent.click(screen.getByRole("button", { name: /保存配置/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/internal/admin/apps",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"code":"2012848202482978818"'),
        }),
      );
    });
  });

  it("builds encoded admin detail paths from the server code", () => {
    expect(buildAdminAppPath("server/code")).toBe("/admin/apps/server%2Fcode");
  });

  it("falls back to a timestamp code when both name and provider app id are non-ascii", () => {
    expect(generateCode("新建应用", "飞书同步", 123456)).toBe("app-123456");
  });

  it("shows only two editor tabs after the flow simplification", () => {
    renderEditor();
    expect(screen.getAllByTestId("app-editor-tab")).toHaveLength(2);
  });

  it("includes hidden node settings in the saved payload", async () => {
    renderEditor({
      app: existingApp,
      mode: "edit",
    });

    fireEvent.click(screen.getByTestId("app-editor-tab-nodes"));
    fireEvent.click(screen.getByTestId("node-hidden-toggle-0"));
    fireEvent.click(screen.getByRole("button", { name: /保存配置/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/internal/admin/apps/demo-app",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"hidden":true'),
        }),
      );
    });
  });

  it("imports RunningHub fieldData as visible select nodes", async () => {
    const view = renderEditor();

    fireEvent.click(screen.getByTestId("app-editor-tab-nodes"));
    fireEvent.click(screen.getByRole("button", { name: "从 API 示例导入" }));

    const parseTextarea = view.container.querySelector('textarea[rows="16"]') as HTMLTextAreaElement;
    fireEvent.change(parseTextarea, {
      target: {
        value: JSON.stringify({
          nodeInfoList: [
            {
              nodeId: "2",
              fieldName: "image",
              fieldValue: "hash-1.png",
              description: "上传图像 1 【选填,一张图不上传默认是文生图】",
            },
            {
              nodeId: "10",
              fieldName: "prompt",
              fieldValue: "",
              description: "输入文本",
            },
            {
              nodeId: "11",
              fieldName: "aspectRatio",
              fieldValue: "3:4",
              description: "设置比例",
              fieldData: JSON.stringify([["1:1", "3:4", "16:9"], { default: "1:1" }]),
            },
            {
              nodeId: "12",
              fieldName: "resolution",
              fieldValue: "2k",
              description: "分辨率",
              fieldData: JSON.stringify([
                { name: "1k", index: "1k", description: "", fastIndex: 1 },
                { name: "2k", index: "2k", description: "", fastIndex: 2 },
                { name: "4k", index: "4k", description: "", fastIndex: 3 },
              ]),
            },
            {
              nodeId: "13",
              fieldName: "channel",
              fieldValue: "Third-party",
              description: "第三方/官方切换",
              fieldData: JSON.stringify([
                {
                  name: "Third-party",
                  index: "Third-party",
                  description: "第三方（低价渠道版）",
                  fastIndex: 1,
                },
                {
                  name: "Official",
                  index: "Official",
                  description: "官方（官方稳定版）",
                  fastIndex: 2,
                },
              ]),
            },
          ],
          instanceType: "default",
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "解析并填充" }));

    await waitFor(() => {
      expect(screen.getAllByDisplayValue("下拉选择")).toHaveLength(3);
    });

    expect(screen.getByDisplayValue("上传图像 1")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("输入文本").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("设置比例").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("分辨率").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("第三方/官方切换").length).toBeGreaterThan(0);

    const textareaValues = screen
      .getAllByRole("textbox")
      .map((element) => (element as HTMLTextAreaElement).value);
    expect(textareaValues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("1:1"),
        expect.stringContaining("1k:1k"),
        expect.stringContaining("第三方（低价渠道版）:Third-party"),
        expect.stringContaining("上传图像 1 【选填,一张图不上传默认是文生图】"),
      ]),
    );
    expect(screen.getByDisplayValue("1:1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2k")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Third-party")).toBeInTheDocument();
    expect(screen.getByTestId("node-hidden-toggle-1")).toBeChecked();
    expect(screen.getByTestId("node-hidden-toggle-2")).toBeChecked();
    expect(screen.getByTestId("node-hidden-toggle-3")).toBeChecked();
    expect(screen.getByTestId("node-hidden-toggle-4")).toBeChecked();
  });

  it("removes deprecated display fields and saves showcase images", async () => {
    renderEditor({
      app: existingApp,
      mode: "edit",
    });

    expect(screen.queryByText("图标 URL")).not.toBeInTheDocument();
    expect(screen.queryByText("图标背景色")).not.toBeInTheDocument();
    expect(screen.queryByText("角标文本")).not.toBeInTheDocument();
    expect(screen.queryByText("作者名称")).not.toBeInTheDocument();
    expect(screen.queryByText("作者头像 URL")).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId("showcase-image-url-input"), {
      target: { value: "https://example.com/showcase-1.png" },
    });
    fireEvent.click(screen.getByTestId("showcase-image-url-add"));
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/internal/admin/apps/demo-app",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"showcaseImages":["https://example.com/showcase-1.png"]'),
        }),
      );
    });
  });
});
