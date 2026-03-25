import { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { AdminPromptTemplateEdit } from "@/components/admin-prompt-template-edit";
import type {
  AppDefinition,
  PromptTemplateCategoryRecord,
  PromptTemplateTagRecord,
} from "@/lib/types";

const apps: AppDefinition[] = [
  {
    id: "app-1",
    code: "image-app",
    name: "Image App",
    description: "",
    provider: "demo",
    providerAppId: "demo",
    enabled: true,
    shareResults: false,
    statusLabel: "enabled",
    outputType: "IMAGE",
    syncTarget: "RESULT_ARCHIVE",
    category: "",
    formSchemaJson: [],
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
    estimatedPriceFen: 0,
    estimatedPriceLabel: "0.00",
    sortOrder: 0,
    viewCount: 0,
  },
];

const tags: PromptTemplateTagRecord[] = [{ id: "tag-1", name: "fashion", color: "#2563eb" }];
const categories: PromptTemplateCategoryRecord[] = [
  { id: "cat-1", name: "womenswear", color: "#2563eb", sortOrder: 1, enabled: true },
];

describe("AdminPromptTemplateEdit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("switches between image and video media fields and exposes a primary category selector", () => {
    const { container } = render(
      <AdminPromptTemplateEdit
        open
        template={null}
        apps={apps}
        allTags={tags}
        allCategories={categories}
        onSaved={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(container.querySelector("#prompt-template-category")).not.toBeNull();
    expect(screen.getByLabelText("示例图片地址")).toBeInTheDocument();
    expect(screen.queryByLabelText("示例视频地址")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "视频示例" }));

    expect(screen.getByLabelText("示例视频地址")).toBeInTheDocument();
    expect(screen.getByLabelText("视频封面图地址")).toBeInTheDocument();
    expect(screen.queryByLabelText("示例图片地址")).not.toBeInTheDocument();
  });

  it("uses a white template editor and supports inserting input variables", () => {
    render(
      <AdminPromptTemplateEdit
        open
        template={null}
        apps={apps}
        allTags={tags}
        allCategories={categories}
        onSaved={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const editor = screen.getByLabelText("模板正文") as HTMLTextAreaElement;

    expect(editor.className).toContain("bg-white");

    fireEvent.click(screen.getByRole("button", { name: "插入 {{input.prompt}}" }));

    expect(editor.value).toContain("{{input.prompt}}");
  });

  it("shows the cover thumbnail without cropping and opens the full image preview", async () => {
    render(
      <AdminPromptTemplateEdit
        open
        template={null}
        apps={apps}
        allTags={tags}
        allCategories={categories}
        onSaved={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("示例图片地址"), {
      target: { value: "https://example.com/cover.png" },
    });

    expect(screen.getByText("封面")).toBeInTheDocument();

    const coverImage = screen.getByAltText("示例图片封面");
    expect(coverImage.className).toContain("object-contain");

    fireEvent.click(screen.getByRole("button", { name: "查看完整封面" }));

    expect(await screen.findByText("100%")).toBeInTheDocument();
    expect(screen.getAllByAltText("示例图片封面").length).toBeGreaterThan(1);
  });

  it("keeps draft content while creating inline tags and categories without React cross-component warnings", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ item: { id: "tag-2", name: "new-tag", color: "#16a34a" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          item: { id: "cat-2", name: "bags", color: "#7c3aed", sortOrder: 2, enabled: true },
        }),
      });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal("fetch", fetchMock);

    function InlineManagerHarness() {
      const [tagOptions, setTagOptions] = useState(tags);
      const [categoryOptions, setCategoryOptions] = useState(categories);

      return (
        <AdminPromptTemplateEdit
          open
          template={null}
          apps={apps}
          allTags={tagOptions}
          allCategories={categoryOptions}
          onSaved={vi.fn()}
          onClose={vi.fn()}
          onTagsChange={setTagOptions}
          onCategoriesChange={setCategoryOptions}
        />
      );
    }

    const { container } = render(<InlineManagerHarness />);
    const editor = screen.getByLabelText("模板正文") as HTMLTextAreaElement;

    fireEvent.change(editor, { target: { value: "draft template prompt" } });

    fireEvent.click(screen.getByRole("button", { name: "管理标签" }));
    const tagDialog = screen.getAllByRole("dialog").at(-1) as HTMLElement;
    fireEvent.change(within(tagDialog).getAllByRole("textbox")[0], { target: { value: "new-tag" } });
    fireEvent.submit(tagDialog);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "new-tag" })).toBeInTheDocument();
    });

    fireEvent.click(tagDialog.parentElement as HTMLElement);

    await waitFor(() => {
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
    });

    fireEvent.change(container.querySelector("#prompt-template-category") as HTMLSelectElement, {
      target: { value: "" },
    });

    fireEvent.click(screen.getByRole("button", { name: "管理分类" }));
    const categoryDialog = screen.getAllByRole("dialog").at(-1) as HTMLElement;
    fireEvent.change(within(categoryDialog).getAllByRole("textbox")[0], { target: { value: "bags" } });
    fireEvent.submit(categoryDialog);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "bags" })).toBeInTheDocument();
    });

    expect(editor.value).toBe("draft template prompt");
    expect((container.querySelector("#prompt-template-category") as HTMLSelectElement).value).toBe("cat-2");

    const crossComponentWarnings = consoleErrorSpy.mock.calls
      .map((args) => args.map((arg) => String(arg)).join(" "))
      .filter((message) => message.includes("Cannot update a component"));

    expect(crossComponentWarnings).toHaveLength(0);
  });
});
