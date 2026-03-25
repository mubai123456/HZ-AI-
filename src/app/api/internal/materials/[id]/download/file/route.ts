import { NextResponse } from "next/server";

import { createMediaStreamResponse, resolveMaterialObjectPath } from "@/lib/material-storage";
import { createSignedDownloadUrl } from "@/lib/object-storage";
import { getDownloadSourceForUser } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const download = await getDownloadSourceForUser({
    materialId: id,
    userId: session.sub,
    role: session.role,
  });

  if (!download) {
    return NextResponse.json({ error: "当前无法下载该素材" }, { status: 404 });
  }

  const filePath = resolveMaterialObjectPath(download.bucket, download.objectKey);
  if (filePath) {
    return createMediaStreamResponse({
      filePath,
      request,
      contentType: download.mimeType,
      disposition: "attachment",
      downloadName: download.sourceFilename,
    });
  }

  try {
    const signedUrl = await createSignedDownloadUrl({
      objectKey: download.objectKey,
      fileName: download.sourceFilename,
      disposition: "attachment",
    });

    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch {
    return NextResponse.json({ error: "素材文件不存在" }, { status: 404 });
  }
}
