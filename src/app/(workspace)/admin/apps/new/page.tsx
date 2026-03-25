import { redirect } from "next/navigation";

import { AppFormEditor } from "@/components/app-form-editor";
import { PageTemplate } from "@/components/page-template";
import { SchemaMigrationRequired } from "@/components/schema-migration-required";
import { listAppTags } from "@/lib/db/app-tags";
import { getAllCategories } from "@/lib/db/categories";
import { normalizeFeishuColumnMappings } from "@/lib/feishu-sync";
import {
  isPrismaSchemaMismatchError,
  logPrismaRuntimeDiagnostic,
} from "@/lib/prisma-runtime-diagnostics";
import { getCurrentSession } from "@/lib/session";
import { getResolvedFeishuSyncSettings, getResolvedIntegrationSettings } from "@/lib/settings";

export default async function NewAppPage() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  try {
    const [categories, appTags, feishuSettings, integrationSettings] = await Promise.all([
      getAllCategories(),
      listAppTags(),
      getResolvedFeishuSyncSettings(),
      getResolvedIntegrationSettings(),
    ]);

    return (
      <PageTemplate
        eyebrow="应用运营"
        title="新建应用"
        description="使用统一编辑器模板创建应用，保持基础信息、展示配置、API 节点与同步配置的结构一致。"
        contentClassName="mx-auto max-w-6xl space-y-6"
      >
        <AppFormEditor
          mode="create"
          categories={categories}
          appTags={appTags}
          runninghubChannels={integrationSettings.runninghubChannels}
          embedded
          defaultSyncMappingJson={normalizeFeishuColumnMappings(feishuSettings.columnMappings)}
        />
      </PageTemplate>
    );
  } catch (error) {
    logPrismaRuntimeDiagnostic("new admin app page", error);
    if (!isPrismaSchemaMismatchError(error)) {
      throw error;
    }

    return (
      <PageTemplate
        eyebrow="应用运营"
        title="新建应用"
        description="使用统一编辑器模板创建应用，保持基础信息、展示配置、API 节点与同步配置的结构一致。"
      >
        <SchemaMigrationRequired scope="新建应用" />
      </PageTemplate>
    );
  }
}
