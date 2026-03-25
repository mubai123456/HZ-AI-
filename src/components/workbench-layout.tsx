"use client";

import { useState } from "react";

interface WorkbenchLayoutProps {
  left: React.ReactNode;
  middle: React.ReactNode;
  right: React.ReactNode;
  rightPanelToggle?: {
    panelName: string;
    defaultOpen?: boolean;
  };
}

export function WorkbenchLayout({
  left,
  middle,
  right,
  rightPanelToggle,
}: WorkbenchLayoutProps) {
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(rightPanelToggle?.defaultOpen ?? true);
  const canToggleRightPanel = Boolean(rightPanelToggle);
  const rightPanelLabel = rightPanelToggle?.panelName ?? "右侧面板";

  return (
    <div className="relative flex flex-col gap-4 xl:h-[calc(100dvh-8.5rem)] xl:min-h-[640px]">
      <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row xl:overflow-hidden">
        <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm xl:h-full xl:min-h-0 xl:w-[360px] xl:overflow-hidden">
          {left}
        </section>

        <section className="min-h-[520px] min-w-0 rounded-[28px] border border-slate-200 bg-white shadow-sm xl:flex-1 xl:overflow-hidden">
          {middle}
        </section>

        <section
          data-testid="workbench-right-panel"
          aria-hidden={canToggleRightPanel ? !isRightPanelOpen : undefined}
          className={`rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all duration-200 xl:h-full xl:min-h-0 xl:overflow-hidden ${
            canToggleRightPanel
              ? isRightPanelOpen
                ? "xl:w-[360px] xl:opacity-100"
                : "xl:w-0 xl:border-transparent xl:opacity-0 xl:shadow-none xl:pointer-events-none"
              : "xl:w-[360px]"
          }`}
        >
          {right}
        </section>
      </div>

      {canToggleRightPanel ? (
        <button
          type="button"
          aria-label={`${isRightPanelOpen ? "收起" : "展开"}${rightPanelLabel}`}
          onClick={() => setIsRightPanelOpen((current) => !current)}
          className={`fixed top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-1.5 rounded-[20px] border border-slate-200 bg-white/95 px-2 py-3 text-[11px] font-semibold text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur transition hover:border-slate-300 hover:text-slate-900 xl:inline-flex ${
            isRightPanelOpen ? "right-[23rem]" : "right-4"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d={isRightPanelOpen ? "m15 19-7-7 7-7" : "m9 5 7 7-7 7"}
            />
          </svg>
          <span className="[writing-mode:vertical-rl] leading-none tracking-[0.18em]">
            {isRightPanelOpen ? "收起" : rightPanelLabel}
          </span>
        </button>
      ) : null}
    </div>
  );
}
