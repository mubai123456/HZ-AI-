-- CreateTable
CREATE TABLE "AppTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2563EB',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AppTagLink" (
    "appId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "AppTagLink_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AppTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "AppTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
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
    "creditCost" INTEGER NOT NULL DEFAULT 1,
    "formSchemaJson" JSONB NOT NULL,
    "requestMappingJson" JSONB NOT NULL,
    "defaultParamsJson" JSONB NOT NULL,
    "syncMappingJson" JSONB NOT NULL,
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
    "creditCost",
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
    "creditCost",
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AppTag_name_key" ON "AppTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AppTagLink_appId_tagId_key" ON "AppTagLink"("appId", "tagId");

-- CreateIndex
CREATE INDEX "AppTagLink_tagId_idx" ON "AppTagLink"("tagId");
