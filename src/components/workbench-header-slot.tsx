"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type WorkbenchHeaderSlotContextValue = {
  content: React.ReactNode | null;
  setContent: (content: React.ReactNode | null) => void;
};

const WorkbenchHeaderSlotContext = createContext<WorkbenchHeaderSlotContextValue | null>(null);

export function WorkbenchHeaderSlotProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<React.ReactNode | null>(null);
  const value = useMemo(() => ({ content, setContent }), [content]);

  return <WorkbenchHeaderSlotContext.Provider value={value}>{children}</WorkbenchHeaderSlotContext.Provider>;
}

export function WorkbenchHeaderSlot({ children }: { children: React.ReactNode }) {
  const context = useContext(WorkbenchHeaderSlotContext);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.setContent(children);
    return () => context.setContent(null);
  }, [children, context]);

  return null;
}

export function useWorkbenchHeaderContent() {
  return useContext(WorkbenchHeaderSlotContext)?.content ?? null;
}
