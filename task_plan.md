# Phase 2 开发计划

## 目标
完成 RunningHub 真实接入 + 飞书同步，让所有页面数据从 Prisma 数据库读取。

## Phase 2 完成情况

| 任务 | 状态 | 说明 |
|------|------|------|
| 数据层 Prisma 接入 (Dashboard) | ✅ 完成 | getDashboardSummary, getEnabledApps 已切换 |
| 数据层 Prisma 接入 (Tasks) | ✅ 完成 | tasks/page.tsx 直接使用 Prisma |
| 数据层 Prisma 接入 (Assets) | ✅ 完成 | getAssetGallery 已切换 |
| 数据层 Prisma 接入 (Sync) | ✅ 完成 | getSyncOverview 已切换 |
| 同步重试路由 mock → 真实 | ✅ 完成 | 已实现真实逻辑（含60秒限流） |
| Admin 页面数据真实化 | ✅ 完成 | 从数据库计算真实数据 |
| SyncLog 记录写入 | ✅ 完成 | syncTaskToFeishu 已写入 SyncLog |
| 任务超时机制 | ✅ 完成 | 30 分钟超时判定 |
| UI: 任务历史卡片 | ✅ 完成 | RecentResultsPanel 重构 |
| UI: 耗时格式中文 | ✅ 完成 | formatDuration 返回 "1分30秒" |
| UI: 参考图缩略图 | ✅ 完成 | inputAssets 显示缩略图 |
| UI: 复制任务ID | ✅ 完成 | clipboard API |
| 修复 hydration 错误 | ✅ 完成 | button 嵌套问题已修复 |

---

## 额外完成的任务

### SSE 实时更新
- **新建**: `src/components/use-app-tasks.ts` - SSE 实时更新 hook
- **新建**: `src/app/api/internal/sse/all/route.ts` - 全局 SSE 端点
- **修改**: `src/lib/sse.ts` - 添加 `subscribeToAll` 和 `createGlobalSSEStream`
- **修改**: `src/app/api/internal/tasks/route.ts` - 支持 appCode 过滤和返回完整 TaskRecord

### 清理工作
- **删除**: `src/lib/mock-data.test.ts` - 过时的 mock 测试
- **修改**: `src/app/(workspace)/apps/[code]/page.tsx` - 移除过时的 mock-data 注释

---

## Phase 2 完成情况（最终）

| 任务 | 状态 |
|------|------|
| 数据层 Prisma 接入（所有页面） | ✅ 完成 |
| 同步重试路由 | ✅ 完成 |
| Admin 页面数据真实化 | ✅ 完成 |
| UI 优化（任务历史卡片、耗时格式、参考图缩略图、复制任务ID） | ✅ 完成 |
| 修复 hydration 错误 | ✅ 完成 |
| SSE 实时更新 | ✅ 完成 |
| 清理过时代码 | ✅ 完成 |

---

## 验证状态

- ✅ `npm run build` 通过
- ✅ `npm test` 通过（4 tests, 2 files）

---

## 验证步骤

1. **构建验证**: `npm run build` — 无 TypeScript 错误
2. **测试验证**: `npm test` — 全部通过
3. **手动验证**:
   - 提交任务后访问 /sync，确认同步记录正确
   - 点击重试按钮，确认飞书记录更新
   - 访问 /admin，确认数据来自数据库
   - 访问 /assets，确认资产图片正确显示
