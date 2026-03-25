-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('INPUT', 'OUTPUT');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('VIDEO', 'IMAGE');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'AVAILABLE', 'CLAIMED', 'OFF_SHELF', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VariantKind" AS ENUM ('ORIGINAL', 'PREVIEW_WATERMARK', 'POSTER', 'THUMBNAIL');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('ACTIVE', 'RESET_BY_ADMIN', 'DELIVERY_FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('UPLOAD', 'COMPLETE', 'CLAIM', 'RESET', 'OFF_SHELF', 'QUOTA_CHANGE');

-- CreateEnum
CREATE TYPE "PromptTemplateScopeMode" AS ENUM ('GLOBAL', 'LIMITED');

-- CreateEnum
CREATE TYPE "PromptTemplateMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "passwordHash" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "dailyClaimLimit" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App" (
    "id" TEXT NOT NULL,
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
    "showcaseImagesJson" JSONB,
    "authorName" TEXT,
    "authorAvatar" TEXT,
    "badgeLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "App_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2563EB',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppTagLink" (
    "appId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "AppTagLink_pkey" PRIMARY KEY ("appId","tagId")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "siteTaskNo" TEXT NOT NULL,
    "taskNo" TEXT NOT NULL,
    "title" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'QUEUED',
    "providerStatus" TEXT,
    "providerTaskId" TEXT,
    "runninghubChannelCode" TEXT,
    "runninghubChannelName" TEXT,
    "providerResultUrl" TEXT,
    "providerErrorMessage" TEXT,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAsset" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT,
    "url" TEXT,
    "storageKey" TEXT,
    "sourceSlot" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "target" TEXT NOT NULL,
    "message" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplateCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2563eb',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplateCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "appCode" TEXT,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "sampleMediaType" "PromptTemplateMediaType" NOT NULL DEFAULT 'IMAGE',
    "sampleMediaUrl" TEXT,
    "samplePosterUrl" TEXT,
    "templatePrompt" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "scopeMode" "PromptTemplateScopeMode" NOT NULL DEFAULT 'GLOBAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplateAppScope" (
    "templateId" TEXT NOT NULL,
    "appCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTemplateAppScope_pkey" PRIMARY KEY ("templateId","appCode")
);

-- CreateTable
CREATE TABLE "PromptTemplateFavorite" (
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTemplateFavorite_pkey" PRIMARY KEY ("userId","templateId")
);

-- CreateTable
CREATE TABLE "PromptTemplateRecentUse" (
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptTemplateRecentUse_pkey" PRIMARY KEY ("userId","templateId")
);

-- CreateTable
CREATE TABLE "FeishuSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "feishuAppToken" TEXT NOT NULL DEFAULT '',
    "feishuTableId" TEXT NOT NULL DEFAULT '',
    "columnMappings" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeishuSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "siteName" TEXT NOT NULL DEFAULT '',
    "siteDescription" TEXT NOT NULL DEFAULT '',
    "workspaceLabel" TEXT NOT NULL DEFAULT '',
    "adminWorkspaceLabel" TEXT NOT NULL DEFAULT '',
    "themeColor" TEXT NOT NULL DEFAULT '#0066DD',
    "navLabelsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "runninghubBaseUrl" TEXT NOT NULL DEFAULT '',
    "runninghubDefaultWebappId" TEXT NOT NULL DEFAULT '',
    "runninghubChannelsJson" JSONB,
    "feishuBaseUrl" TEXT NOT NULL DEFAULT '',
    "taskMaxConcurrency" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppBanner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "bgFrom" TEXT NOT NULL DEFAULT '#EFF6FF',
    "bgTo" TEXT NOT NULL DEFAULT '#EDE9FE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "materialType" "MaterialType" NOT NULL,
    "status" "MaterialStatus" NOT NULL DEFAULT 'UPLOADING',
    "sourceFilename" TEXT NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "previewReady" BOOLEAN NOT NULL DEFAULT false,
    "exclusiveOwnerId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "batchNo" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialVariant" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "kind" "VariantKind" NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialTagLink" (
    "materialId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "MaterialTagLink_pkey" PRIMARY KEY ("materialId","tagId")
);

-- CreateTable
CREATE TABLE "MaterialClaim" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'ACTIVE',
    "claimRequestId" TEXT,
    "signedUrlIssuedAt" TIMESTAMP(3),
    "signedUrlExpireAt" TIMESTAMP(3),
    "resetById" TEXT,
    "resetReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPublishLink" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialPublishLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDailyQuota" (
    "userId" TEXT NOT NULL,
    "quotaDate" TIMESTAMP(3) NOT NULL,
    "limitSnapshot" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDailyQuota_pkey" PRIMARY KEY ("userId","quotaDate")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "materialId" TEXT,
    "claimId" TEXT,
    "action" "AuditAction" NOT NULL,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "App_code_key" ON "App"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AppTag_name_key" ON "AppTag"("name");

-- CreateIndex
CREATE INDEX "AppTagLink_tagId_idx" ON "AppTagLink"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_siteTaskNo_key" ON "Task"("siteTaskNo");

-- CreateIndex
CREATE UNIQUE INDEX "Task_taskNo_key" ON "Task"("taskNo");

-- CreateIndex
CREATE INDEX "Task_status_createdById_idx" ON "Task"("status", "createdById");

-- CreateIndex
CREATE INDEX "Task_syncStatus_idx" ON "Task"("syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTag_name_key" ON "PromptTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplateCategory_name_key" ON "PromptTemplateCategory"("name");

-- CreateIndex
CREATE INDEX "PromptTemplate_enabled_usageCount_idx" ON "PromptTemplate"("enabled", "usageCount");

-- CreateIndex
CREATE INDEX "PromptTemplate_scopeMode_idx" ON "PromptTemplate"("scopeMode");

-- CreateIndex
CREATE INDEX "PromptTemplate_categoryId_idx" ON "PromptTemplate"("categoryId");

-- CreateIndex
CREATE INDEX "PromptTemplateAppScope_appCode_idx" ON "PromptTemplateAppScope"("appCode");

-- CreateIndex
CREATE INDEX "PromptTemplateFavorite_templateId_idx" ON "PromptTemplateFavorite"("templateId");

-- CreateIndex
CREATE INDEX "PromptTemplateRecentUse_lastUsedAt_idx" ON "PromptTemplateRecentUse"("lastUsedAt");

-- CreateIndex
CREATE INDEX "PromptTemplateRecentUse_templateId_idx" ON "PromptTemplateRecentUse"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "AppCategory_name_key" ON "AppCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Material_checksumSha256_key" ON "Material"("checksumSha256");

-- CreateIndex
CREATE INDEX "Material_status_materialType_createdAt_idx" ON "Material"("status", "materialType", "createdAt");

-- CreateIndex
CREATE INDEX "Material_exclusiveOwnerId_idx" ON "Material"("exclusiveOwnerId");

-- CreateIndex
CREATE INDEX "MaterialVariant_materialId_kind_idx" ON "MaterialVariant"("materialId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialTag_name_key" ON "MaterialTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialClaim_claimRequestId_key" ON "MaterialClaim"("claimRequestId");

-- CreateIndex
CREATE INDEX "MaterialClaim_materialId_status_idx" ON "MaterialClaim"("materialId", "status");

-- CreateIndex
CREATE INDEX "MaterialClaim_userId_createdAt_idx" ON "MaterialClaim"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MaterialPublishLink_claimId_createdAt_idx" ON "MaterialPublishLink"("claimId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "AppTagLink" ADD CONSTRAINT "AppTagLink_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppTagLink" ADD CONSTRAINT "AppTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "AppTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAsset" ADD CONSTRAINT "TaskAsset_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PromptTemplateCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplateAppScope" ADD CONSTRAINT "PromptTemplateAppScope_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplateAppScope" ADD CONSTRAINT "PromptTemplateAppScope_appCode_fkey" FOREIGN KEY ("appCode") REFERENCES "App"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplateFavorite" ADD CONSTRAINT "PromptTemplateFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplateFavorite" ADD CONSTRAINT "PromptTemplateFavorite_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplateRecentUse" ADD CONSTRAINT "PromptTemplateRecentUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptTemplateRecentUse" ADD CONSTRAINT "PromptTemplateRecentUse_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PromptTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_exclusiveOwnerId_fkey" FOREIGN KEY ("exclusiveOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialVariant" ADD CONSTRAINT "MaterialVariant_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTagLink" ADD CONSTRAINT "MaterialTagLink_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialTagLink" ADD CONSTRAINT "MaterialTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "MaterialTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialClaim" ADD CONSTRAINT "MaterialClaim_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialClaim" ADD CONSTRAINT "MaterialClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialClaim" ADD CONSTRAINT "MaterialClaim_resetById_fkey" FOREIGN KEY ("resetById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPublishLink" ADD CONSTRAINT "MaterialPublishLink_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "MaterialClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyQuota" ADD CONSTRAINT "UserDailyQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "MaterialClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
