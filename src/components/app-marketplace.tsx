"use client";

import { useMemo, useState } from "react";

import { CategoryNav } from "@/components/category-nav";
import { RunningHubLightCard } from "@/components/runninghub-card";
import type { AppWithRunCount } from "@/lib/db/apps";

export interface AppCategoryItem {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
}

interface AppMarketplaceProps {
  apps: AppWithRunCount[];
  categories: AppCategoryItem[];
  embedded?: boolean;
}

export function AppMarketplace({ apps, categories, embedded = false }: AppMarketplaceProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeCategoryId) {
      return apps;
    }

    const categoryName = categories.find((item) => item.id === activeCategoryId)?.name;
    if (!categoryName) {
      return apps;
    }

    return apps.filter((app) => app.category === categoryName);
  }, [activeCategoryId, apps, categories]);

  return (
    <div className="space-y-6 pb-20">
      {embedded ? null : (
        <div className="mt-2 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-800">全部应用</h2>
          <div className="flex items-center gap-3">
            <select className="cursor-pointer bg-transparent text-sm font-medium text-slate-600 outline-none">
              <option>推荐</option>
              <option>最新</option>
              <option>最热</option>
            </select>
            <select className="cursor-pointer bg-transparent text-sm font-medium text-slate-600 outline-none">
              <option>无时间选项</option>
            </select>
          </div>
        </div>
      )}

      <CategoryNav categories={categories} activeCategoryId={activeCategoryId} onSelect={setActiveCategoryId} />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <p className="text-sm">暂无该分类下的应用</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
          {filtered.map((app) => (
            <RunningHubLightCard key={app.code} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
