import { notFound, redirect } from "next/navigation";

import { AppWorkbenchClient } from "@/components/app-workbench-client";
import { getAppByCode } from "@/lib/db/apps";
import { getTasksForUser } from "@/lib/db/tasks";
import { getCurrentSession } from "@/lib/session";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await getCurrentSession();
  const app = await getAppByCode(code);

  if (!session) {
    redirect("/login");
  }

  if (!app) {
    notFound();
  }

  const visibleTasks = await getTasksForUser(session.role, session.sub, {
    limit: 100,
  });

  return <AppWorkbenchClient app={app} allTasks={visibleTasks} />;
}
