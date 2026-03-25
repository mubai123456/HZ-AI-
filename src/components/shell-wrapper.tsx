"use client";

import { usePathname } from "next/navigation";

import { WorkbenchHeaderSlotProvider } from "@/components/workbench-header-slot";
import { WorkbenchShell } from "@/components/workbench-shell";
import type { SiteBrandingConfig } from "@/lib/site-config";
import type { UserRole } from "@/lib/types";

interface Props {
  children: React.ReactNode;
  branding: SiteBrandingConfig;
  user: {
    displayName: string;
    role: UserRole;
  };
}

export function ShellWrapper({ children, branding, user }: Props) {
  const pathname = usePathname();
  const sidebarCollapsedByDefault = pathname.startsWith("/apps/");

  return (
    <WorkbenchHeaderSlotProvider>
      <WorkbenchShell user={user} branding={branding} sidebarCollapsedByDefault={sidebarCollapsedByDefault}>
        {children}
      </WorkbenchShell>
    </WorkbenchHeaderSlotProvider>
  );
}
