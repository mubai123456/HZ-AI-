import { NextResponse } from "next/server";

import { getTaskOutputAssetDownloadSource } from "@/lib/db/tasks";
import { getCurrentSession } from "@/lib/session";
import { buildArchiveEntryFilename, createTaskAssetDownloadResponse } from "@/lib/task-downloads";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id, assetId } = await params;
  const source = await getTaskOutputAssetDownloadSource({
    taskId: id,
    assetId,
    userId: session.sub,
    role: session.role,
  });

  if (!source) {
    return NextResponse.json({ error: "当前无法下载该任务结果" }, { status: 404 });
  }

  const downloadName = buildArchiveEntryFilename(source.asset, new Set());

  try {
    const response = await createTaskAssetDownloadResponse({
      asset: source.asset,
      downloadName,
      request,
    });

    if (!response) {
      return NextResponse.json({ error: "结果文件不存在" }, { status: 404 });
    }

    return response;
  } catch {
    return NextResponse.json({ error: "下载结果文件失败，请稍后重试" }, { status: 502 });
  }
}
