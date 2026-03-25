import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SubmitForm } from "@/app/(workspace)/apps/[code]/submit-form";
import type { AppDefinition } from "@/lib/types";

const demoApp: AppDefinition = {
  id: "app-1",
  code: "demo-app",
  name: "Demo App",
  description: "",
  provider: "RUNNINGHUB",
  providerAppId: "demo-app",
  enabled: true,
  shareResults: false,
  statusLabel: "Enabled",
  outputType: "IMAGE",
  syncTarget: "RESULT_ARCHIVE",
  category: "",
  formSchemaJson: [
    { key: "image1", label: "Reference Image 1", type: "image" },
    { key: "image2", label: "Reference Image 2", type: "image" },
    { key: "image3", label: "Reference Image 3", type: "image" },
    { key: "prompt", label: "Prompt", type: "textarea" },
    {
      key: "ratio",
      label: "Ratio",
      type: "select",
      options: [
        { label: "1:1", value: "1:1" },
        { label: "4:3", value: "4:3" },
      ],
    },
    {
      key: "resolution",
      label: "Resolution",
      type: "select",
      options: [
        { label: "1K", value: "1k" },
        { label: "2K", value: "2k" },
      ],
    },
    {
      key: "style",
      label: "Style",
      type: "select",
      options: [
        { label: "Realistic", value: "realistic" },
        { label: "Illustration", value: "illustration" },
      ],
    },
  ],
  requestMappingJson: {},
  defaultParamsJson: {},
  syncMappingJson: {},
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

const hiddenFieldApp: AppDefinition = {
  ...demoApp,
  code: "hidden-field-app",
  formSchemaJson: [
    { key: "image1", label: "Reference Image 1", type: "image" },
    { key: "prompt", label: "Prompt", type: "textarea" },
    { key: "hiddenPrompt", label: "Hidden Prompt", type: "textarea", hidden: true },
    {
      key: "hiddenRatio",
      label: "Hidden Ratio",
      type: "select",
      hidden: true,
      options: [
        { label: "1:1", value: "1:1" },
        { label: "16:9", value: "16:9" },
      ],
    },
    { key: "hiddenImage", label: "Hidden Image", type: "image", hidden: true },
  ],
  defaultParamsJson: {
    hiddenPrompt: "Use hidden copy",
    hiddenRatio: "16:9",
    hiddenImage: "https://example.com/hidden.png",
  },
};

const multiTextareaApp: AppDefinition = {
  ...demoApp,
  code: "multi-textarea-app",
  formSchemaJson: [
    { key: "prompt", label: "Prompt", type: "textarea", description: "主提示词" },
    { key: "negativePrompt", label: "Negative Prompt", type: "textarea", description: "补充约束" },
    { key: "hiddenNotes", label: "Hidden Notes", type: "textarea", hidden: true, description: "隐藏字段" },
    {
      key: "resolution",
      label: "Resolution",
      type: "select",
      options: [
        { label: "1K", value: "1k" },
        { label: "2K", value: "2k" },
      ],
    },
  ],
  defaultParamsJson: {
    negativePrompt: "Avoid blur",
    hiddenNotes: "Only for backend",
    resolution: "2k",
  },
};

describe("SubmitForm", () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const draftStorageKey = `app-workbench-draft:${demoApp.code}`;

  beforeEach(() => {
    global.fetch = vi.fn();
    URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`);
    URL.revokeObjectURL = vi.fn();
    window.localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("keeps the uploaded reference image after submit succeeds", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: "/uploads/look-1.png" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, taskId: "task-1", taskNo: "202603220001" }), {
          status: 200,
        }),
      );

    const onSubmitSuccess = vi.fn();
    const { container } = render(<SubmitForm app={demoApp} onSubmitSuccess={onSubmitSuccess} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["demo"], "look-1.png", { type: "image/png" })],
      },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(container.querySelector('img[src="blob:look-1.png"]')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("submit-task"));

    await waitFor(() => expect(onSubmitSuccess).toHaveBeenCalledWith("task-1"));
    expect(container.querySelector('img[src="blob:look-1.png"]')).toBeInTheDocument();
  });

  it("shows a single two-line submit button with the estimated price", () => {
    render(<SubmitForm app={demoApp} onSubmitSuccess={vi.fn()} />);

    const submitButton = screen.getByTestId("submit-task-button");
    expect(submitButton).toContainElement(screen.getByText("提交任务"));
    expect(submitButton).toContainElement(screen.getByText("预计￥12.50元"));
  });

  it("keeps the previous reference image if replacing it fails", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: "/uploads/look-1.png" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Upload failed" }), { status: 500 }));

    const { container } = render(<SubmitForm app={demoApp} onSubmitSuccess={vi.fn()} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["demo"], "look-1.png", { type: "image/png" })],
      },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(container.querySelector('img[src="blob:look-1.png"]')).toBeInTheDocument();

    fireEvent.change(fileInput, {
      target: {
        files: [new File(["demo"], "look-2.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText("Upload failed")).toBeInTheDocument();
    });
    expect(container.querySelector('img[src="blob:look-1.png"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="blob:look-2.png"]')).not.toBeInTheDocument();
  });

  it("allows replacing an uploaded reference image by choosing a new file", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: "/uploads/look-1.png" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: "/uploads/look-2.png" }), { status: 200 }));

    const { container } = render(<SubmitForm app={demoApp} onSubmitSuccess={vi.fn()} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["demo"], "look-1.png", { type: "image/png" })],
      },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(container.querySelector('img[src="blob:look-1.png"]')).toBeInTheDocument();

    fireEvent.change(fileInput, {
      target: {
        files: [new File(["demo"], "look-2.png", { type: "image/png" })],
      },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(container.querySelector('img[src="blob:look-2.png"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="blob:look-1.png"]')).not.toBeInTheDocument();
  });

  it("keeps low-frequency parameters behind a more options toggle", () => {
    render(<SubmitForm app={demoApp} onSubmitSuccess={vi.fn()} />);

    expect(screen.getByText("Ratio")).toBeInTheDocument();
    expect(screen.getByText("Resolution")).toBeInTheDocument();
    expect(screen.queryByText("Style")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("toggle-advanced-params"));

    expect(screen.getByText("Style")).toBeInTheDocument();
  });

  it("restores the saved app draft and lets the user clear it from the image section header", async () => {
    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        formData: {
          prompt: "Keep my last prompt",
          ratio: "4:3",
          resolution: "2k",
          style: "illustration",
        },
        uploadedUrls: {},
        selectedTemplateId: null,
        selectedTemplateName: null,
      }),
    );

    render(<SubmitForm app={demoApp} onSubmitSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Keep my last prompt")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("4:3")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("clear-draft"));

    expect(screen.queryByDisplayValue("Keep my last prompt")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(draftStorageKey)).toBeNull();
  });

  it("removes the legacy input workbench card while moving clear draft to the image section header", () => {
    render(<SubmitForm app={demoApp} onSubmitSuccess={vi.fn()} />);

    expect(screen.queryByText("输入工作台")).not.toBeInTheDocument();
    expect(screen.getByLabelText("clear-draft")).toBeInTheDocument();
    expect(screen.queryByText("清空草稿")).not.toBeInTheDocument();
  });

  it("renders the reference images as a three-column grid with the first slot emphasized", () => {
    render(<SubmitForm app={demoApp} onSubmitSuccess={vi.fn()} />);

    expect(screen.getByTestId("image-upload-grid")).toHaveClass("grid-cols-3");
    expect(screen.getByTestId("image-upload-slot-image1")).toHaveAttribute("data-slot-role", "primary");
    expect(screen.getByTestId("image-upload-slot-image2")).toHaveAttribute("data-slot-role", "secondary");
    expect(screen.getByTestId("image-upload-slot-image3")).toHaveAttribute("data-slot-role", "secondary");
  });

  it("shows lightweight primary and secondary labels without bringing back clear buttons", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ url: "/uploads/look-1.png" }), { status: 200 }));

    const { container } = render(<SubmitForm app={demoApp} onSubmitSuccess={vi.fn()} />);

    expect(screen.getByText("主参考图")).toBeInTheDocument();
    expect(screen.getAllByText("辅助图")).toHaveLength(2);
    expect(screen.queryByText("点击替换")).not.toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["demo"], "look-1.png", { type: "image/png" })],
      },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText("clear-image-image1")).not.toBeInTheDocument();
    expect(screen.getByText("主参考图")).toBeInTheDocument();
    expect(screen.getAllByText("辅助图")).toHaveLength(2);
    expect(screen.queryByText("点击替换")).not.toBeInTheDocument();
  });

  it("submits hidden field defaults together with visible input", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, taskId: "task-hidden", taskNo: "202603240001" }), {
        status: 200,
      }),
    );

    render(<SubmitForm app={hiddenFieldApp} onSubmitSuccess={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("请输入Prompt..."), {
      target: { value: "Visible prompt" },
    });
    fireEvent.click(screen.getByLabelText("submit-task"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/internal/tasks/submit",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"hiddenPrompt":"Use hidden copy"'),
        }),
      );
    });
  });

  it("renders every visible textarea while keeping hidden ones out of the form", async () => {
    render(<SubmitForm app={multiTextareaApp} onSubmitSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Avoid blur")).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("主提示词")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("补充约束")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("隐藏字段")).not.toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByRole("combobox")).toHaveValue("2k");
  });
});
