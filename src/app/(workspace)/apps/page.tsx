import { AppMarketplace } from "@/components/app-marketplace";
import { PageTemplate } from "@/components/page-template";
import { getEnabledAppsWithStats } from "@/lib/db/apps";
import { getAllCategories } from "@/lib/db/categories";
import { getCurrentSession } from "@/lib/session";

export default async function AppsPage() {
  const session = await getCurrentSession();
  if (!session) {
    return <p className="text-slate-600 dark:text-slate-400">请先登录</p>;
  }

  const apps = await getEnabledAppsWithStats();
  const categoriesDb = await getAllCategories();
  const categories = categoriesDb.filter((category) => category.enabled).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <PageTemplate
      eyebrow="应用中心"
      title="应用中心"
      description="浏览团队已启用的 AI 应用，按分类筛选并快速进入工作台。"
    >
      <AppMarketplace apps={apps} categories={categories} embedded />
    </PageTemplate>
  );
}
