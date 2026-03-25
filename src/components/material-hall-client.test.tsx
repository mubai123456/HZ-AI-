import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { MaterialHallClient } from "@/components/material-hall-client";
import type { MaterialHallItem, MaterialQuotaRecord } from "@/lib/types";

const pushMock = vi.fn();
const originalFetch = globalThis.fetch;
const originalSessionStorage = globalThis.sessionStorage;
const observerInstances: MockIntersectionObserver[] = [];

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];

  constructor(private readonly callback: IntersectionObserverCallback) {
    observerInstances.push(this);
  }

  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve() {}

  trigger(entries: Array<Partial<IntersectionObserverEntry>>) {
    this.callback(
      entries.map((entry) => ({
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRatio: entry.isIntersecting ? 1 : 0,
        intersectionRect: {} as DOMRectReadOnly,
        isIntersecting: false,
        rootBounds: null,
        target: document.createElement("div"),
        time: 0,
        ...entry,
      })),
      this,
    );
  }
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/assets",
  useRouter: () => ({ push: pushMock }),
}));

const items: MaterialHallItem[] = [
  {
    id: "mat-1",
    title: "Spring Polo Video",
    description: "Hero material",
    materialType: "VIDEO",
    status: "AVAILABLE",
    previewReady: true,
    batchNo: "20260323-A",
    tags: ["POLO", "Black", "Menswear"],
    sourceFilename: "look-a.mp4",
    fileSizeBytes: 1024,
    durationMs: 5000,
    width: 1080,
    height: 1920,
    createdAt: "2026-03-23T10:00:00.000Z",
    previewUrl: "/preview-a.mp4",
    posterUrl: "/poster-a.jpg",
    downloadUrl: null,
    statusLabel: "Available",
    materialTypeLabel: "Video",
  },
];

const quota: MaterialQuotaRecord = {
  quotaDate: "2026-03-23T00:00:00.000Z",
  limitCount: 3,
  usedCount: 1,
  remainingCount: 2,
};

describe("MaterialHallClient", () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn() as typeof fetch;
    observerInstances.length = 0;
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("hover"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    globalThis.sessionStorage = originalSessionStorage;
  });

  it("renders inline video cards and lightweight quota hint", () => {
    render(
      <MaterialHallClient
        initialItems={items}
        initialQuota={quota}
        availableTags={[
          { name: "POLO", count: 3 },
          { name: "Black", count: 2 },
        ]}
        initialSearch=""
        initialTag=""
      />,
    );

    expect(screen.getByPlaceholderText("搜索素材标题、标签或文件名")).toBeInTheDocument();
    expect(screen.getByTestId("material-hall-quota-hint")).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: "POLO" })).toBeInTheDocument();
    expect(screen.getAllByText("Spring Polo Video").length).toBeGreaterThan(0);
    expect(screen.getByText("03/23 上传")).toBeInTheDocument();
    expect(screen.queryByText("20260323-A")).not.toBeInTheDocument();
    expect(screen.getByTestId("material-inline-video-mat-1")).toHaveClass("object-contain");
    expect(screen.getByTestId("material-inline-video-mat-1")).toHaveAttribute("preload", "auto");
    expect(screen.getByTestId("material-inline-video-mat-1")).not.toHaveAttribute("poster");
    expect(screen.queryByTestId("material-hall-stats")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "领取并下载" })).toBeInTheDocument();
  });

  it("updates url params when selecting a tag chip", () => {
    render(
      <MaterialHallClient
        initialItems={items}
        initialQuota={quota}
        availableTags={[
          { name: "POLO", count: 3 },
          { name: "Black", count: 2 },
        ]}
        initialSearch=""
        initialTag=""
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "POLO" }));

    expect(pushMock).toHaveBeenCalledWith("/assets?tag=POLO", { scroll: false });
  });

  it("opens preview modal when clicking the card cover and closes when clicking overlay whitespace", () => {
    const { container } = render(
      <MaterialHallClient
        initialItems={items}
        initialQuota={quota}
        availableTags={[
          { name: "POLO", count: 3 },
          { name: "Black", count: 2 },
        ]}
        initialSearch=""
        initialTag=""
      />,
    );

    fireEvent.click(screen.getByTestId("material-preview-stage-mat-1"));

    expect(container.querySelectorAll("video").length).toBeGreaterThan(1);
    expect(screen.getAllByText("关闭").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId("material-preview-overlay"));

    expect(screen.queryByTestId("material-preview-overlay")).not.toBeInTheDocument();
  });

  it("closes desktop preview when clicking modal blank regions but keeps content clicks open", () => {
    render(
      <MaterialHallClient
        initialItems={items}
        initialQuota={quota}
        availableTags={[
          { name: "POLO", count: 3 },
          { name: "Black", count: 2 },
        ]}
        initialSearch=""
        initialTag=""
      />,
    );

    fireEvent.click(screen.getByTestId("material-preview-stage-mat-1"));
    expect(screen.getByTestId("material-preview-overlay")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Spring Polo Video").at(-1)!);
    expect(screen.getByTestId("material-preview-overlay")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("material-preview-desktop-media-blank"));
    expect(screen.queryByTestId("material-preview-overlay")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("material-preview-stage-mat-1"));
    expect(screen.getByTestId("material-preview-overlay")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("material-preview-desktop-info-blank"));
    expect(screen.queryByTestId("material-preview-overlay")).not.toBeInTheDocument();
  });

  it("plays inline preview on desktop hover and toggles global sound state", async () => {
    render(
      <MaterialHallClient
        initialItems={items}
        initialQuota={quota}
        availableTags={[
          { name: "POLO", count: 3 },
          { name: "Black", count: 2 },
        ]}
        initialSearch=""
        initialTag=""
      />,
    );

    const card = screen.getByTestId("material-card-mat-1");
    const video = screen.getByTestId("material-inline-video-mat-1") as HTMLVideoElement;

    fireEvent.mouseEnter(card);

    await waitFor(() => {
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    });
    expect(video.muted).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "打开声音 Spring Polo Video" }));

    expect(video.muted).toBe(false);
    expect(sessionStorage.setItem).toHaveBeenLastCalledWith("material-hall-sound", "on");

    fireEvent.click(screen.getByRole("button", { name: "关闭声音 Spring Polo Video" }));

    expect(video.muted).toBe(true);
    expect(sessionStorage.setItem).toHaveBeenLastCalledWith("material-hall-sound", "off");
  });

  it("autoplays only the active card when intersection changes", async () => {
    render(
      <MaterialHallClient
        initialItems={[
          ...items,
          {
            ...items[0],
            id: "mat-2",
            title: "Second Video",
            previewUrl: "/preview-b.mp4",
            posterUrl: "/poster-b.jpg",
          },
        ]}
        initialQuota={quota}
        availableTags={[
          { name: "POLO", count: 3 },
          { name: "Black", count: 2 },
        ]}
        initialSearch=""
        initialTag=""
      />,
    );

    const firstCard = screen.getByTestId("material-card-mat-1");
    const secondCard = screen.getByTestId("material-card-mat-2");
    const firstVideo = screen.getByTestId("material-inline-video-mat-1");
    const secondVideo = screen.getByTestId("material-inline-video-mat-2");

    observerInstances[0]?.trigger([
      { target: firstCard, isIntersecting: true },
      { target: secondCard, isIntersecting: false },
    ]);

    await waitFor(() => {
      expect(firstVideo).toHaveAttribute("data-active", "true");
    });
    expect(secondVideo).toHaveAttribute("data-active", "false");

    observerInstances[0]?.trigger([
      { target: firstCard, isIntersecting: false },
      { target: secondCard, isIntersecting: true },
    ]);

    await waitFor(() => {
      expect(secondVideo).toHaveAttribute("data-active", "true");
    });
    expect(firstVideo).toHaveAttribute("data-active", "false");
  });

  it("uses a five-column desktop grid at the 2xl breakpoint", () => {
    const { container } = render(
      <MaterialHallClient
        initialItems={items}
        initialQuota={quota}
        availableTags={[
          { name: "POLO", count: 3 },
          { name: "Black", count: 2 },
        ]}
        initialSearch=""
        initialTag=""
      />,
    );

    const grid = container.querySelector("[data-testid='material-grid']");

    expect(grid).toHaveClass("2xl:grid-cols-5");
  });

  it("hides the mobile filter block after scrolling down", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 390,
    });
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0,
    });
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 390,
    });

    render(
      <MaterialHallClient
        initialItems={items}
        initialQuota={quota}
        availableTags={[
          { name: "POLO", count: 3 },
          { name: "Black", count: 2 },
        ]}
        initialSearch=""
        initialTag=""
      />,
    );

    expect(screen.getByText("筛选素材")).toBeInTheDocument();

    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 140,
    });
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(screen.queryByText("筛选素材")).not.toBeInTheDocument();
    });
  });
});
