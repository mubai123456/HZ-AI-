import { ProfileClient } from "./client";

import { PageTemplate } from "@/components/page-template";
import { getMyClaimedMaterials, getUserMaterialQuota } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session) {
    return <div className="py-24 text-center text-slate-400">请先登录</div>;
  }

  const [quota, materials] = await Promise.all([
    getUserMaterialQuota(session.sub),
    getMyClaimedMaterials(session.sub),
  ]);

  return (
    <PageTemplate
      eyebrow="我的内容"
      title="领取记录与发布追踪"
      description="统一查看个人素材额度、领取记录、下载入口与发布链接回填情况。"
      contentClassName="space-y-6"
    >
      <ProfileClient
        username={session.username}
        displayName={session.displayName}
        quota={quota}
        materials={materials}
        embedded
      />
    </PageTemplate>
  );
}
