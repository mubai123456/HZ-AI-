import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminAppsClient } from "@/components/admin-apps-client";
import { PageTemplate } from "@/components/page-template";
import { SchemaMigrationRequired } from "@/components/schema-migration-required";
import { listAppTags } from "@/lib/db/app-tags";
import { getAllAppsWithStats } from "@/lib/db/apps";
import { getAllCategories } from "@/lib/db/categories";
import {
  isPrismaSchemaMismatchError,
  logPrismaRuntimeDiagnostic,
} from "@/lib/prisma-runtime-diagnostics";
import { getCurrentSession } from "@/lib/session";

export default async function AdminAppsPage() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  try {
    const [apps, categories, appTags] = await Promise.all([
      getAllAppsWithStats(),
      getAllCategories(),
      listAppTags(),
    ]);

    return (
      <PageTemplate
        eyebrow="应用运营"
        title="应用配置"
        description="统一管理应用列表、筛选条件和批量操作入口，避免列表页再各自生成一套页头。"
        action={
          <Link
            href="/admin/apps/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#0066DD] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-[#0055BB]"
          >
            + 新建应用
          </Link>
        }
      >
        <AdminAppsClient apps={apps} categories={categories} appTags={appTags} embedded />
      </PageTemplate>
    );
  } catch (error) {
    logPrismaRuntimeDiagnostic("admin apps page", error);
    if (!isPrismaSchemaMismatchError(error)) {
      throw error;
    }

    return (
      <PageTemplate
        eyebrow="应用运营"
        title="应用配置"
        description="统一管理应用列表、筛选条件和批量操作入口，避免列表页再各自生成一套页头。"
      >
        <SchemaMigrationRequired scope="应用配置" />
      </PageTemplate>
    );
  }
}
