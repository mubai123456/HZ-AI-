PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_App" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAppId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "shareResults" BOOLEAN NOT NULL DEFAULT false,
    "estimatedPriceFen" INTEGER NOT NULL DEFAULT 0,
    "formSchemaJson" JSONB NOT NULL,
    "requestMappingJson" JSONB NOT NULL,
    "defaultParamsJson" JSONB NOT NULL,
    "syncMappingJson" JSONB NOT NULL,
    "runninghubAllowedChannelCodesJson" JSONB,
    "iconUrl" TEXT,
    "iconBgColor" TEXT,
    "category" TEXT,
    "coverPoster" TEXT,
    "authorName" TEXT,
    "authorAvatar" TEXT,
    "badgeLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_App" (
    "id",
    "code",
    "name",
    "description",
    "provider",
    "providerAppId",
    "enabled",
    "shareResults",
    "estimatedPriceFen",
    "formSchemaJson",
    "requestMappingJson",
    "defaultParamsJson",
    "syncMappingJson",
    "iconUrl",
    "iconBgColor",
    "category",
    "coverPoster",
    "authorName",
    "authorAvatar",
    "badgeLabel",
    "sortOrder",
    "viewCount",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "code",
    "name",
    "description",
    "provider",
    "providerAppId",
    "enabled",
    "shareResults",
    "estimatedPriceFen",
    "formSchemaJson",
    "requestMappingJson",
    "defaultParamsJson",
    "syncMappingJson",
    "iconUrl",
    "iconBgColor",
    "category",
    "coverPoster",
    "authorName",
    "authorAvatar",
    "badgeLabel",
    "sortOrder",
    "viewCount",
    "createdAt",
    "updatedAt"
FROM "App";

DROP TABLE "App";
ALTER TABLE "new_App" RENAME TO "App";
CREATE UNIQUE INDEX "App_code_key" ON "App"("code");

CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteTaskNo" TEXT NOT NULL,
    "taskNo" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerStatus" TEXT,
    "providerTaskId" TEXT,
    "runninghubChannelCode" TEXT,
    "runninghubChannelName" TEXT,
    "providerResultUrl" TEXT,
    "providerErrorMessage" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "syncErrorMessage" TEXT,
    "queuePosition" INTEGER,
    "prompt" TEXT,
    "estimatedPriceFenSnapshot" INTEGER,
    "paramsJson" JSONB,
    "resultJson" JSONB,
    "usageJson" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "appId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "feishuRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Task" (
    "id",
    "siteTaskNo",
    "taskNo",
    "title",
    "status",
    "providerStatus",
    "providerTaskId",
    "providerResultUrl",
    "providerErrorMessage",
    "syncStatus",
    "syncErrorMessage",
    "queuePosition",
    "prompt",
    "estimatedPriceFenSnapshot",
    "paramsJson",
    "resultJson",
    "usageJson",
    "retryCount",
    "maxRetries",
    "appId",
    "createdById",
    "feishuRecordId",
    "createdAt",
    "startedAt",
    "completedAt",
    "updatedAt"
)
SELECT
    "id",
    "siteTaskNo",
    "taskNo",
    "title",
    "status",
    "providerStatus",
    "providerTaskId",
    "providerResultUrl",
    "providerErrorMessage",
    "syncStatus",
    "syncErrorMessage",
    "queuePosition",
    "prompt",
    "estimatedPriceFenSnapshot",
    "paramsJson",
    "resultJson",
    "usageJson",
    "retryCount",
    "maxRetries",
    "appId",
    "createdById",
    "feishuRecordId",
    "createdAt",
    "startedAt",
    "completedAt",
    "updatedAt"
FROM "Task";

DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE UNIQUE INDEX "Task_siteTaskNo_key" ON "Task"("siteTaskNo");
CREATE UNIQUE INDEX "Task_taskNo_key" ON "Task"("taskNo");
CREATE INDEX "Task_status_createdById_idx" ON "Task"("status", "createdById");
CREATE INDEX "Task_syncStatus_idx" ON "Task"("syncStatus");

CREATE TABLE "new_IntegrationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runninghubBaseUrl" TEXT NOT NULL DEFAULT '',
    "runninghubDefaultWebappId" TEXT NOT NULL DEFAULT '',
    "runninghubChannelsJson" JSONB,
    "feishuBaseUrl" TEXT NOT NULL DEFAULT '',
    "taskMaxConcurrency" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_IntegrationSettings" (
    "id",
    "runninghubBaseUrl",
    "runninghubDefaultWebappId",
    "feishuBaseUrl",
    "taskMaxConcurrency",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "runninghubBaseUrl",
    "runninghubDefaultWebappId",
    "feishuBaseUrl",
    "taskMaxConcurrency",
    "createdAt",
    "updatedAt"
FROM "IntegrationSettings";

DROP TABLE "IntegrationSettings";
ALTER TABLE "new_IntegrationSettings" RENAME TO "IntegrationSettings";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
