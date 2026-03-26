import path from "node:path";

import type { Prisma, TaskStatus } from "@prisma/client";

import { env } from "@/lib/env";
import {
  buildPromptTemplateInputVariables,
  composePromptSegments,
  extractProviderSubmitOptions,
} from "@/lib/app-submit";
import {
  buildTaskSyncPayload,
  getResolvedFeishuSyncConfig,
} from "@/lib/feishu-sync";
import { prisma } from "@/lib/prisma";
import {
  recordPromptTemplateUse,
  resolvePromptTemplateForSubmit,
} from "@/lib/db/prompt-templates";
import {
  getRunningHubChannelByCode,
  normalizeRunningHubAllowedChannelCodes,
  resolveRunningHubApiKey,
} from "@/lib/runninghub-channels";
import type { RunningHubChannelConfig } from "@/lib/types";
import {
  buildNodeInfoList,
  buildRunningHubSubmitRequest,
  cancelTask as cancelRunningHubTask,
  extractFileNameFromUrl,
  getRunningHubTaskErrorMessage,
  queryTask,
  submitTask,
  type NodeInfo,
  type RunningHubAuthConfig,
} from "@/lib/runninghub";
import { createRecord, mapToFeishuFields, updateRecord } from "@/lib/feishu";
import { getResultsObjectKey, uploadBufferToObjectStorage } from "@/lib/object-storage";
import { shouldPersistTaskOutputAssets } from "@/lib/task-output-storage";
import { getResolvedIntegrationSettings } from "@/lib/settings";
import { emitTaskUpdate } from "@/lib/sse";
import { allocateNextSiteTaskNo } from "@/lib/site-task-no";
import { isPermanentDispatchError, sanitizeUserFacingError } from "@/lib/user-facing-errors";
import type { TaskSubmissionState } from "@/lib/types";

const TASK_TIMEOUT_MINUTES = 30;
const PENDING_TASK_PREFIX = "PENDING-";
const DISPATCHING_PROVIDER_STATUS = "DISPATCHING";

type QueuedTaskForDispatch = Prisma.TaskGetPayload<{
  include: { app: true };
}>;

function buildPendingTaskNo(siteTaskNo: string) {
  return `${PENDING_TASK_PREFIX}${siteTaskNo}`;
}

function buildRunningHubAuth(
  channel: RunningHubChannelConfig,
  baseUrl: string,
): RunningHubAuthConfig | null {
  const apiKey = resolveRunningHubApiKey(channel.apiKeyEnvName);
  if (!apiKey) {
    return null;
  }

  return {
    baseUrl,
    apiKey,
  };
}

async function persistAssetToStorage(
  cosUrl: string,
  taskId: string,
  filename: string,
): Promise<{ localUrl: string; storageKey: string } | null> {
  try {
    const response = await fetch(cosUrl);
    if (!response.ok) {
      console.warn(`[task-queue] Failed to download asset from ${cosUrl}: ${response.statusText}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const stored = await uploadBufferToObjectStorage({
      objectKey: getResultsObjectKey(taskId, filename),
      body: buffer,
      contentType: response.headers.get("content-type"),
      cacheControl: "public, max-age=31536000, immutable",
      visibility: "public",
    });

    return {
      localUrl: stored.fileUrl,
      storageKey: stored.objectKey,
    };
  } catch (error) {
    console.warn(`[task-queue] Failed to persist asset ${filename}:`, error);
    return null;
  }
}

async function loadTaskWithSyncRelations(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: { app: true, createdBy: true },
  });
}

export async function syncTaskToFeishu(
  taskId: string,
  action: "create" | "update",
  actorId?: string,
): Promise<{ ok: boolean; error?: string }> {
  let payloadForLog: Prisma.InputJsonValue | undefined;

  try {
    const task = await loadTaskWithSyncRelations(taskId);
    if (!task) {
      return { ok: false, error: "Task not found" };
    }

    const syncConfig = await getResolvedFeishuSyncConfig(task.app.syncMappingJson);
    if (!syncConfig.enabled) {
      throw new Error("Feishu sync is not configured");
    }

    const statusMap: Record<string, string> = {
      QUEUED: "排队中",
      RUNNING: "运行中",
      SUCCEEDED: "成功",
      FAILED: "失败",
      CANCELLED: "已取消",
    };
    const providerStatusMap: Record<string, string> = {
      RUNNING: "运行中",
      PENDING: "排队中",
      SUCCESS: "成功",
      FAILED: "失败",
      [DISPATCHING_PROVIDER_STATUS]: "本地派发中",
    };

    const taskData = buildTaskSyncPayload({
      taskNo: task.taskNo,
      status: statusMap[task.status] ?? task.status,
      providerStatus: task.providerStatus
        ? providerStatusMap[task.providerStatus] ?? task.providerStatus
        : undefined,
      providerResultUrl: task.providerResultUrl ?? undefined,
      providerErrorMessage: task.providerErrorMessage ?? undefined,
      providerTaskId: task.providerTaskId ?? undefined,
      ownerName: task.createdBy?.displayName ?? undefined,
      appCode: task.app?.code ?? undefined,
      appName: task.app?.name ?? undefined,
      providerAppId: task.app?.providerAppId ?? undefined,
      prompt: task.prompt ?? undefined,
      createdAt: task.createdAt,
      paramsJson: task.paramsJson,
      requestMappingJson: task.app?.requestMappingJson,
      defaultParamsJson: task.app?.defaultParamsJson,
      formSchemaJson: task.app?.formSchemaJson,
      resultJson: task.resultJson,
      webhookUrl: `${env.APP_URL}/api/webhook`,
    });

    const runSyncAttempt = async (mapping: Record<string, string>) => {
      const feishuFields = mapToFeishuFields(mapping, taskData);
      if (Object.keys(feishuFields).length === 0) {
        throw new Error("No valid Feishu field mappings configured");
      }

      if (action === "create" && !task.feishuRecordId) {
        const recordId = await createRecord(syncConfig.target, feishuFields);
        await prisma.task.update({
          where: { id: taskId },
          data: { feishuRecordId: recordId },
        });
      } else if (task.feishuRecordId) {
        await updateRecord(syncConfig.target, task.feishuRecordId, feishuFields);
      } else {
        const recordId = await createRecord(syncConfig.target, feishuFields);
        await prisma.task.update({
          where: { id: taskId },
          data: { feishuRecordId: recordId },
        });
      }

      return feishuFields;
    };

    try {
      const feishuFields = await runSyncAttempt(syncConfig.mapping as Record<string, string>);
      payloadForLog = feishuFields as unknown as Prisma.InputJsonValue;
    } catch (syncError) {
      const errorMessage = syncError instanceof Error ? syncError.message : String(syncError);
      const canRetryWithGlobalOnly =
        errorMessage.includes("FieldNameNotFound") &&
        Object.keys(syncConfig.appMapping).length > 0 &&
        Object.keys(syncConfig.globalMapping).length > 0;

      if (!canRetryWithGlobalOnly) {
        throw syncError;
      }

      const feishuFields = await runSyncAttempt(syncConfig.globalMapping as Record<string, string>);
      payloadForLog = feishuFields as unknown as Prisma.InputJsonValue;
    }

    await prisma.syncLog.create({
      data: {
        taskId,
        actorId: actorId ?? null,
        status: "SUCCESS",
        target: "FEISHU",
        message: "飞书记录同步成功",
        payloadJson: (payloadForLog ?? null) as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { syncStatus: "SUCCESS", syncErrorMessage: null },
    });

    return { ok: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[task-queue] Feishu sync failed for task ${taskId}:`, error);

    await prisma.syncLog.create({
      data: {
        taskId,
        actorId: actorId ?? null,
        status: "FAILED",
        target: "FEISHU",
        message: errorMessage,
        payloadJson: (payloadForLog ?? null) as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { syncStatus: "FAILED", syncErrorMessage: errorMessage },
    });

    return { ok: false, error: errorMessage };
  }
}

async function recomputeQueuedTaskPositions() {
  const queuedTasks = await prisma.task.findMany({
    where: { status: "QUEUED" },
    select: { id: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  await prisma.$transaction(
    queuedTasks.map((task, index) =>
      prisma.task.update({
        where: { id: task.id },
        data: { queuePosition: index + 1 },
      }),
    ),
  );
}

async function createOutputAssets(
  taskId: string,
  results: Array<{ url: string; outputType: string; text: string | null }>,
) {
  const persistOutputs = shouldPersistTaskOutputAssets(env.TASK_OUTPUT_STORAGE_MODE);

  for (const result of results) {
    const filename = `output_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${result.outputType || "png"}`;
    const localAsset = persistOutputs
      ? await persistAssetToStorage(result.url, taskId, filename)
      : null;

    await prisma.taskAsset.create({
      data: {
        taskId,
        kind: "OUTPUT",
        name: `结果文件 ${result.outputType}`,
        url: localAsset?.localUrl ?? result.url,
        storageKey: localAsset?.storageKey ?? null,
        mimeType: result.outputType,
      },
    });
  }
}

function buildPersistedAssetFilename(prefix: string, sourceUrl: string) {
  const extractedName = extractFileNameFromUrl(sourceUrl);
  const extension = path.extname(extractedName) || ".png";
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]+/g, "-");

  return `${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${extension}`;
}

async function createInputAssets(
  taskId: string,
  formData: Record<string, string | string[]>,
  formSchema: Array<{
    key: string;
    type: string;
    description?: string;
    label: string;
    options?: Array<{ label: string; value: string }>;
  }>,
) {
  const imageFields = formSchema.filter((field) => field.type === "image");

  for (const [index, field] of imageFields.entries()) {
    const fieldValue = formData[field.key];
    if (typeof fieldValue !== "string" || !fieldValue) {
      continue;
    }

    let assetUrl = fieldValue;
    let storageKey: string | null = null;

    if (/^https?:\/\//i.test(fieldValue)) {
      const localAsset = await persistAssetToStorage(
        fieldValue,
        taskId,
        buildPersistedAssetFilename(`input_${field.key}`, fieldValue),
      );

      if (localAsset) {
        assetUrl = localAsset.localUrl;
        storageKey = localAsset.storageKey;
      }
    } else if (fieldValue.startsWith("/assets/")) {
      storageKey = fieldValue;
    }

    await prisma.taskAsset.create({
      data: {
        taskId,
        kind: "INPUT",
        name: field.label || `参考图 ${index + 1}`,
        url: assetUrl,
        storageKey,
        sourceSlot: field.key,
      },
    });
  }
}

async function resolveRunningHubAuthForTask(task: {
  runninghubChannelCode: string | null;
}) {
  const integrationSettings = await getResolvedIntegrationSettings();
  const channel = getRunningHubChannelByCode(
    integrationSettings.runninghubChannels,
    task.runninghubChannelCode,
  );

  if (!channel) {
    throw new Error(`RunningHub channel not found: ${task.runninghubChannelCode ?? "unknown"}`);
  }

  const auth = buildRunningHubAuth(channel, integrationSettings.runninghubBaseUrl);
  if (!auth) {
    throw new Error(`Missing RunningHub API key: ${channel.apiKeyEnvName}`);
  }

  return { channel, auth };
}

async function reserveQueuedTask(taskId: string) {
  const result = await prisma.task.updateMany({
    where: {
      id: taskId,
      status: "QUEUED",
      OR: [
        { providerStatus: null },
        { providerStatus: { not: DISPATCHING_PROVIDER_STATUS } },
      ],
    },
    data: {
      providerStatus: DISPATCHING_PROVIDER_STATUS,
      providerErrorMessage: null,
    },
  });

  return result.count > 0;
}

function getAllowedChannelsForApp(
  app: { runninghubAllowedChannelCodesJson: Prisma.JsonValue | null },
  allChannels: RunningHubChannelConfig[],
) {
  const allowedCodes = normalizeRunningHubAllowedChannelCodes(app.runninghubAllowedChannelCodesJson);
  const enabledChannels = allChannels.filter((channel) => channel.enabled);
  if (!allowedCodes?.length) {
    return enabledChannels;
  }

  return enabledChannels.filter((channel) => allowedCodes.includes(channel.code));
}

async function getRunningTaskCountByChannel() {
  const runningTasks = await prisma.task.findMany({
    where: {
      status: "RUNNING",
      runninghubChannelCode: { not: null },
    },
    select: { runninghubChannelCode: true },
  });

  const counts = new Map<string, number>();
  for (const task of runningTasks) {
    if (!task.runninghubChannelCode) {
      continue;
    }
    counts.set(task.runninghubChannelCode, (counts.get(task.runninghubChannelCode) ?? 0) + 1);
  }

  return counts;
}

async function markDispatchFailure(
  task: QueuedTaskForDispatch,
  errorMessage: string,
  options?: { immediateFail?: boolean },
) {
  const nextRetryCount = task.retryCount + 1;
  const exceedsRetryLimit = options?.immediateFail ? true : nextRetryCount >= task.maxRetries;

  await prisma.task.update({
    where: { id: task.id },
    data: exceedsRetryLimit
      ? {
          status: "FAILED",
          providerStatus: "FAILED",
          providerErrorMessage: `${errorMessage}（已重试 ${task.maxRetries} 次）`,
          completedAt: new Date(),
          queuePosition: null,
          runninghubChannelCode: null,
          runninghubChannelName: null,
          retryCount: nextRetryCount,
        }
      : {
          status: "QUEUED",
          taskNo: buildPendingTaskNo(task.siteTaskNo),
          providerStatus: null,
          providerTaskId: null,
          providerErrorMessage: `${errorMessage}（等待重试 ${nextRetryCount}/${task.maxRetries}）`,
          queuePosition: task.queuePosition ?? null,
          runninghubChannelCode: null,
          runninghubChannelName: null,
          retryCount: nextRetryCount,
        },
  });

  if (exceedsRetryLimit) {
    await syncTaskToFeishu(task.id, "update");
    emitTaskUpdate({
      taskId: task.id,
      status: "FAILED",
      providerStatus: "FAILED",
      errorMessage: `${errorMessage}（已重试 ${task.maxRetries} 次）`,
    });
  }
}

async function dispatchTaskToChannel(
  task: QueuedTaskForDispatch,
  channel: RunningHubChannelConfig,
  auth: RunningHubAuthConfig,
) {
  const submitRequest =
    ((task.resultJson as Record<string, unknown> | null)?.submitRequest as {
      nodeInfoList?: NodeInfo[];
      webhookUrl?: string;
      [key: string]: unknown;
    } | null) ?? null;
  const nodeInfoList = Array.isArray(submitRequest?.nodeInfoList)
    ? (submitRequest.nodeInfoList as NodeInfo[])
    : null;

  if (!nodeInfoList) {
    throw new Error("Task submit snapshot is missing nodeInfoList");
  }

  const submitOptions = Object.fromEntries(
    Object.entries(submitRequest ?? {}).filter(
      ([key, value]) =>
        key !== "nodeInfoList" && key !== "webhookUrl" && typeof value === "string",
    ),
  ) as Record<string, string>;
  const webhookUrl =
    typeof submitRequest?.webhookUrl === "string" ? submitRequest.webhookUrl : `${env.APP_URL}/api/webhook`;

  const rhResponse = await submitTask(
    task.app.providerAppId,
    nodeInfoList,
    webhookUrl,
    submitOptions,
    auth,
  );
  const startedAt = new Date();

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: "RUNNING",
      taskNo: rhResponse.taskId,
      providerTaskId: rhResponse.taskId,
      providerStatus: rhResponse.status,
      queuePosition: null,
      startedAt,
      runninghubChannelCode: channel.code,
      runninghubChannelName: channel.name,
    },
  });

  await syncTaskToFeishu(task.id, task.feishuRecordId ? "update" : "create");

  emitTaskUpdate({
    taskId: task.id,
    status: "RUNNING",
    providerStatus: rhResponse.status,
    runninghubChannelCode: channel.code,
    runninghubChannelName: channel.name,
  });

  return rhResponse;
}

async function dispatchQueuedTasks() {
  const integrationSettings = await getResolvedIntegrationSettings();
  const runningCounts = await getRunningTaskCountByChannel();
  const queuedTasks = await prisma.task.findMany({
    where: {
      status: "QUEUED",
      OR: [
        { providerStatus: null },
        { providerStatus: { not: DISPATCHING_PROVIDER_STATUS } },
      ],
    },
    include: { app: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  for (const task of queuedTasks) {
    const eligibleChannels = getAllowedChannelsForApp(task.app, integrationSettings.runninghubChannels);
    if (eligibleChannels.length === 0) {
      await markDispatchFailure(task, "当前应用未配置可用的 RunningHub 通道。", {
        immediateFail: true,
      });
      continue;
    }

    const channelsWithCapacity = eligibleChannels.filter(
      (channel) => (runningCounts.get(channel.code) ?? 0) < channel.concurrencyLimit,
    );
    if (channelsWithCapacity.length === 0) {
      continue;
    }

    const candidate = channelsWithCapacity.find(
      (channel) => Boolean(buildRunningHubAuth(channel, integrationSettings.runninghubBaseUrl)),
    );
    if (!candidate) {
      await markDispatchFailure(task, "RunningHub 通道未配置完成，请联系管理员检查集成设置。", {
        immediateFail: true,
      });
      continue;
    }

    const reserved = await reserveQueuedTask(task.id);
    if (!reserved) {
      continue;
    }

    const auth = buildRunningHubAuth(candidate, integrationSettings.runninghubBaseUrl);
    if (!auth) {
      await markDispatchFailure(task, "RunningHub 通道未配置完成，请联系管理员检查集成设置。", {
        immediateFail: true,
      });
      continue;
    }

    try {
      await dispatchTaskToChannel(task, candidate, auth);
      runningCounts.set(candidate.code, (runningCounts.get(candidate.code) ?? 0) + 1);
    } catch (error) {
      console.error(`[task-queue] dispatch error for task ${task.id}:`, error);
      await markDispatchFailure(task, sanitizeUserFacingError(error, "submit"), {
        immediateFail: isPermanentDispatchError(error),
      });
    }
  }

  await recomputeQueuedTaskPositions();
}

export interface PumpResult {
  taskId: string;
  newStatus: TaskStatus;
  providerResultUrl?: string | null;
  errorMessage?: string;
}

export async function pumpQueuedTasks(): Promise<PumpResult[]> {
  const results: PumpResult[] = [];
  const timeoutMs = TASK_TIMEOUT_MINUTES * 60 * 1000;
  const now = Date.now();

  const runningTasks = await prisma.task.findMany({
    where: { status: "RUNNING" },
    include: { app: true },
    orderBy: { createdAt: "asc" },
  });

  for (const task of runningTasks) {
    try {
      const isStale = !task.providerTaskId || task.createdAt.getTime() + timeoutMs < now;
      if (isStale) {
        const reason = !task.providerTaskId
          ? "任务提交失败：未获得 RunningHub 任务 ID"
          : `任务超时：运行时间超过 ${TASK_TIMEOUT_MINUTES} 分钟`;

        if (task.retryCount < task.maxRetries) {
          const newRetryCount = task.retryCount + 1;
          await prisma.task.update({
            where: { id: task.id },
            data: {
              status: "QUEUED",
              taskNo: buildPendingTaskNo(task.siteTaskNo),
              providerStatus: null,
              providerTaskId: null,
              providerErrorMessage: `${reason}（重试 ${newRetryCount}/${task.maxRetries}）`,
              retryCount: newRetryCount,
              startedAt: null,
              completedAt: null,
              runninghubChannelCode: null,
              runninghubChannelName: null,
            },
          });

          await syncTaskToFeishu(task.id, "update");
          emitTaskUpdate({
            taskId: task.id,
            status: "QUEUED",
            errorMessage: `${reason}，正在重试 (${newRetryCount}/${task.maxRetries})`,
          });
          results.push({
            taskId: task.id,
            newStatus: "QUEUED",
            errorMessage: `${reason}，正在重试 (${newRetryCount}/${task.maxRetries})`,
          });
          continue;
        }

        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: "FAILED",
            providerStatus: "FAILED",
            providerErrorMessage: `${reason}（已重试 ${task.maxRetries} 次）`,
            startedAt: task.startedAt ?? task.createdAt,
            completedAt: new Date(),
          },
        });

        await syncTaskToFeishu(task.id, "update");
        emitTaskUpdate({
          taskId: task.id,
          status: "FAILED",
          providerStatus: "FAILED",
          errorMessage: `${reason}（已重试 ${task.maxRetries} 次）`,
        });
        results.push({
          taskId: task.id,
          newStatus: "FAILED",
          errorMessage: `${reason}（已重试 ${task.maxRetries} 次）`,
        });
        continue;
      }

      if (!task.providerTaskId) {
        continue;
      }

      const { auth } = await resolveRunningHubAuthForTask(task);
      const rhResponse = await queryTask(task.providerTaskId, auth);
      const newStatus: TaskStatus =
        rhResponse.status === "SUCCESS"
          ? "SUCCEEDED"
          : rhResponse.status === "FAILED"
            ? "FAILED"
            : "RUNNING";
      const providerResultUrl = rhResponse.results?.[0]?.url ?? null;
      const providerErrorMessage = getRunningHubTaskErrorMessage(rhResponse) || null;

      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: newStatus,
          providerStatus: rhResponse.status,
          providerResultUrl,
          providerErrorMessage,
          startedAt:
            newStatus === "RUNNING"
              ? task.startedAt ?? new Date()
              : task.startedAt ?? task.createdAt,
          completedAt: newStatus === "SUCCEEDED" || newStatus === "FAILED" ? new Date() : null,
          usageJson: rhResponse.usage as object,
        },
      });

      if (newStatus === "SUCCEEDED" && rhResponse.results?.length) {
        await createOutputAssets(task.id, rhResponse.results);
      }

      await syncTaskToFeishu(task.id, "update");
      emitTaskUpdate({
        taskId: task.id,
        status: newStatus,
        providerStatus: rhResponse.status,
        providerResultUrl: providerResultUrl ?? undefined,
        errorMessage: providerErrorMessage ?? undefined,
      });
      results.push({
        taskId: task.id,
        newStatus,
        providerResultUrl,
        errorMessage: providerErrorMessage ?? undefined,
      });
    } catch (error) {
      console.error(`[task-queue] pump error for task ${task.id}:`, error);
    }
  }

  await dispatchQueuedTasks();
  return results;
}

export async function pumpTask(rhTaskId: string): Promise<PumpResult> {
  const task = await prisma.task.findFirst({
    where: { providerTaskId: rhTaskId },
    include: { app: true },
  });

  if (!task) {
    throw new Error(`Task not found for RH taskId: ${rhTaskId}`);
  }
  if (task.status === "SUCCEEDED" || task.status === "FAILED") {
    return { taskId: task.id, newStatus: task.status };
  }

  const { auth } = await resolveRunningHubAuthForTask(task);
  const rhResponse = await queryTask(rhTaskId, auth);
  const newStatus: TaskStatus =
    rhResponse.status === "SUCCESS"
      ? "SUCCEEDED"
      : rhResponse.status === "FAILED"
        ? "FAILED"
        : "RUNNING";
  const providerResultUrl = rhResponse.results?.[0]?.url ?? null;
  const providerErrorMessage = getRunningHubTaskErrorMessage(rhResponse) || null;

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: newStatus,
      providerStatus: rhResponse.status,
      providerResultUrl,
      providerErrorMessage,
      startedAt:
        newStatus === "RUNNING"
          ? task.startedAt ?? new Date()
          : task.startedAt ?? task.createdAt,
      completedAt: newStatus === "SUCCEEDED" || newStatus === "FAILED" ? new Date() : null,
      usageJson: rhResponse.usage as object,
    },
  });

  if (newStatus === "SUCCEEDED" && rhResponse.results?.length) {
    await createOutputAssets(task.id, rhResponse.results);
  }

  await syncTaskToFeishu(task.id, "update");
  emitTaskUpdate({
    taskId: task.id,
    status: newStatus,
    providerStatus: rhResponse.status,
    providerResultUrl: providerResultUrl ?? undefined,
    errorMessage: providerErrorMessage ?? undefined,
  });

  return { taskId: task.id, newStatus, providerResultUrl, errorMessage: providerErrorMessage ?? undefined };
}

export interface RunningHubWebhookPayload {
  event: "TASK_END";
  eventData: {
    taskId: string;
    status: "SUCCESS" | "FAILED" | "RUNNING" | "QUEUED";
    errorCode: string;
    errorMessage: string;
    results: Array<{ url: string; outputType: string; text: string | null }>;
    clientId: string;
    promptTips: string;
    usage: Record<string, unknown>;
    failedReason: Record<string, unknown>;
  };
  taskId: string;
}

export async function handleWebhook(payload: RunningHubWebhookPayload): Promise<void> {
  const { taskId: rhTaskId, status, results } = payload.eventData;

  const task = await prisma.task.findFirst({
    where: { providerTaskId: rhTaskId },
    include: { app: true, createdBy: true },
  });

  if (!task) {
    console.error(`[webhook] Task not found for RH taskId: ${rhTaskId}`);
    return;
  }

  if (task.status === "SUCCEEDED" || task.status === "FAILED") {
    return;
  }

  const newStatus: TaskStatus = status === "SUCCESS" ? "SUCCEEDED" : "FAILED";
  const providerResultUrl = results?.[0]?.url ?? null;
  const providerErrorMessage = getRunningHubTaskErrorMessage(payload.eventData) || null;

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: newStatus,
      providerStatus: status,
      providerResultUrl,
      providerErrorMessage,
      startedAt: task.startedAt ?? task.createdAt,
      completedAt: new Date(),
      usageJson: payload.eventData.usage as object,
    },
  });

  if (newStatus === "SUCCEEDED" && results?.length) {
    await createOutputAssets(task.id, results);
  }

  await syncTaskToFeishu(task.id, "update");
  emitTaskUpdate({
    taskId: task.id,
    status: newStatus,
    providerStatus: status,
    providerResultUrl: providerResultUrl ?? undefined,
    errorMessage: providerErrorMessage ?? undefined,
  });
  await dispatchQueuedTasks();
}

export async function cancelTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { app: true },
  });

  if (!task) {
    return { success: false, error: "任务不存在" };
  }

  if (task.status === "SUCCEEDED" || task.status === "FAILED" || task.status === "CANCELLED") {
    return { success: false, error: `任务已是 ${task.status} 状态，无法取消` };
  }

  if (task.providerTaskId && task.runninghubChannelCode) {
    try {
      const { auth } = await resolveRunningHubAuthForTask(task);
      await cancelRunningHubTask(task.providerTaskId, auth);
    } catch (error) {
      console.warn(`[task-queue] cancel provider task failed for ${task.id}:`, error);
    }
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "CANCELLED",
      providerStatus: "CANCELLED",
      startedAt: task.startedAt ?? task.createdAt,
      completedAt: new Date(),
      queuePosition: null,
    },
  });

  await syncTaskToFeishu(taskId, "update");
  emitTaskUpdate({
    taskId: task.id,
    status: "CANCELLED",
    providerStatus: "CANCELLED",
  });
  await recomputeQueuedTaskPositions();

  return { success: true };
}

export interface SubmitTaskInput {
  appCode: string;
  formData: Record<string, string | string[]>;
  selectedPromptTemplateId?: string;
  userId: string;
}

export async function submitNewTask(
  input: SubmitTaskInput,
): Promise<{
  taskId: string;
  taskNo: string;
  submissionState: TaskSubmissionState;
  message?: string | null;
}> {
  const { appCode, formData, selectedPromptTemplateId, userId } = input;

  const app = await prisma.app.findUnique({ where: { code: appCode } });
  if (!app) {
    throw new Error(`App not found: ${appCode}`);
  }
  if (!app.enabled) {
    throw new Error(`App is not enabled: ${appCode}`);
  }

  const formSchemaForPrompt = app.formSchemaJson as Array<{ key: string; type: string }>;
  const promptField = formSchemaForPrompt.find(
    (field) => field.type === "textarea" && field.key === "prompt",
  );
  const textareaField = promptField ?? formSchemaForPrompt.find((field) => field.type === "textarea");
  const inputVariables = buildPromptTemplateInputVariables(formData);
  const userPromptValue =
    inputVariables.prompt ??
    (textareaField && typeof formData[textareaField.key] === "string"
      ? (formData[textareaField.key] as string)
      : null);
  const selectedTemplate = selectedPromptTemplateId
    ? await resolvePromptTemplateForSubmit({
        templateId: selectedPromptTemplateId,
        appCode,
      })
    : null;
  const providerFormData = { ...formData };
  if (textareaField) {
    providerFormData[textareaField.key] = composePromptSegments({
      templatePrompt: selectedTemplate?.templatePrompt,
      userPrompt: userPromptValue,
      inputVariables,
    });
  }

  const siteTaskNo = await allocateNextSiteTaskNo(prisma);
  const requestMapping = app.requestMappingJson as Record<string, string>;
  const formSchema = app.formSchemaJson as Array<{
    key: string;
    type: string;
    description?: string;
    label: string;
    options?: Array<{ label: string; value: string }>;
  }>;
  const defaultParams = app.defaultParamsJson as Record<string, string>;
  const nodeInfoList = buildNodeInfoList(providerFormData, requestMapping, formSchema, defaultParams);
  const submitOptions = extractProviderSubmitOptions(
    defaultParams,
    formSchema.map((field) => field.key),
  );
  const webhookUrl = `${env.APP_URL}/api/webhook`;
  const submitRequest = buildRunningHubSubmitRequest(nodeInfoList, webhookUrl, submitOptions);

  const task = await prisma.task.create({
    data: {
      siteTaskNo,
      taskNo: buildPendingTaskNo(siteTaskNo),
      appId: app.id,
      createdById: userId,
      status: "QUEUED",
      syncStatus: "PENDING",
      prompt: userPromptValue,
      estimatedPriceFenSnapshot: app.estimatedPriceFen,
      paramsJson: formData as unknown as Record<string, string>,
      resultJson: {
        submitRequest,
        ...(selectedTemplate
          ? {
              promptTemplate: {
                id: selectedTemplate.id,
                name: selectedTemplate.name,
                templatePrompt: selectedTemplate.templatePrompt,
              },
            }
          : {}),
      } as Prisma.InputJsonValue,
    },
  });

  await createInputAssets(task.id, formData, formSchema);

  if (selectedTemplate) {
    await recordPromptTemplateUse({
      templateId: selectedTemplate.id,
      userId,
    });
  }

  await recomputeQueuedTaskPositions();
  await syncTaskToFeishu(task.id, "create");
  await recomputeQueuedTaskPositions();

  const queuedTask = await prisma.task.findUnique({
    where: { id: task.id },
    select: { queuePosition: true },
  });
  emitTaskUpdate({
    taskId: task.id,
    status: "QUEUED",
    providerStatus: undefined,
    queuePosition: queuedTask?.queuePosition ?? undefined,
  });

  await dispatchQueuedTasks();

  const latestTask = await prisma.task.findUnique({
    where: { id: task.id },
    select: {
      id: true,
      taskNo: true,
      status: true,
      providerTaskId: true,
      providerErrorMessage: true,
      queuePosition: true,
    },
  });
  if (!latestTask) {
    throw new Error("Task disappeared after submission");
  }

  const submissionState: TaskSubmissionState =
    latestTask.status === "FAILED" ? "FAILED" : latestTask.providerTaskId ? "RUNNING" : "QUEUED";
  const message =
    submissionState === "FAILED"
      ? latestTask.providerErrorMessage ?? "任务提交失败，请稍后重试。"
      : submissionState === "QUEUED"
        ? "任务已进入本地队列，等待派发到 RunningHub。"
        : "任务已提交到 RunningHub，结果会自动刷新。";

  return {
    taskId: latestTask.id,
    taskNo: latestTask.taskNo,
    submissionState,
    message,
  };
}
