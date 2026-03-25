import type { PrismaClient } from "@prisma/client";

type TaskReader = Pick<PrismaClient, "task">;

const SITE_TASK_PREFIX = "WB-";

export function formatSiteTaskNo(sequence: number) {
  return `${SITE_TASK_PREFIX}${String(sequence).padStart(6, "0")}`;
}

export function parseSiteTaskNo(siteTaskNo?: string | null) {
  if (!siteTaskNo?.startsWith(SITE_TASK_PREFIX)) {
    return 0;
  }

  const nextValue = Number.parseInt(siteTaskNo.slice(SITE_TASK_PREFIX.length), 10);
  return Number.isFinite(nextValue) ? nextValue : 0;
}

export async function allocateNextSiteTaskNo(prisma: TaskReader) {
  const latestTask = await prisma.task.findFirst({
    select: { siteTaskNo: true },
    where: {
      siteTaskNo: {
        startsWith: SITE_TASK_PREFIX,
      },
    },
    orderBy: { siteTaskNo: "desc" },
  });

  return formatSiteTaskNo(parseSiteTaskNo(latestTask?.siteTaskNo) + 1);
}
