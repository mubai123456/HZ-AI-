-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteName" TEXT NOT NULL DEFAULT '',
    "siteDescription" TEXT NOT NULL DEFAULT '',
    "workspaceLabel" TEXT NOT NULL DEFAULT '',
    "adminWorkspaceLabel" TEXT NOT NULL DEFAULT '',
    "themeColor" TEXT NOT NULL DEFAULT '#0066DD',
    "navLabelsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntegrationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runninghubBaseUrl" TEXT NOT NULL DEFAULT '',
    "runninghubDefaultWebappId" TEXT NOT NULL DEFAULT '',
    "feishuBaseUrl" TEXT NOT NULL DEFAULT '',
    "taskMaxConcurrency" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
