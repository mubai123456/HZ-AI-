import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ShellWrapper } from "@/components/shell-wrapper";
import { getResolvedSiteSettings } from "@/lib/settings";
import { getCurrentSession } from "@/lib/session";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  const siteSettings = await getResolvedSiteSettings();

  return (
    <ShellWrapper
      branding={siteSettings}
      user={{
        displayName: session.displayName,
        role: session.role,
      }}
    >
      <Suspense
        fallback={
          <div className="animate-pulse space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-28 rounded-[22px] border border-slate-200 bg-slate-100" />
              ))}
            </div>
            <div className="h-64 rounded-[24px] border border-slate-200 bg-slate-100" />
          </div>
        }
      >
        {children}
      </Suspense>
    </ShellWrapper>
  );
}
