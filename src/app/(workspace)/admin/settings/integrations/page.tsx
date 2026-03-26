"use client";

import { useCallback, useEffect, useState } from "react";

import { FeishuSyncMappingEditor } from "@/components/feishu-sync-mapping-editor";
import { PageTemplate } from "@/components/page-template";
import type { FeishuColumnMappingEntry } from "@/lib/feishu-sync-mapping";
import { getSharedFeishuSyncFieldOptions } from "@/lib/feishu-sync-fields";
import type { RunningHubChannelConfig } from "@/lib/types";

function createDraftChannel(index: number): RunningHubChannelConfig {
  return {
    code: `channel-${index}`,
    name: `通道 ${index}`,
    credentialMode: "DIRECT",
    apiKey: "",
    concurrencyLimit: 5,
    priority: index,
    enabled: true,
  };
}

export default function IntegrationSettingsPage() {
  const [runninghubDefaultWebappId, setRunninghubDefaultWebappId] = useState("");
  const [runninghubChannels, setRunninghubChannels] = useState<RunningHubChannelConfig[]>([]);
  const [feishuBaseUrl, setFeishuBaseUrl] = useState("");
  const [feishuAppId, setFeishuAppId] = useState("");
  const [feishuAppSecret, setFeishuAppSecret] = useState("");
  const [feishuAppToken, setFeishuAppToken] = useState("");
  const [feishuTableId, setFeishuTableId] = useState("");
  const [syncMapping, setSyncMapping] = useState<FeishuColumnMappingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/internal/admin/settings/integrations")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "加载失败");
        }
        return data;
      })
      .then((data) => {
        setRunninghubDefaultWebappId(data.runninghubDefaultWebappId ?? "");
        setRunninghubChannels(data.runninghubChannels ?? []);
        setFeishuBaseUrl(data.feishuBaseUrl ?? "");
        setFeishuAppId(data.feishuAppId ?? "");
        setFeishuAppSecret(data.feishuAppSecret ?? "");
        setFeishuAppToken(data.feishuAppToken ?? "");
        setFeishuTableId(data.feishuTableId ?? "");
        setSyncMapping(data.columnMappings ?? []);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "加载失败");
      })
      .finally(() => setLoading(false));
  }, []);

  const updateChannel = useCallback(
    (index: number, patch: Partial<RunningHubChannelConfig>) => {
      setRunninghubChannels((current) =>
        current.map((channel, channelIndex) =>
          channelIndex === index ? { ...channel, ...patch } : channel,
        ),
      );
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/internal/admin/settings/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runninghubDefaultWebappId,
          runninghubChannels,
          feishuBaseUrl,
          feishuAppId,
          feishuAppSecret,
          feishuAppToken,
          feishuTableId,
          columnMappings: syncMapping,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "保存失败");
      }

      const processed = Number(data?.backfill?.processed ?? 0);
      setSuccess(`集成设置已保存，并重新扫描了 ${processed} 条历史任务用于飞书补同步。`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [
    feishuAppId,
    feishuAppSecret,
    feishuAppToken,
    feishuBaseUrl,
    feishuTableId,
    runninghubChannels,
    runninghubDefaultWebappId,
    syncMapping,
  ]);

  return (
    <PageTemplate
      eyebrow="集成设置"
      title="集成设置"
      description="把算力通道调度、飞书连接和字段映射收敛到同一入口。"
      contentClassName="mx-auto max-w-6xl space-y-6"
      action={
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="rounded-full bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "保存中..." : "保存集成设置"}
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

      <section className="rounded-[24px] border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">算力通道</h2>
            <p className="mt-1 text-sm text-slate-500">
              这里配置默认 WebApp ID、多通道调度参数，以及每个通道的 API 凭据录入方式。
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setRunninghubChannels((current) => [
                ...current,
                createDraftChannel(current.length + 1),
              ])
            }
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            添加通道
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block md:max-w-[280px]">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-400">默认 WebApp ID</span>
            <input
              type="text"
              value={runninghubDefaultWebappId}
              onChange={(event) => setRunninghubDefaultWebappId(event.target.value)}
              className="mt-1 w-full rounded-[12px] border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700 outline-none focus:border-slate-500"
            />
          </label>
        </div>

        <div className="mt-6 space-y-4">
          {runninghubChannels.map((channel, index) => (
            <div
              key={`${channel.code}-${index}`}
              className="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1.2fr_140px_140px]">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">名称</span>
                  <input
                    type="text"
                    value={channel.name}
                    onChange={(event) => updateChannel(index, { name: event.target.value })}
                    className="mt-1 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Code</span>
                  <input
                    type="text"
                    value={channel.code}
                    onChange={(event) => updateChannel(index, { code: event.target.value })}
                    className="mt-1 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-700 outline-none focus:border-slate-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">API 凭据</span>
                  <div className="mt-1 inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs font-medium text-slate-500">
                    <button
                      type="button"
                      onClick={() => updateChannel(index, { credentialMode: "DIRECT" })}
                      className={`rounded-full px-3 py-1 ${
                        channel.credentialMode === "DIRECT"
                          ? "bg-slate-900 text-white"
                          : "text-slate-500"
                      }`}
                    >
                      直接 API
                    </button>
                    <button
                      type="button"
                      onClick={() => updateChannel(index, { credentialMode: "ENV" })}
                      className={`rounded-full px-3 py-1 ${
                        channel.credentialMode === "ENV"
                          ? "bg-slate-900 text-white"
                          : "text-slate-500"
                      }`}
                    >
                      环境变量
                    </button>
                  </div>
                  <input
                    type="text"
                    value={channel.apiKey}
                    onChange={(event) =>
                      updateChannel(index, { apiKey: event.target.value })
                    }
                    className="mt-1 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-700 outline-none focus:border-slate-500"
                  />
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {channel.credentialMode === "ENV"
                      ? "填写环境变量名，例如 CHANNEL_API_KEY。"
                      : "可直接填写该通道使用的 API Key，页面不会回显明文。"}
                  </p>
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">并发上限</span>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={channel.concurrencyLimit}
                    onChange={(event) =>
                      updateChannel(index, {
                        concurrencyLimit: Number(event.target.value || 1),
                      })
                    }
                    className="mt-1 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.16em] text-slate-400">优先级</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={channel.priority}
                    onChange={(event) =>
                      updateChannel(index, { priority: Number(event.target.value || 1) })
                    }
                    className="mt-1 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
                  />
                </label>
              </div>
              <label className="mt-4 inline-flex items-center gap-3 rounded-[12px] border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={channel.enabled}
                  onChange={(event) => updateChannel(index, { enabled: event.target.checked })}
                />
                启用这个通道
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-950">飞书基础连接</h2>
        <p className="mt-1 text-sm text-slate-500">
          这里统一维护基础地址、应用凭据和同步目标；已保存的密钥会以脱敏形式展示。
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <label className="block xl:col-span-2">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Feishu Base URL</span>
            <input
              type="text"
              value={feishuBaseUrl}
              onChange={(event) => setFeishuBaseUrl(event.target.value)}
              className="mt-1 w-full rounded-[12px] border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700 outline-none focus:border-slate-500"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-400">App ID</span>
            <input
              type="text"
              value={feishuAppId}
              onChange={(event) => setFeishuAppId(event.target.value)}
              className="mt-1 w-full rounded-[12px] border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700 outline-none focus:border-slate-500"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-400">App Secret</span>
            <input
              type="text"
              value={feishuAppSecret}
              onChange={(event) => setFeishuAppSecret(event.target.value)}
              className="mt-1 w-full rounded-[12px] border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700 outline-none focus:border-slate-500"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-400">App Token</span>
            <input
              type="text"
              value={feishuAppToken}
              onChange={(event) => setFeishuAppToken(event.target.value)}
              className="mt-1 w-full rounded-[12px] border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700 outline-none focus:border-slate-500"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Table ID</span>
            <input
              type="text"
              value={feishuTableId}
              onChange={(event) => setFeishuTableId(event.target.value)}
              className="mt-1 w-full rounded-[12px] border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700 outline-none focus:border-slate-500"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">飞书字段映射</h2>
          <p className="mt-1 text-sm text-slate-500">
            保存后会自动对历史任务触发补同步，保持目标表结构和任务快照一致。
          </p>
        </div>

        <div className="mt-5">
          <FeishuSyncMappingEditor
            entries={syncMapping}
            options={getSharedFeishuSyncFieldOptions()}
            onChange={setSyncMapping}
            emptyState="全局映射只暴露共享基础字段，建议至少配置任务 ID、状态、应用名称和全部信息。"
            addLabel="添加映射"
            testIdPrefix="site-sync-mapping"
          />
        </div>
      </section>
    </PageTemplate>
  );
}
