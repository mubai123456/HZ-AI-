import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { AdminAppsClient } from "@/components/admin-apps-client";
import type { AppWithRunCount } from "@/lib/db/apps";
import type { AppCategoryItem } from "@/lib/db/categories";
import type { AppTagRecord } from "@/lib/types";

const apps: AppWithRunCount[] = [
  {
    id: "app-1",
    code: "zebra",
    name: "Zebra Painter",
    description: "",
    iconUrl: null,
    iconBgColor: null,
    category: "Images",
    tags: ["Featured"],
    enabled: true,
    shareResults: false,
    runCount: 12,
    coverPoster: "https://example.com/zebra.png",
    authorName: null,
    authorAvatar: null,
    badgeLabel: null,
    estimatedPriceFen: 2500,
    estimatedPriceLabel: "¥25.00",
    sortOrder: 20,
    viewCount: 0,
    providerAppId: "provider-zebra",
    updatedAt: new Date("2026-03-23T10:00:00.000Z"),
  },
  {
    id: "app-2",
    code: "alpha",
    name: "Alpha Studio",
    description: "",
    iconUrl: null,
    iconBgColor: null,
    category: "Images",
    tags: ["Featured"],
    enabled: true,
    shareResults: true,
    runCount: 3,
    coverPoster: "https://example.com/alpha.png",
    authorName: null,
    authorAvatar: null,
    badgeLabel: null,
    estimatedPriceFen: 1250,
    estimatedPriceLabel: "¥12.50",
    sortOrder: 5,
    viewCount: 0,
    providerAppId: "provider-alpha",
    updatedAt: new Date("2026-03-22T10:00:00.000Z"),
  },
];

const categories: AppCategoryItem[] = [
  { id: "cat-1", name: "Images", sortOrder: 1, enabled: true, appCount: 2 },
];

const appTags: AppTagRecord[] = [
  { id: "tag-1", name: "Featured", color: "#2563EB", sortOrder: 1 },
];

function getVisibleAppNames() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => {
      const text = row.textContent ?? "";
      if (text.includes("Alpha Studio")) {
        return "Alpha Studio";
      }
      if (text.includes("Zebra Painter")) {
        return "Zebra Painter";
      }
      return "";
    })
    .filter(Boolean);
}

describe("AdminAppsClient", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ id: "app-1", status: "success", message: "ok" }],
        summary: { totalCount: 1, successCount: 1, skippedCount: 0, failureCount: 0 },
      }),
    }) as typeof fetch;
  });

  it("changes row order when sort headers are toggled", () => {
    render(<AdminAppsClient apps={apps} categories={categories} appTags={appTags} embedded />);

    expect(getVisibleAppNames()).toEqual(["Alpha Studio", "Zebra Painter"]);

    fireEvent.click(screen.getByRole("button", { name: /应用/i }));
    fireEvent.click(screen.getByRole("button", { name: /更新时间/i }));

    expect(getVisibleAppNames()).toEqual(["Zebra Painter", "Alpha Studio"]);
  });

  it("opens the image lightbox when a cover preview is clicked", async () => {
    render(<AdminAppsClient apps={apps} categories={categories} appTags={appTags} embedded />);

    fireEvent.click(screen.getByLabelText("preview-cover-app-1"));

    expect(await screen.findByText("100%")).toBeInTheDocument();
    expect(screen.getByAltText("Zebra Painter")).toBeInTheDocument();
  });

  it("supports bulk sort order updates", async () => {
    render(<AdminAppsClient apps={apps} categories={categories} appTags={appTags} embedded />);

    fireEvent.click(screen.getByLabelText("select-app-app-2"));
    fireEvent.click(screen.getByRole("button", { name: /批量改排序/i }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("sort-order-start"), {
      target: { value: "100" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /应用排序/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/internal/admin/apps/bulk",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"type":"setSortOrder"'),
        }),
      );
    });
  });
});
