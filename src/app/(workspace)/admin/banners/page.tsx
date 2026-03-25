import { redirect } from "next/navigation";

import { BannerManager } from "@/components/banner-manager";
import { PageTemplate } from "@/components/page-template";
import { getAllBanners } from "@/lib/db/banners";
import { getCurrentSession } from "@/lib/session";

export default async function AdminBannersPage() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const banners = await getAllBanners();

  return (
    <PageTemplate
      eyebrow="运营配置"
      title="Banner 管理"
      description="统一维护应用中心顶部 Banner 的标题、跳转、渐变色与启停状态，保持配置型列表页骨架一致。"
    >
      <BannerManager initialBanners={banners} />
    </PageTemplate>
  );
}
