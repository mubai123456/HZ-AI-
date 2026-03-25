import { redirect } from "next/navigation";

import { CategoryManager } from "@/components/category-manager";
import { PageTemplate } from "@/components/page-template";
import { SchemaMigrationRequired } from "@/components/schema-migration-required";
import { getAllCategories } from "@/lib/db/categories";
import {
  isPrismaSchemaMismatchError,
  logPrismaRuntimeDiagnostic,
} from "@/lib/prisma-runtime-diagnostics";
import { getCurrentSession } from "@/lib/session";

export default async function AdminCategoriesPage() {
  const session = await getCurrentSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  try {
    const categories = await getAllCategories();

    return (
      <PageTemplate
        eyebrow="运营配置"
        title="分类管理"
        description="统一维护应用中心的分类结构、启停状态与排序能力，收敛到标准配置型 Management List 模板。"
      >
        <CategoryManager initialCategories={categories} />
      </PageTemplate>
    );
  } catch (error) {
    logPrismaRuntimeDiagnostic("admin categories page", error);
    if (!isPrismaSchemaMismatchError(error)) {
      throw error;
    }

    return (
      <PageTemplate
        eyebrow="运营配置"
        title="分类管理"
        description="统一维护应用中心的分类结构、启停状态与排序能力，收敛到标准配置型 Management List 模板。"
      >
        <SchemaMigrationRequired scope="分类管理" />
      </PageTemplate>
    );
  }
}
