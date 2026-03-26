export type UserRole = "USER" | "ADMIN";
export type TaskStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
export type SyncStatus = "PENDING" | "SUCCESS" | "FAILED";
export type AssetKind = "INPUT" | "OUTPUT";
export type MaterialType = "VIDEO" | "IMAGE";
export type MaterialStatus =
  | "UPLOADING"
  | "PROCESSING"
  | "AVAILABLE"
  | "CLAIMED"
  | "OFF_SHELF"
  | "ARCHIVED";
export type VariantKind = "ORIGINAL" | "PREVIEW_WATERMARK" | "POSTER" | "THUMBNAIL";
export type ClaimStatus = "ACTIVE" | "RESET_BY_ADMIN" | "DELIVERY_FAILED";
export type AuditAction = "UPLOAD" | "COMPLETE" | "CLAIM" | "RESET" | "OFF_SHELF" | "QUOTA_CHANGE";
export type PromptTemplateScopeMode = "GLOBAL" | "LIMITED";
export type PromptTemplateMediaType = "IMAGE" | "VIDEO";
export type ChannelCredentialMode = "DIRECT" | "ENV";

export type InputFieldType = "image" | "textarea" | "select";

export interface RunningHubChannelConfig {
  code: string;
  name: string;
  credentialMode: ChannelCredentialMode;
  apiKey: string;
  concurrencyLimit: number;
  priority: number;
  enabled: boolean;
}

export interface InputFieldOption {
  label: string;
  value: string;
}

export interface AppInputField {
  key: string;
  label: string;
  type: InputFieldType;
  required?: boolean;
  description?: string;
  maxItems?: number;
  options?: InputFieldOption[];
  hidden?: boolean;
}

export interface TaskInputSchemaField {
  key: string;
  label: string;
  type: InputFieldType;
  hidden?: boolean;
}

export interface AppNodeDefinition {
  key: string;
  label: string;
  type: InputFieldType;
  nodeId: string;
  fieldName: string;
  defaultValue: string;
  description: string;
  required: boolean;
  options: InputFieldOption[];
  hidden?: boolean;
}

export interface AppTagRecord {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface BulkOperationItem {
  id: string;
  status: "success" | "skipped" | "failed";
  message: string;
}

export interface BulkOperationSummary {
  totalCount: number;
  successCount: number;
  skippedCount: number;
  failureCount: number;
}

export interface BulkOperationResult {
  results: BulkOperationItem[];
  summary: BulkOperationSummary;
}

export type AppBulkAction =
  | { type: "setEnabled"; enabled: boolean }
  | { type: "setCategory"; category: string | null }
  | { type: "setTags"; tags: string[] }
  | { type: "setShareResults"; shareResults: boolean }
  | { type: "setSortOrder"; startSortOrder: number }
  | { type: "delete" };

export interface AppDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  provider: string;
  providerAppId: string;
  enabled: boolean;
  shareResults: boolean;
  statusLabel: string;
  outputType: string;
  syncTarget: string;
  category: string;
  formSchemaJson: AppInputField[];
  requestMappingJson: Record<string, string>;
  defaultParamsJson: Record<string, string>;
  syncMappingJson: Record<string, string>;
  runninghubAllowedChannelCodesJson?: string[] | null;
  nodes?: AppNodeDefinition[];
  tags: string[];
  showcaseImages: string[];
  /** @deprecated kept for compatibility, no longer used by frontend/editor */
  iconUrl?: string | null;
  /** @deprecated kept for compatibility, no longer used by frontend/editor */
  iconBgColor?: string | null;
  coverPoster?: string | null;
  /** @deprecated kept for compatibility, no longer used by frontend/editor */
  authorName?: string | null;
  /** @deprecated kept for compatibility, no longer used by frontend/editor */
  authorAvatar?: string | null;
  /** @deprecated kept for compatibility, no longer used by frontend/editor */
  badgeLabel?: string | null;
  estimatedPriceFen: number;
  estimatedPriceLabel: string;
  sortOrder?: number;
  viewCount?: number;
}

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: string;
  dailyClaimLimit: number;
}

export type UserBulkAction =
  | { type: "setActive"; active: boolean }
  | { type: "setRole"; role: UserRole }
  | { type: "setDailyClaimLimit"; dailyClaimLimit: number }
  | { type: "delete" };

export type TaskBulkAction =
  | { type: "retrySync" }
  | { type: "delete" };

export interface TaskAssetRecord {
  id: string;
  kind: AssetKind;
  name: string;
  url: string;
  sourceSlot?: string;
}

export interface TaskRecord {
  id: string;
  siteTaskNo: string;
  taskNo: string;
  appCode: string;
  appName: string;
  title: string;
  ownerId: string;
  ownerName: string;
  isSharedResult?: boolean;
  status: TaskStatus;
  providerStatus: string;
  syncStatus?: SyncStatus;
  createdAt: string;
  createdAtIso: string;
  startedAt?: string;
  startedAtIso?: string;
  completedAt?: string;
  completedAtIso?: string;
  queuePosition?: number;
  providerTaskId?: string;
  runninghubChannelCode?: string;
  runninghubChannelName?: string;
  providerResultUrl?: string;
  providerErrorMessage?: string;
  syncErrorMessage?: string;
  prompt: string;
  estimatedPriceFenSnapshot?: number | null;
  estimatedPriceLabel?: string | null;
  params: Record<string, string>;
  resultSummary: string;
  resultItems: Array<{ id: string; label: string; url: string }>;
  inputAssets: TaskAssetRecord[];
  outputAssets: TaskAssetRecord[];
  systemLogs: string[];
  syncLogs: Array<{ time: string; message: string; status: SyncStatus }>;
  usage?: {
    consumeMoney: string | null;
    consumeCoins: string | null;
    taskCostTime: string;
    thirdPartyConsumeMoney: string | null;
  };
  appInputSchema?: TaskInputSchemaField[];
}

export type TaskSubmissionState = "RUNNING" | "QUEUED" | "FAILED";

export interface TaskSubmissionResult {
  taskId: string;
  taskNo: string;
  submissionState: TaskSubmissionState;
  message?: string | null;
  task?: TaskRecord | null;
}

export interface DashboardStat {
  label: string;
  value: string;
  trend: string;
}

export interface DashboardSummary {
  stats: DashboardStat[];
  recentTasks: TaskRecord[];
  alerts: string[];
}

export interface MaterialQuotaRecord {
  quotaDate: string;
  limitCount: number;
  usedCount: number;
  remainingCount: number;
}

export interface MaterialHallItem {
  id: string;
  title: string;
  description: string | null;
  materialType: MaterialType;
  status: MaterialStatus;
  previewReady: boolean;
  batchNo: string | null;
  tags: string[];
  sourceFilename: string;
  fileSizeBytes: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
  previewUrl: string | null;
  posterUrl: string | null;
  downloadUrl: string | null;
  statusLabel: string;
  materialTypeLabel: string;
}

export interface PublishLinkRecord {
  id: string;
  url: string;
  platform: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyClaimedMaterialRecord extends MaterialHallItem {
  claimId: string;
  claimStatus: ClaimStatus;
  claimStatusLabel: string;
  claimCreatedAt: string;
  signedUrlIssuedAt: string | null;
  signedUrlExpireAt: string | null;
  downloadUrl: string | null;
  resetReason: string | null;
  publishLinks: PublishLinkRecord[];
}

export interface AdminMaterialItem extends MaterialHallItem {
  exclusiveOwnerName: string | null;
  claimCount: number;
  activeClaimId: string | null;
  uploaderName: string | null;
}

export interface MaterialTagRecord {
  id: string;
  name: string;
  color: string | null;
}

export interface MaterialHallTagSummary {
  name: string;
  count: number;
}

export type AppTagBulkAction =
  | { type: "delete" };

export type BulkMaterialAction =
  | { type: "updateTags"; tags: string[] }
  | { type: "changeStatus"; status: "AVAILABLE" | "OFF_SHELF" }
  | { type: "delete" }
  | { type: "resetClaims"; reason?: string | null };

export interface BulkMaterialOperationItem {
  materialId: string;
  status: "success" | "skipped" | "failed";
  message: string;
}

export interface BulkMaterialOperationResult {
  items: BulkMaterialOperationItem[];
  summary: {
    totalCount: number;
    successCount: number;
    skippedCount: number;
    failureCount: number;
  };
}

export interface AdminMaterialClaimLogRecord {
  id: string;
  materialId: string;
  materialTitle: string;
  ownerId: string;
  username: string;
  displayName: string;
  status: ClaimStatus;
  createdAt: string;
  resetReason: string | null;
}

export interface PromptTemplateTagRecord {
  id: string;
  name: string;
  color: string;
}

export type PromptTagBulkAction =
  | { type: "delete" };

export interface PromptTemplateCategoryRecord {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  enabled: boolean;
}

export type PromptTemplateCategoryBulkAction =
  | { type: "setEnabled"; enabled: boolean }
  | { type: "delete" };

export interface PromptTemplateSafeRecord {
  id: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  sampleMediaType: PromptTemplateMediaType;
  sampleMediaUrl: string | null;
  samplePosterUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryOrder: number | null;
  tags: string[];
  usageCount: number;
  enabled: boolean;
  isFavorite: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface PromptTemplateAdminRecord extends PromptTemplateSafeRecord {
  appCode: string | null;
  scopeMode: PromptTemplateScopeMode;
  scopeAppCodes: string[];
  templatePrompt: string;
  updatedAt: string;
}

export interface PromptTemplateInputVariables {
  prompt?: string;
  style?: string;
  scene?: string;
  negative_prompt?: string;
  [key: string]: string | undefined;
}

export type PromptTemplateBulkAction =
  | { type: "setEnabled"; enabled: boolean }
  | { type: "setCategory"; categoryId: string | null }
  | { type: "setTags"; tags: string[] }
  | { type: "setScope"; scopeMode: PromptTemplateScopeMode; scopeAppCodes?: string[] }
  | { type: "delete" };

export interface AppCategoryRecord {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
  appCount: number;
}

export type AppCategoryBulkAction =
  | { type: "setEnabled"; enabled: boolean }
  | { type: "setSortOrder"; startSortOrder: number }
  | { type: "delete" };

export interface AppBannerRecord {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  bgFrom: string;
  bgTo: string;
  sortOrder: number;
  enabled: boolean;
}

export type AppBannerBulkAction =
  | { type: "setEnabled"; enabled: boolean }
  | { type: "setSortOrder"; startSortOrder: number }
  | { type: "delete" };
