import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PromptTemplateModal } from "./prompt-template-modal";

function createFetchMock() {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("/api/internal/prompt-templates")) {
      const currentUrl = new URL(url, "https://example.com");
      const category = currentUrl.searchParams.get("category");
      const mode = currentUrl.searchParams.get("mode") ?? "all";

      let items = [
        {
          id: "tpl-image-1",
          name: "户外对镜自拍",
          description: "适合街景穿搭展示",
          coverImageUrl: "https://picsum.photos/id/11/640/960",
          sampleMediaType: "IMAGE",
          sampleMediaUrl: "https://picsum.photos/id/11/1280/1920",
          samplePosterUrl: null,
          categoryId: "cat-women",
          categoryName: "女装",
          categoryColor: "#2563eb",
          categoryOrder: 1,
          tags: ["女装", "街拍", "自拍"],
          usageCount: 12,
          enabled: true,
          isFavorite: false,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
        },
        {
          id: "tpl-video-1",
          name: "鞋子视频模板",
          description: "适合鞋类视频展示",
          coverImageUrl: null,
          sampleMediaType: "VIDEO",
          sampleMediaUrl: "https://example.com/demo.mp4",
          samplePosterUrl: "https://picsum.photos/id/33/800/600",
          categoryId: "cat-shoes",
          categoryName: "鞋子",
          categoryColor: "#0f766e",
          categoryOrder: 2,
          tags: ["鞋子"],
          usageCount: 8,
          enabled: true,
          isFavorite: true,
          lastUsedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      if (mode === "favorites") {
        items = items.filter((item) => item.isFavorite);
      }

      if (category) {
        items = items.filter((item) => item.categoryId === category);
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ items }),
      } as Response);
    }

    if (url.includes("/api/internal/prompt-template-categories")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          items: [
            { id: "cat-women", name: "女装", color: "#2563eb", sortOrder: 1, enabled: true },
            { id: "cat-shoes", name: "鞋子", color: "#0f766e", sortOrder: 2, enabled: true },
          ],
        }),
      } as Response);
    }

    return Promise.resolve({
      ok: true,
      json: async () => ({
        items: [
          { id: "tag-1", name: "女装", color: "#2563eb" },
          { id: "tag-2", name: "鞋子", color: "#0f766e" },
        ],
      }),
    } as Response);
  });
}

describe("PromptTemplateModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", createFetchMock());
  });

  it("renders categories and shows a red favorite state", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <PromptTemplateModal appCode="demo-app" selectedTemplateId={null} onSelect={vi.fn()} onClose={onClose} />,
    );

    await screen.findByText("户外对镜自拍");

    expect(container.querySelector(".xl\\:grid-cols-5")).toBeTruthy();
    expect(screen.getByPlaceholderText("搜索模板名称、分类或用途")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全部模板" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "最近使用" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "我的收藏" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全部分类" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "女装" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "鞋子" })).toBeInTheDocument();

    const favoriteButton = screen.getByRole("button", { name: "取消收藏模板" });
    expect(favoriteButton.className).toContain("text-rose-500");

    fireEvent.click(screen.getByRole("button", { name: "女装" }));
    await screen.findByText("户外对镜自拍");
    expect(screen.queryByText("鞋子视频模板")).not.toBeInTheDocument();

    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens image preview with toolbar, enlarges small images, and closes by clicking blank space", async () => {
    render(<PromptTemplateModal appCode="demo-app" selectedTemplateId={null} onSelect={vi.fn()} onClose={vi.fn()} />);

    await screen.findByText("户外对镜自拍");
    fireEvent.click(screen.getByRole("button", { name: "查看 户外对镜自拍 大图" }));

    expect(await screen.findByRole("dialog", { name: "模板示例图片预览" })).toBeInTheDocument();
    expect(screen.getByLabelText("图片查看工具栏")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上下镜像" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "左右镜像" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "向左旋转" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "向右旋转" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "放大" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "缩小" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载原图" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载当前效果图" })).toBeInTheDocument();
    expect(document.querySelector("img[aria-hidden='true']")).toBeFalsy();
    expect(screen.getByTestId("image-preview-image").className).toContain("h-full");
    expect(screen.getByTestId("image-preview-image").className).toContain("w-full");

    fireEvent.click(screen.getByTestId("image-preview-blank"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "模板示例图片预览" })).not.toBeInTheDocument();
    });
  });

  it("keeps video preview support in favorites mode", async () => {
    render(<PromptTemplateModal appCode="demo-app" selectedTemplateId={null} onSelect={vi.fn()} onClose={vi.fn()} />);

    await screen.findByText("户外对镜自拍");
    fireEvent.click(screen.getByRole("button", { name: "我的收藏" }));

    await screen.findByText("鞋子视频模板");
    fireEvent.click(screen.getByRole("button", { name: "预览 鞋子视频模板 视频示例" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "模板示例视频预览" })).toBeInTheDocument();
    });

    expect(document.querySelector("video")).toBeTruthy();
  });
});
