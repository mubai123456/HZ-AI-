import { notFound, redirect } from "next/navigation";

import { AppFormEditor } from "@/components/app-form-editor";
import { PageTemplate } from "@/components/page-template";
import { SchemaMigrationRequired } from "@/components/schema-migration-required";
import { listAppTags } from "@/lib/db/app-tags";
import { getAppByCode } from "@/lib/db/apps";
import { getAllCategories } from "@/lib/db/categories";
import {
  isPrismaSchemaMismatchError,
  logPrismaRuntimeDiagnostic,
} from "@/lib/prisma-runtime-diagnostics";
import { getCurrentSession } from "@/lib/session";
import { getResolvedIntegrationSettings } from "@/lib/settings";

export default async function AdminAppDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  const { code } = await params;
  try {
    const [app, categories, appTags, integrationSettings] = await Promise.all([
      getAppByCode(code),
      getAllCategories(),
      listAppTags(),
      getResolvedIntegrationSettings(),
    ]);

    if (!app) {
      notFound();
    }

    return (
      <PageTemplate
        eyebrow="应用运营"
        title={`编辑 ${app.name}`}
        description="在统一编辑器模板中维护应用配置，避免新建页和编辑页继续分叉成两套结构。"
        contentClassName="mx-auto max-w-6xl space-y-6"
      >
        <AppFormEditor
          app={app}
          mode="edit"
          categories={categories}
          appTags={appTags}
          runninghubChannels={integrationSettings.runninghubChannels}
          embedded
        />
      </PageTemplate>
    );
  } catch (error) {
    logPrismaRuntimeDiagnostic("admin app detail page", error);
    if (!isPrismaSchemaMismatchError(error)) {
      throw error;
    }

    return (
      <PageTemplate
        eyebrow="应用运营"
        title="编辑应用"
        description="在统一编辑器模板中维护应用配置，避免新建页和编辑页继续分叉成两套结构。"
      >
        <SchemaMigrationRequired scope="应用编辑" />
      </PageTemplate>
    );
  }
}
