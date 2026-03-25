import { ZipFile } from "yazl";
import { NextResponse } from "next/server";

import { getTaskOutputArchiveSource } from "@/lib/db/tasks";
import { getCurrentSession } from "@/lib/session";
import {
  buildArchiveDownloadName,
  buildArchiveEntryFilename,
  readTaskAssetBuffer,
  resolveTaskAssetFilePath,
  toWebReadable,
} from "@/lib/task-downloads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const source = await getTaskOutputArchiveSource({
    taskId: id,
    userId: session.sub,
    role: session.role,
  });

  if (!source) {
    return NextResponse.json({ error: "当前无法下载该任务结果" }, { status: 404 });
  }

  if (source.assets.length === 0) {
    return NextResponse.json({ error: "当前任务暂无可打包结果" }, { status: 400 });
  }

  const zip = new ZipFile();
  const usedNames = new Set<string>();

  try {
    for (const asset of source.assets) {
      const entryName = buildArchiveEntryFilename(asset, usedNames);
      const filePath = resolveTaskAssetFilePath(asset);

      if (filePath) {
        zip.addFile(filePath, entryName);
        continue;
      }

      const buffer = await readTaskAssetBuffer(asset);
      zip.addBuffer(buffer, entryName);
    }

    zip.end();
  } catch {
    zip.end();
    return NextResponse.json({ error: "打包任务结果失败，请稍后重试" }, { status: 502 });
  }

  const downloadName = buildArchiveDownloadName(source.siteTaskNo);
  return new Response(toWebReadable(zip.outputStream), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadName)}"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
