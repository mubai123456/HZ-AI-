import { WorkbenchShell } from "@/components/workbench-shell";
import { getResolvedSiteSettings } from "@/lib/settings";
import { getCurrentSession } from "@/lib/session";

export default async function Loading() {
  const session = await getCurrentSession();
  const siteSettings = await getResolvedSiteSettings();

  return (
    <WorkbenchShell
      branding={siteSettings}
      user={{
        displayName: session?.displayName ?? "加载中...",
        role: session?.role ?? "USER",
      }}
    >
      <div className="animate-shimmer space-y-6 p-6">
        <div className="h-16 rounded-2xl bg-slate-200/50" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 rounded-[22px] bg-slate-200/50" />
          ))}
        </div>
        <div className="h-64 rounded-[24px] bg-slate-200/50" />
      </div>
    </WorkbenchShell>
  );
}
