import { NextResponse } from "next/server";

import { getMaterialPreviewForUser } from "@/lib/db/materials";
import { createMediaStreamResponse, resolveMaterialObjectPath } from "@/lib/material-storage";
import { createSignedDownloadUrl } from "@/lib/object-storage";
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
  const preview = await getMaterialPreviewForUser({
    materialId: id,
    userId: session.sub,
    role: session.role,
  });

  if (!preview) {
    return NextResponse.json({ error: "预览不存在" }, { status: 404 });
  }

  const filePath = resolveMaterialObjectPath(preview.bucket, preview.objectKey);
  if (filePath) {
    return createMediaStreamResponse({
      filePath,
      request,
      contentType: preview.mimeType,
      disposition: "inline",
      downloadName: preview.sourceFilename,
    });
  }

  try {
    const signedUrl = await createSignedDownloadUrl({
      objectKey: preview.objectKey,
      fileName: preview.sourceFilename,
      disposition: "inline",
    });

    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch {
    return NextResponse.json({ error: "预览文件不存在" }, { status: 404 });
  }
}
