import { MaterialHallClient } from "@/components/material-hall-client";
import { PageTemplate } from "@/components/page-template";
import { getAvailableMaterials, getAvailableMaterialTags, getUserMaterialQuota } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    return <div className="py-24 text-center text-slate-400">请先登录</div>;
  }

  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const tag = typeof params.tag === "string" ? params.tag.trim() : "";

  const [items, quota, availableTags] = await Promise.all([
    getAvailableMaterials({
      search: search || undefined,
      materialType: "VIDEO",
      tag: tag || undefined,
    }),
    getUserMaterialQuota(session.sub),
    getAvailableMaterialTags({ materialType: "VIDEO" }),
  ]);

  return (
    <PageTemplate
      eyebrow="素材大厅"
      title="视频素材大厅"
      description="统一承接可领取视频素材的浏览、筛选、预览与下载流程，继续沿用移动优先的 Browse 体验。"
      contentClassName="space-y-6"
    >
      <MaterialHallClient
        initialItems={items}
        initialQuota={quota}
        availableTags={availableTags}
        initialSearch={search}
        initialTag={tag}
        embedded
      />
    </PageTemplate>
  );
}
