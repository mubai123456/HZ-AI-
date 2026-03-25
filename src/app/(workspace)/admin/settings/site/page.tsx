"use client";

import { useEffect, useMemo, useState } from "react";

import { PageTemplate } from "@/components/page-template";
import {
  DEFAULT_SITE_NAV_LABELS,
  SITE_NAV_SECTIONS,
  type SiteNavLabelKey,
  type SiteNavLabels,
} from "@/lib/site-config";

type SiteSettingsResponse = {
  siteName: string;
  siteDescription: string;
  workspaceLabel: string;
  adminWorkspaceLabel: string;
  themeColor: string;
  navLabels: Record<SiteNavLabelKey, string>;
};

export default function SiteSettingsPage() {
  const [siteName, setSiteName] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [workspaceLabel, setWorkspaceLabel] = useState("");
  const [adminWorkspaceLabel, setAdminWorkspaceLabel] = useState("");
  const [themeColor, setThemeColor] = useState("#0066DD");
  const [navLabels, setNavLabels] = useState<Record<SiteNavLabelKey, string>>(
    DEFAULT_SITE_NAV_LABELS,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/internal/admin/settings/site")
      .then(async (response) => {
        const data: SiteSettingsResponse | { error?: string } = await response.json();
        if (!response.ok) {
          throw new Error("error" in data ? data.error : "加载失败");
        }
        return data as SiteSettingsResponse;
      })
      .then((data) => {
        setSiteName(data.siteName);
        setSiteDescription(data.siteDescription);
        setWorkspaceLabel(data.workspaceLabel);
        setAdminWorkspaceLabel(data.adminWorkspaceLabel);
        setThemeColor(data.themeColor);
        setNavLabels(data.navLabels);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "加载失败");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleNavLabelChange = (key: SiteNavLabelKey, value: string) => {
    setNavLabels((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const previewName = useMemo(() => siteName.trim() || "AI Workbench", [siteName]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: Omit<SiteSettingsResponse, "navLabels"> & { navLabels: SiteNavLabels } = {
      siteName,
      siteDescription,
      workspaceLabel,
      adminWorkspaceLabel,
      themeColor,
      navLabels,
    };

    try {
      const response = await fetch("/api/internal/admin/settings/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "保存失败");
      }

      setSuccess("站点设置已保存，导航与品牌信息会在刷新后按新配置显示。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTemplate
      eyebrow="站点设置"
      title="站点设置"
      description="统一维护网站名称、品牌文案、工作区标签和导航命名，避免后续页面继续各写各的。"
      contentClassName="mx-auto max-w-6xl space-y-6"
      action={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="rounded-full bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "保存中..." : "保存站点设置"}
        </button>
      }
    >
      {error ? (
        <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-[24px] border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-950">品牌与工作区</h2>
            <p className="mt-1 text-sm text-slate-500">这些字段会直接影响浏览器标题、壳层品牌区和工作区标签。</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">站点名称</span>
                <input
                  type="text"
                  value={siteName}
                  onChange={(event) => setSiteName(event.target.value)}
                  className="mt-1 w-full rounded-[12px] border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">主题色</span>
                <input
                  type="text"
                  value={themeColor}
                  onChange={(event) => setThemeColor(event.target.value)}
                  placeholder="#0066DD"
                  className="mt-1 w-full rounded-[12px] border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700 outline-none focus:border-slate-500"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">成员工作区标签</span>
                <input
                  type="text"
                  value={workspaceLabel}
                  onChange={(event) => setWorkspaceLabel(event.target.value)}
                  className="mt-1 w-full rounded-[12px] border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-slate-400">管理员工作区标签</span>
                <input
                  type="text"
                  value={adminWorkspaceLabel}
                  onChange={(event) => setAdminWorkspaceLabel(event.target.value)}
                  className="mt-1 w-full rounded-[12px] border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">站点描述</span>
              <textarea
                value={siteDescription}
                onChange={(event) => setSiteDescription(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-[12px] border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
              />
            </label>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-950">导航命名</h2>
            <p className="mt-1 text-sm text-slate-500">这里只改名称，不改路径。后续新增导航前，先补这里的约束。</p>

            <div className="mt-5 space-y-6">
              {SITE_NAV_SECTIONS.map((section) => (
                <div key={section.id} className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {section.fields.map((field) => (
                      <label key={field.key} className="block">
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{field.label}</span>
                        <input
                          type="text"
                          value={navLabels[field.key]}
                          onChange={(event) => handleNavLabelChange(field.key, event.target.value)}
                          className="mt-1 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[24px] border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-950">即时预览</h2>
            <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
              <div
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: themeColor || "#0066DD" }}
              >
                {previewName.slice(0, 1).toUpperCase()}
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-950">{previewName}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{siteDescription || "请输入站点描述"}</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">成员标签</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{workspaceLabel || "Team Workspace"}</p>
                </div>
                <div className="rounded-[14px] border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">管理员标签</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{adminWorkspaceLabel || "Admin Workspace"}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-950">治理约束</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
              <li>名称变更只改配置，不直接改导航代码或壳层文案。</li>
              <li>后续新增导航项时，先补 `site-config.ts` 的字段清单，再接页面。</li>
              <li>站点设置负责命名和品牌，不负责敏感密钥。</li>
            </ul>
          </section>
        </aside>
      </div>
    </PageTemplate>
  );
}
