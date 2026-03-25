"use client";

import { useState } from "react";

import type { MaterialQuotaRecord, MyClaimedMaterialRecord, PublishLinkRecord } from "@/lib/types";

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(value / 1024, 1).toFixed(1)} KB`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

type PublishDraft = {
  url: string;
  platform: string;
  note: string;
};

export function ProfileClient({
  username,
  displayName,
  quota,
  materials,
  embedded: _embedded = false,
}: {
  username: string;
  displayName: string;
  quota: MaterialQuotaRecord;
  materials: MyClaimedMaterialRecord[];
  embedded?: boolean;
}) {
  const [items, setItems] = useState(materials);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [submittingClaimId, setSubmittingClaimId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PublishDraft>>(
    Object.fromEntries(
      materials.map((item) => [
        item.claimId,
        {
          url: "",
          platform: "",
          note: "",
        },
      ]),
    ),
  );

  function updateDraft(claimId: string, patch: Partial<PublishDraft>) {
    setDrafts((current) => ({
      ...current,
      [claimId]: {
        url: current[claimId]?.url ?? "",
        platform: current[claimId]?.platform ?? "",
        note: current[claimId]?.note ?? "",
        ...patch,
      },
    }));
  }

  async function handleDownload(materialId: string) {
    setDownloadingId(materialId);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/materials/${materialId}/download`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(data?.error ?? "下载失败，请稍后重试。");
        return;
      }

      window.location.href = data.url;
      setMessage(`下载已开始，链接有效期到 ${new Date(data.expiresAt).toLocaleString("zh-CN")}`);
    } catch {
      setMessage("下载请求失败。");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleAddLink(claimId: string) {
    const draft = drafts[claimId];
    if (!draft?.url.trim()) {
      setMessage("请先填写发布链接。");
      return;
    }

    setSubmittingClaimId(claimId);
    setMessage(null);

    try {
      const response = await fetch(`/api/internal/me/materials/${claimId}/publish-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: draft.url.trim(),
          platform: draft.platform.trim() || null,
          note: draft.note.trim() || null,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setMessage(data?.error ?? "保存发布链接失败。");
        return;
      }

      const created = data.item as PublishLinkRecord;
      setItems((current) =>
        current.map((item) =>
          item.claimId === claimId
            ? {
                ...item,
                publishLinks: [created, ...item.publishLinks],
              }
            : item,
        ),
      );
      updateDraft(claimId, { url: "", platform: "", note: "" });
      setMessage("发布链接已保存。");
    } catch {
      setMessage("保存发布链接失败。");
    } finally {
      setSubmittingClaimId(null);
    }
  }

  async function handleDeleteLink(claimId: string, linkId: string) {
    const response = await fetch(`/api/internal/me/materials/${claimId}/publish-links/${linkId}`, {
      method: "DELETE",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setMessage(data?.error ?? "删除发布链接失败。");
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.claimId === claimId
          ? {
              ...item,
              publishLinks: item.publishLinks.filter((link) => link.id !== linkId),
            }
          : item,
      ),
    );
    setMessage("发布链接已删除。");
  }

  return (
    <div className="space-y-6">
      {!_embedded ? (
        <div>
          <p className="text-sm text-slate-500">我的内容</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">领取记录与发布追踪</h1>
          <p className="mt-2 text-sm text-slate-500">
            {displayName} / {username}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">今日额度</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{quota.limitCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">今日已用</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{quota.usedCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">剩余额度</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{quota.remainingCount}</p>
        </div>
      </div>

      {message ? (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {message}
        </div>
      ) : null}

      <div className="rounded-[24px] border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-950">我的素材</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-400">你还没有领取任何素材。</div>
          ) : (
            items.map((item) => (
              <div key={item.claimId} className="space-y-4 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-28 w-20 overflow-hidden rounded-[18px] bg-slate-100">
                      {item.previewUrl ? (
                        <video
                          src={item.previewUrl}
                          muted
                          playsInline
                          preload="metadata"
                          controls={false}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-950">{item.title}</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {item.claimStatusLabel}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {item.materialTypeLabel} / {formatBytes(item.fileSizeBytes)} / {item.sourceFilename}
                      </p>
                      <p className="text-xs text-slate-400">领取时间：{formatDateTime(item.claimCreatedAt)}</p>
                      {item.resetReason ? <p className="text-xs text-rose-500">重置原因：{item.resetReason}</p> : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={item.claimStatus !== "ACTIVE" || downloadingId === item.id}
                    onClick={() => void handleDownload(item.id)}
                    className="rounded-full bg-[#0066DD] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0055BB] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {downloadingId === item.id ? "处理中..." : "重新下载"}
                  </button>
                </div>

                <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">发布链接追踪</h3>
                    <span className="text-xs text-slate-500">共 {item.publishLinks.length} 条</span>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-[2fr,1fr,1.5fr,auto]">
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                      placeholder="填写发布后的链接"
                      value={drafts[item.claimId]?.url ?? ""}
                      onChange={(event) => updateDraft(item.claimId, { url: event.target.value })}
                    />
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                      placeholder="平台，例如抖音"
                      value={drafts[item.claimId]?.platform ?? ""}
                      onChange={(event) => updateDraft(item.claimId, { platform: event.target.value })}
                    />
                    <input
                      className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm"
                      placeholder="备注，可选"
                      value={drafts[item.claimId]?.note ?? ""}
                      onChange={(event) => updateDraft(item.claimId, { note: event.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddLink(item.claimId)}
                      disabled={submittingClaimId === item.claimId}
                      className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {submittingClaimId === item.claimId ? "保存中..." : "新增链接"}
                    </button>
                  </div>

                  {item.publishLinks.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-400">
                      还没有填写发布链接。
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {item.publishLinks.map((link) => (
                        <div
                          key={link.id}
                          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="space-y-1">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-sm font-medium text-[#0066DD] underline underline-offset-2"
                            >
                              {link.url}
                            </a>
                            <p className="text-xs text-slate-500">
                              平台：{link.platform || "未填写"} / 备注：{link.note || "无"} / 创建于：
                              {formatDateTime(link.createdAt)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteLink(item.claimId, link.id)}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
