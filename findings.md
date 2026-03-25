# 发现与研究

## 技术架构发现

### 1. 数据流架构
- **Prisma** 作为 ORM 层，SQLite 数据库
- **Server Components** 调用 `lib/db/*` 获取数据
- **Client Components** (ResultsPanel, RecentResultsPanel) 通过 props 接收数据
- **SSE** 基础设施存在但未被 RecentResultsPanel 使用

### 2. 任务状态机
```
QUEUED → RUNNING → SUCCEEDED/FAILED
         ↓ (超时30分钟)
       FAILED
```

### 3. 飞书同步机制
- `syncTaskToFeishu()` 在每次任务状态变化时调用
- 成功/失败都写入 `SyncLog` 表
- 使用 `feishuRecordId` 区分 create vs update

### 4. 前端组件结构
- `AppWorkbenchClient` → `WorkbenchLayout` + `LeftPanel` + `ResultsPanelClient` + `RecentResultsPanel`
- `ResultsPanelClient` 处理 Lightbox 状态
- `RecentResultsPanel` 显示任务历史列表

## 遇到的问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| button 嵌套 hydration 错误 | RecentResultsPanel 卡片是 button，内含复制 button | 改为 div role="button" |
| 任务号显示为"任务号" | syncMapping 中字段名不一致 | 统一改为"任务ID" |
| 参考图显示为链接 | inputAssets 未被正确渲染 | 添加缩略图显示逻辑 |
| 耗时显示 13秒 | 时钟差异 + Date.now() vs 服务器时间 | 添加"刚提交"判断 |

## API 端点清单

| 端点 | 用途 | 状态 |
|------|------|------|
| `/api/internal/tasks/submit` | 提交新任务 | ✅ 真实 |
| `/api/internal/tasks/poll` | 轮询所有运行中任务 | ✅ 真实 |
| `/api/internal/tasks/[id]/poll` | 单任务轮询 | ✅ 真实 |
| `/api/internal/sync/retry` | 重试同步 | ❌ mock |
| `/api/internal/upload` | 上传文件 | ✅ 真实 |
| `/api/webhook` | RunningHub 回调 | ✅ 真实 |
| `/api/cron/pump` | 定时任务泵 | ✅ 存在 |

## 环境变量清单

| 变量 | 用途 |
|------|------|
| `RUNNINGHUB_BASE_URL` | RunningHub API 地址 |
| `RUNNINGHUB_API_KEY` | RunningHub API 密钥 |
| `RUNNINGHUB_WEBAPP_ID` | RunningHub 应用 ID |
| `FEISHU_APP_ID` | 飞书应用 ID |
| `FEISHU_APP_SECRET` | 飞书应用密钥 |
| `FEISHU_BASE_URL` | 飞书 API 地址 |
| `APP_URL` | 本应用 URL（用于 webhook） |
