"use client";

import { WorkbenchLayout } from "@/components/workbench-layout";

interface ThreeColumnLayoutProps {
  left: React.ReactNode;
  middle: React.ReactNode;
  right: React.ReactNode;
}

export function ThreeColumnLayout({ left, middle, right }: ThreeColumnLayoutProps) {
  return <WorkbenchLayout left={left} middle={middle} right={right} />;
}
