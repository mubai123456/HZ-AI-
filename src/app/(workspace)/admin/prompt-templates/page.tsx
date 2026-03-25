import { redirect } from "next/navigation";

import { AdminPromptTemplatesClient } from "@/components/admin-prompt-templates-client";
import { PageTemplate } from "@/components/page-template";
import { getEnabledApps } from "@/lib/db/apps";
import {
  listAdminPromptTemplates,
  listPromptTags,
  listPromptTemplateCategories,
} from "@/lib/db/prompt-templates";
import { getCurrentSession } from "@/lib/session";

export default async function AdminPromptTemplatesPage() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const [templates, tags, categories, apps] = await Promise.all([
    listAdminPromptTemplates(),
    listPromptTags(),
    listPromptTemplateCategories(),
    getEnabledApps(),
  ]);

  return (
    <PageTemplate
      eyebrow="应用运营"
      title="提示词模板"
      description="将模板管理页收回到统一后台模板下，后续再继续收敛标签、分类和范围交互。"
      className="mx-auto max-w-[1520px]"
    >
      <AdminPromptTemplatesClient
        initialTemplates={templates}
        initialTags={tags}
        initialCategories={categories}
        apps={apps}
        embedded
      />
    </PageTemplate>
  );
}
