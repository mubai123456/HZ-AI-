import { AdminMaterialsClient } from "@/components/admin-materials-client";
import { PageTemplate } from "@/components/page-template";
import { getAdminMaterialClaimLogs, getAdminMaterials } from "@/lib/db/materials";
import { getCurrentSession } from "@/lib/session";

export default async function AdminMaterialsPage() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    return <div className="py-24 text-center text-slate-400">无权限访问</div>;
  }

  const [materials, claims] = await Promise.all([getAdminMaterials(), getAdminMaterialClaimLogs()]);

  return (
    <PageTemplate
      eyebrow="素材运营"
      title="素材管理"
      description="统一管理素材上传、列表筛选、批量操作和领取回溯，避免页面再手写独立头部。"
    >
      <AdminMaterialsClient initialMaterials={materials} initialClaims={claims} />
    </PageTemplate>
  );
}
