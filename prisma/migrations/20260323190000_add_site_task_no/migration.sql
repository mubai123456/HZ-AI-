PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteTaskNo" TEXT NOT NULL,
    "taskNo" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerStatus" TEXT,
    "providerTaskId" TEXT,
    "providerResultUrl" TEXT,
    "providerErrorMessage" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "syncErrorMessage" TEXT,
    "queuePosition" INTEGER,
    "prompt" TEXT,
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
    printf('WB-%06d', ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC)),
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

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
