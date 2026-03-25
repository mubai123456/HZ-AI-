import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShowcaseGallery } from "@/components/app-showcase-gallery";

describe("AppShowcaseGallery", () => {
  it("renders the first showcase image and switches the main preview on thumbnail click", () => {
    render(
      <AppShowcaseGallery
        appName="Demo App"
        showcaseImages={[
          "https://example.com/showcase-1.png",
          "https://example.com/showcase-2.png",
        ]}
        coverPoster="https://example.com/cover.png"
      />,
    );

    expect(screen.getByTestId("app-showcase-main-image")).toHaveAttribute(
      "src",
      "https://example.com/showcase-1.png",
    );

    fireEvent.click(screen.getByTestId("app-showcase-thumb-1"));

    expect(screen.getByTestId("app-showcase-main-image")).toHaveAttribute(
      "src",
      "https://example.com/showcase-2.png",
    );
  });

  it("falls back to the cover image when no showcase images are provided", () => {
    render(
      <AppShowcaseGallery
        appName="Demo App"
        showcaseImages={[]}
        coverPoster="https://example.com/cover.png"
      />,
    );

    expect(screen.getByTestId("app-showcase-main-image")).toHaveAttribute(
      "src",
      "https://example.com/cover.png",
    );
    expect(screen.queryByTestId("app-showcase-thumb-0")).not.toBeInTheDocument();
  });

  it("renders the embedded variant copy for the case-plus-results workspace", () => {
    render(
      <AppShowcaseGallery
        appName="Demo App"
        showcaseImages={["https://example.com/showcase-1.png"]}
        variant="embedded"
      />,
    );

    expect(screen.getByTestId("app-showcase-gallery-embedded")).toBeInTheDocument();
    expect(screen.getByText("案例展示")).toBeInTheDocument();
    expect(screen.getByText("Demo App 案例参考")).toBeInTheDocument();
    expect(screen.getByText("先看案例，再查看下方结果工作区。")).toBeInTheDocument();
  });
});
