## 2026-03-25 Vercel 登录热修复

- 已修复默认演示账号在 Vercel / 线上库中因账号缺失或密码哈希漂移导致无法登录的问题。
- 当前默认账号 `admin`、`ops.a`、`design.c` 会在用户输入正确默认密码时由后端自动补齐或修复密码哈希，避免“登录页提示可用，但线上数据库未初始化”的错位。
- 登录页已移除公开展示账号密码的提示卡片，默认改为管理员线下分发账号信息。
- 本轮已完成定向验证：
  - `npm run test -- src/lib/auth.test.ts`

## 2026-03-25 1.13 Supabase / Postgres 升级基线

- 当前主开发分支：`codex/supabase-upgrade-from-1-13`
- 当前目标：
  - 以 `1.13` 可运行版本为稳定基线
  - 将数据库切换到 `Postgres / Supabase`
  - 将持久文件存储切换到 `七牛 Kodo（S3 兼容）`
  - 收口 `Vercel` 预发与正式部署链路
- 本轮已完成的第一批生产化底座：
  - Prisma 运行时已改为 `@prisma/adapter-pg`
  - 本地开发、测试、迁移统一改为 `Postgres` 连接约定：`DATABASE_URL / DIRECT_URL / TEST_DATABASE_URL`
  - 新增对象存储抽象层 `src/lib/object-storage.ts`
  - 素材上传、视频文件与任务输入图已开始接入统一对象存储
  - RunningHub 结果图已切换为一期策略：
    - 默认只保存 `providerResultUrl`
    - 预留 `TASK_OUTPUT_STORAGE_MODE=object_storage` 后续切回自有持久化
  - 新增 Postgres 基线迁移目录：`prisma/postgres-migrations/`
  - 新增 SQLite -> Postgres 迁移脚本：`scripts/migrate-sqlite-to-postgres.mjs`
  - 新增测试库重建脚本：`scripts/prepare-test-db.mjs`
  - 新增管理员安全初始化脚本：`prisma/bootstrap-admin.mjs`
  - Vercel 部署脚本已升级为：
    - 本地测试预检
    - 本地构建预检
    - `prisma migrate deploy`
    - `bootstrap:admin`
    - 必需的 Postgres / S3 环境校验
- 当前验证状态：
  - `npm test` 通过，`45` 个测试文件、`155` 条测试通过
  - `npm run build` 通过
  - 仍有 1 条既有的 Turbopack NFT tracing warning，当前不阻塞构建

## 本轮主要命令

```bash
npm run test:db:reset
npm test
npm run prisma:migrate:deploy
npm run build
```

## 下一步建议

- 先准备七牛 Kodo 正式 bucket、自定义 HTTPS 域名和新的密钥
- 再用真实 Supabase 连接串跑一遍 `scripts/migrate-sqlite-to-postgres.mjs`
- 然后准备一套真实的 `.env.vercel`，验证 `deploy-vercel.mjs` 的 dry-run 与 preview 部署
- 最后把仍然走本地路径兜底的下载/预览链路再做一轮浏览器回归
- 具体拿值和填写步骤见：
  - `docs/SUPABASE-R2-VERCEL-RUNBOOK.md`
  - `.env.vercel.example`
  - `.env.vercel.production.example`

## 2026-03-25 当前恢复状态

- 当前工作区已切到 `1.11`：
  - 分支：`codex/restore-1-11-case-results`
  - 提交：`0912160`
  - 时间：`2026-03-24 23:39:14`
- 恢复前快照位于：
  - `restore-snapshots/20260325-025706-before-restore-1.11/`
- 本次额外完成的定制改动：
  - 单应用页 `/apps/[code]` 中间主区已收成统一“结果区”，内部通过“结果 / 案例”双标签切换
  - 独立任务页 `/tasks/[id]` 仍保持原来的详情/排查视图
- 本次额外完成的稳定性修复：
  - 新增 `.env.local`，让 `1.11` 的本地 `next dev` 固定读取 `ai-workbench/dev.db`
  - `getCurrentSession` 已改为回库校验用户存在性，避免旧版本残留 cookie 在提交任务时触发外键错误
  - RunningHub 失败任务现在会优先保存 `failedReason.exception_message`，例如显存不足告警，不再只显示泛化失败文案
  - 已恢复最新两条任务 `WB-000008 / WB-000009`，当前都是真实 `FAILED` 状态
- 已完成验证：
  - `npm test -- src/components/results-panel.test.tsx src/components/app-showcase-gallery.test.tsx`
  - `npm test -- src/lib/session.test.ts`
  - `npm test -- src/lib/runninghub.test.ts`
  - `DATABASE_URL=file:./dev.db npm run build`
  - `DATABASE_URL=file:./dev.db npm run start -- --hostname 127.0.0.1 --port 3102`
  - Playwright 已实测登录页、任务中心、应用页、单应用页与任务详情页

## 2026-03-24 乱码修复、任务预览与提交区强化

- 本轮已完成用户可见高频页面乱码修复，重点覆盖：
  - 单应用提交区
  - 应用编辑器
  - 菜单与按钮主交互文案
- 单应用提交区已强化：
  - `预计费用` 改为放入底部 `提交任务` 卡片
  - 金额放在提交动作下方单独展示，视觉权重明显提升
  - `提示词模板 / 清空模板 / 清空草稿 / 提交任务 / 上传中...` 等关键文案已恢复正常中文
- 任务中心列表已新增结果预览：
  - 表格新增 `结果预览` 列
  - 点击缩略图可直接打开 lightbox 放大查看
  - 点击站内编号或应用名可进入任务详情页
- 全局样式已收紧链接颜色覆盖：
  - `a` 默认改为继承颜色
  - 左侧导航激活态显式锁定白字
  - 蓝底按钮和导航项不再被全局链接色污染

## 本轮验证

- `npx vitest run src/components/submit-form.test.tsx src/components/admin-tasks-client.test.tsx src/components/results-panel.test.tsx src/components/task-output-download-actions.test.tsx`
- `npx eslint "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/components/admin-tasks-client.tsx" "src/components/workbench-shell.tsx" "src/components/app-form-editor.tsx" "src/components/submit-form.test.tsx" "src/components/admin-tasks-client.test.tsx"`
- `rg -n "鎻|鍩|鍚|鏇|娓|鍓|椤|鍙栨秷|淇濆瓨|鏍囩|搴旂敤|涓嬫媺" src --glob '!**/*.test.*'`
- `bun run build`

## 下一步建议

- 用真实浏览器再回归一次左侧导航激活态、单应用提交卡和任务中心缩略图预览
- 如继续清理用户体验，可统一补一层 toast，把“保存成功 / 提交成功 / 下载失败”做成一致反馈

## 2026-03-24 提交区最终收口

- 单应用页左侧提交区已进一步收口为“顶部小清空 + 底部唯一主按钮”结构。
- `清空` 已移到 `参考图输入` 标题右侧，复用原有清空草稿逻辑。
- 底部不再显示独立费用卡、说明列或双按钮并列，只保留一个双行主按钮：
  - 第一行：`提交任务`
  - 第二行：`预计￥XX元`
- 当前方案不新增后台按钮文案配置，继续沿用每个应用已有的预计费用设置。

## 2026-03-24 费用体系与后台直改总览

- 本轮已完成“去积分化”改造：运行时不再使用 `credits`、`creditCost` 或 `CreditLog`。
- 应用费用统一改为人民币预计费用：
  - 应用模型使用 `estimatedPriceFen`
  - 任务模型使用 `estimatedPriceFenSnapshot`
  - 前端统一展示 `预计费用 ¥x.xx`
- 应用创建、编辑、应用列表、任务提交前、任务详情页都已接通预计费用展示或维护。
- 后台第一批高频列表已支持“列表内直接编辑 + 列表排序”：
  - 应用
  - 分类
  - Banner
  - 提示词模板
  - 用户
- 个人中心与后台用户页的积分相关展示、入口与接口已移除。

## 本轮验证

- `bunx prisma db push --accept-data-loss`
- `npx vitest run src/lib/db/apps.test.ts src/app/api/internal/admin/apps/[code]/route.test.ts src/app/api/internal/admin/apps/bulk/route.test.ts src/components/app-form-editor.test.tsx src/components/submit-form.test.tsx src/components/admin-apps-client.test.tsx`
- `npx eslint "src/lib/money.ts" "src/lib/db/apps.ts" "src/lib/db/apps.test.ts" "src/lib/db/admin.ts" "src/lib/db/users.ts" "src/lib/db/tasks.ts" "src/lib/auth.ts" "src/lib/task-queue.ts" "src/lib/types.ts" "src/app/(workspace)/admin/users/page.tsx" "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/app/(workspace)/tasks/[id]/page.tsx" "src/app/(workspace)/profile/page.tsx" "src/app/(workspace)/profile/client.tsx" "src/app/api/internal/admin/apps/route.ts" "src/app/api/internal/admin/apps/[code]/route.ts" "src/app/api/internal/admin/apps/[code]/route.test.ts" "src/components/admin-apps-client.test.tsx" "src/components/app-form-editor.tsx" "src/components/app-form-editor.test.tsx" "src/components/submit-form.test.tsx"`
- `bun run build`

## 下一步建议

- 用真实浏览器回归五个后台高频列表的直改体验
- 如需继续打磨，可为列表直改统一补一层 toast 与保存中状态

## 2026-03-23 19:58 参考图标签回调

- 参考图三列槽位恢复显示“主参考图 / 辅助图”标识，但不再把文字压到图片内部。
- 标签改为放在每个槽位下方；主参考图使用更显眼的蓝色胶囊样式，辅助图保持灰色弱化样式。
- 清空按钮和覆盖式提示文案继续移除，已上传图片仍支持整块点击后直接替换。

## 2026-03-23 19:54 参考图上传槽位进一步收口

- 单应用页左侧参考图输入现已去掉槽位内的可见文字、渐变遮罩和右上角清空按钮，避免三列缩略图在窄栏里出现排版打架。
- 已上传图片仍然保持整块可点击，用户可以直接点已有图片重新选择文件完成替换，不需要先清空再上传。
- 空态槽位只保留上传图标与轻量边框差异；主参考图仍通过样式轻强调，但不再额外占用文案空间。

## 2026-03-23 18:31 单应用模板瘦身与全站任务侧栏改造

- `/apps/[code]` 现已固定为「顶栏返回应用列表 + 应用名 / 左侧输入工作台 / 中间结果工作区 / 右侧全站任务流」结构。
- 页面内原本重复的 `Workbench` 头卡和左侧 `Workspace` 说明卡已移除，单应用页的信息层级收敛到全局顶栏和三栏主体。
- 右侧任务栏改为展示“当前登录用户的全站任务”，默认按创建时间倒序，支持跨应用查看结果；但“一键同款”只允许复用当前应用的任务输入，避免把不兼容参数写回表单。
- `Task` 新增站内任务编号 `siteTaskNo`，格式固定为 `WB-000001` 这类全站递增编号；历史任务已提供回填迁移，前端现同时展示站内编号和第三方任务 ID。
- 当前用户查看自己的任务时可展开第三方任务 ID；普通用户仍不能看到其他人的任务数据。
- 本轮同步调整了 `WorkbenchShell / WorkbenchLayout / SubmitForm / RecentResultsPanel / ResultsPanel / task-queue / db tasks mapping` 等关键链路，确保 SSE 刷新、选中任务切换和同款回填保持一致。

## 本轮验证补充

- `npx vitest run src/components/use-app-tasks.test.tsx src/components/results-panel.test.tsx src/components/recent-results-panel.test.tsx src/components/submit-form.test.tsx src/lib/db/tasks.test.ts src/lib/db/users.test.ts src/lib/feishu-sync-jobs.test.ts`
- `npx eslint "src/components/app-workbench-client.tsx" "src/components/recent-results-panel.tsx" "src/components/results-panel.tsx" "src/components/results-panel-client.tsx" "src/components/workbench-layout.tsx" "src/components/workbench-header-slot.tsx" "src/components/workbench-shell.tsx" "src/components/shell-wrapper.tsx" "src/components/three-column-layout.tsx" "src/lib/db/tasks.ts" "src/lib/site-task-no.ts" "src/lib/task-queue.ts" "src/app/(workspace)/apps/[code]/page.tsx" "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/components/submit-form.test.tsx" "src/components/left-panel.tsx"`
- `bun run build`

# 内部 AI 应用工作台

内部使用的 AI 应用管理与运营平台，基于 `Next.js 16 + React 19 + Prisma + SQLite + Bun` 构建。项目覆盖应用中心、任务中心、素材大厅、我的素材、后台素材管理、提示词模板、分类管理、飞书同步等核心链路。

## 当前重点

- 应用中心支持应用浏览、详情查看、任务提交与结果查看。
- 任务中心支持任务历史、状态追踪与结果入口。
- 素材后台已升级为“列表为主 + 上传弹窗 + 批量处理”的运营工作流。
- 素材大厅已升级为“卡片即播放器”的浏览页，卡片内直接看片，完整预览退为次级确认动作。

## 素材后台工作流

### 上传

- 入口位于 `/admin/materials`。
- 上传改为单弹窗完成：批量选文件、统一填写标签/描述/批次号、查看上传队列。
- 上传弹窗已重排为桌面端横向工作台：左侧处理上传设置，右侧处理标签库，下方用横向表格承接上传队列。
- 前端按文件逐个提交，服务端逐条返回结果，避免大 `FormData` 一次解析导致整批失败。

### 标签管理

- 支持视频标签增删改查。
- 上传弹窗中的标签管理已切到横向列表，不再使用竖向堆叠卡片。
- 标签重命名后会同步影响历史素材展示与筛选结果。
- 删除标签只解除标签及关联，不删除素材本身。

### 列表批量处理

- 支持多选、全选和批量工具栏。
- 当前支持：
  - 批量改标签
  - 批量上架
  - 批量下架
  - 批量删除
  - 批量重置回公海

## 素材大厅工作流

### 设计目标

- 列表页就是主看片页：用户进入后先看真实视频内容，再决定是否领取。
- inline 小视频必须完整画面可见，不允许为了铺满卡片而裁切主体内容。
- 大厅声音开关按整页统一建模：默认静音，用户手动打开后，全大厅后续卡片遵循同一声音状态，再次点击可统一恢复静音。

### 浏览规则

- 支持 `q` 搜索与 `tag` 标签筛选，URL 状态可刷新、可分享。
- 只展示当前可领取的视频素材。
- 卡片默认只展示：
  - 标题
  - 标签
  - 时长
  - 上传日期

### 预览规则

- 桌面端卡片悬停播放，手机端按主视区自动播放，但都默认静音。
- 完整预览仍保留，用于需要看大画面的确认场景。
- 用户先在列表里看真实视频，再决定领取并下载。

## 目录说明

- `src/app/(workspace)`：工作台页面与后台页面
- `src/app/api`：内部接口、上传接口、批量处理、标签管理
- `src/components`：工作台 UI、后台管理组件、素材大厅组件
- `src/lib`：Prisma、会话、队列、素材数据层、业务类型
- `prisma`：数据库 schema、迁移与 seed

## 常用命令

```bash
bun install
bun run dev
bun run build
bun test
npx vitest run
```

## Vercel 一键部署（第二版）

项目里已经新增了半自动部署脚本，入口如下：

- `npm run deploy:vercel:preview`
- `npm run deploy:vercel:production`
- `node scripts/deploy-vercel.mjs --help`

相关文件：

- `scripts/deploy-vercel.mjs`
- `src/lib/vercel-deploy.mjs`
- `.env.vercel.example`

### 当前支持范围

- 当前仓库还是 `SQLite` 版本。
- 因此脚本支持 `preview/demo` 形式的 Vercel 部署。
- 如果你仍然使用 `DATABASE_URL=file:...`，脚本会阻止 `production` 部署，避免把不适合正式环境的版本硬推上去。

### 快速使用

1. 复制模板：

```bash
Copy-Item .env.vercel.example .env.vercel
```

2. 按下面“参数获取方式”把 `.env.vercel` 填完整。

3. 先做一次预检查：

```bash
node scripts/deploy-vercel.mjs --target preview --env-file .env.vercel --dry-run
```

4. 预览部署：

```bash
npm run deploy:vercel:preview
```

5. 如果后续切到 `Postgres + 对象存储`，再准备 `.env.vercel.production`，然后执行：

```bash
npm run deploy:vercel:production
```

### 参数获取方式

#### Vercel 平台参数

- `VERCEL_TOKEN`
  - 打开 Vercel 控制台
  - 进入 `Settings -> Tokens`
  - 创建一个新的 Personal Token

- `VERCEL_ORG_ID`
  - 如果是个人账号，可先在本机跑一次 `vercel link`
  - 然后查看项目根目录下的 `.vercel/project.json`
  - 其中的 `orgId` 就是这个值

- `VERCEL_PROJECT_ID`
  - 同样来自 `.vercel/project.json` 中的 `projectId`
  - 或在 Vercel 项目设置页中查看

- `VERCEL_SCOPE`
  - 可选
  - 只有你把项目部署到团队空间时才需要
  - 一般填写团队 slug

#### 站点自身参数

- `APP_NAME`
  - 你自己定义的网站显示名称

- `APP_ENV`
  - 预览环境建议填 `staging`
  - 正式环境必须填 `production`

- `APP_URL`
  - 预览环境可填 Vercel 预览域名
  - 正式环境填正式域名，例如 `https://your-domain.com`

- `JWT_SECRET`
  - 用密码管理器生成一段高强度随机字符串
  - 也可以本地执行：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 数据库参数

- `DATABASE_URL`
  - 当前仓库做预览部署时，可以继续用 `file:./dev.db`
  - 但这只适合演示，不适合正式生产
  - 正式环境必须换成真实 `Postgres` 连接串

#### RunningHub 参数

- `RUNNINGHUB_BASE_URL`
  - 通常保持平台地址

- `RUNNINGHUB_API_KEY`
  - 去 RunningHub 的开发者/开放平台后台获取

- `RUNNINGHUB_WEBAPP_ID`
  - 去 RunningHub 目标应用配置页获取

- `RUNNINGHUB_WEBHOOK_SECRET`
  - 只在正式环境需要
  - 你在 RunningHub webhook 配置页设置的签名密钥，要与这里一致

#### 飞书参数

- `FEISHU_BASE_URL`
  - 一般用默认开放平台地址

- `FEISHU_APP_ID`
  - 飞书开放平台应用详情页获取

- `FEISHU_APP_SECRET`
  - 飞书开放平台应用凭证页获取

- `FEISHU_APP_TOKEN`
  - 如果你在用多维表格/应用数据同步，从飞书对应应用或数据表配置里获取

- `FEISHU_TABLE_ID`
  - 飞书多维表格里对应数据表的 table id

#### 业务配置参数

- `TASK_MAX_CONCURRENCY`
  - 站点内部并发控制
  - 当前建议先填 `5`

### 常见用法

查看帮助：

```bash
node scripts/deploy-vercel.mjs --help
```

只做校验，不真正部署：

```bash
node scripts/deploy-vercel.mjs --target preview --env-file .env.vercel --dry-run
```

跳过本地 build：

```bash
node scripts/deploy-vercel.mjs --target preview --env-file .env.vercel --skip-build
```

跳过环境变量同步：

```bash
node scripts/deploy-vercel.mjs --target preview --env-file .env.vercel --skip-env-sync
```

### 部署前提醒

- 当前仓库这套脚本已经可以帮你完成 `preview` 部署。
- 但如果你要正式上 `Vercel production`，必须先把数据库切到 `Postgres`。
- 脚本现在会主动拦截 `SQLite + production` 组合，这是故意的安全护栏，不是报错。

## 最近进度

截至 `2026-03-23 11:14:12`，本轮已完成：

- 修复素材后台批量上传“上传请求格式不正确”的主链路问题。
- 补齐素材标签 CRUD 与素材批量操作能力。
- 将后台素材管理重构为“列表为主 + 上传弹窗”的运营工作流。
- 将素材大厅重构为移动优先浏览页，补齐搜索、标签 chips、桌面高密度网格与移动端全屏预览体验。
- 补充素材标签聚合查询与素材大厅交互测试。
- 补回缺失的 `admin-users-client`，恢复 `/admin/users` 页面可构建状态。
- 修复素材预览文件缺失时的路径解析问题，将错误从服务端 `500` 收敛为正常 `404`。

## 本轮验证

- `npx vitest run src/lib/db/materials.test.ts src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx src/app/api/internal/admin/material-tags/[id]/route.test.ts src/app/api/internal/admin/materials/bulk/route.test.ts src/app/api/internal/admin/materials/upload/complete/route.test.ts`
- `bun run build`

## 已知情况

- 仓库当前仍是脏工作区，存在与本轮无关的历史改动；本次只处理素材管理和素材大厅相关实现。
- 当前已完成接口、数据层、组件和构建验证；如果需要进一步确认运营体验，下一步建议补一轮真实浏览器回归。
- 浏览器级联调中发现本地开发环境还存在与本轮无关的运行时异常，影响完整真机回归结论，需要单独排查。

## 2026-03-23 后台列表重构进展

- 已补齐统一批量类型与返回结构：`results + summary`，并新增公共批量汇总工具。
- 已新增后台批量接口：
  - `/api/internal/admin/apps/bulk`
  - `/api/internal/admin/users/bulk`
  - `/api/internal/admin/prompt-templates/bulk`
  - `/api/internal/admin/categories/bulk`
  - `/api/internal/admin/banners/bulk`
  - `/api/internal/admin/app-tags/bulk`
  - `/api/internal/admin/prompt-tags/bulk`
  - `/api/internal/admin/prompt-template-categories/bulk`
- 已完成数据层批量方法：
  - `apps`
  - `users`
  - `prompt-templates`
  - `categories`
  - `banners`
  - `app-tags`
- 已抽出后台列表通用能力：
  - `src/components/use-list-selection.ts`
  - `src/components/admin-bulk-toolbar.tsx`
- 已落地到页面的列表：
  - `/admin/apps`
  - `/admin/users`
  - `/admin/categories`
  - `/admin/banners`
- 当前仍未完全收口的范围：
  - 提示词模板主列表的批量前端入口还未重新接上
  - 应用标签管理器仍停留在编辑器内的轻量版本
  - 提示词标签与模板分类管理器还未升级为统一批量管理器

## 2026-03-23 15:40 素材大厅与素材管理体验重构

- `素材大厅`
  - 卡片内直接嵌入小视频预览，列表页就是主看片页
  - 桌面端支持悬停播放，滚动主视区切换当前活跃卡片
  - 手机端维持单主卡自动静音播放，完整大预览退为次级动作
  - 顶部大额度卡降级为轻量 quota hint，不再占首屏
- `素材管理`
  - 页面重心改为“筛选栏 -> 列表 -> 选中后批量工具条”
  - 批量工具栏默认隐藏，仅在勾选素材后出现
  - 单条操作改为“查看”入口，右侧详情抽屉承接预览、编辑、上下架、删除
  - 列表优先展示缩略图、标题、标签、状态、领取状态和最近时间
- 额外修正
  - 修复 `MaterialHallClient` 中卡片 ref 类型与真实 `article` 标签不一致导致的构建报错
  - 修复 `ThreeColumnLayout` 未给 `WorkbenchLayout` 传 `selectedTask` 导致的构建报错

### 本轮验证

- `npx vitest run src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx`
- `bun run build`

## 2026-03-23 16:10 二次桌面化调整

- `素材大厅`
  - inline 小视频改为 `object-contain`，保证不同横竖比素材都以完整画面展示
  - “打开声音”升级为真正的双向切换按钮，可再次关闭声音
  - 声音状态继续按整个素材大厅统一生效，不再只是单卡状态
- `素材管理`
  - 素材列表与领取日志继续固定为横向表格管理，不回退为竖向卡片流
  - 顶部筛选区改成更明确的桌面端横向表单布局
- `批量上传管理`
  - 上传弹窗加宽并改成横向工作台
  - 左侧为上传设置，右侧为标签库
  - 标签管理改为横向表格，字段固定为标签名、是否用于本次上传、操作

### 本轮验证

- `npx vitest run src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx`
- `bun run build`

## 2026-03-23 16:25 素材大厅细节修正

- 手机端下滑浏览时，筛选素材区会自动收起，不再持续占据画面。
- 电脑端改为点击素材封面区域即可直接进入完整预览；点击遮罩空白处即可关闭预览层。
- 卡片内小视频改为首帧优先展示，inline preview 不再继续依赖 `poster` 盖住视频首帧。

## 2026-03-23 16:33 预览弹窗空白关闭规则

- 完整预览弹窗改为“除实际内容本体外，所有留白点击都关闭”。
- 桌面端现在支持：
  - 点击遮罩外圈关闭
  - 点击视频区域外的黑色留白关闭
  - 点击右侧信息栏中的空白区域关闭
- 视频本体、播放器控件、标题、标签、关闭按钮和领取按钮继续保留为内容区，不会误触关闭。

### 本轮验证

- `npx vitest run src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx`
- `bun run build`

## 本轮验证

- `bun run build`
- `bun test`
  - 结果：失败
  - 主要原因：仓库现有测试基建与 Bun/Prisma 兼容问题，包含 `better-sqlite3`、`vi.stubGlobal`、`vi.hoisted`、缺失 DOM 环境等，非本轮列表重构独有问题

## 网站治理与分层重构计划

为避免站点继续在导航、页面模板、配置方式和后台交互上自由生长，项目已完成 `Phase 0` 文档立项与 `Phase 1` 结构设计，并开始进入“网站治理与分层重构计划”的 `Phase 2` 实施阶段。

- 文档入口：`docs/governance/README.md`
- 当前范围：已开始统一壳层导航、共享页面模板和第一批高优页面骨架
- 当前目标：先完成壳层、导航、标题体系和模板骨架收敛，再继续推进剩余高频页
- 当前约束：仓库仍是脏工作区，后续实施不得覆盖无关改动，也不得无计划触碰核心业务链路

### Phase 4 已完成

- 已完成全站回归验收和治理规则固化。
- 回归证据与长期规则文档位于：
  - `docs/governance/20-phase4-regression-report.md`
  - `docs/governance/21-governance-guardrails.md`
  - `docs/governance/22-extension-admission-rules.md`
- 本轮确认：
  - 配置中心三块入口可用
  - 工作台、素材大厅、素材管理、任务中心可真实打开
  - 移动端壳层折叠导航可打开
- Phase 4 之后已继续处理素材大厅的已知残余项：
  - 列表卡片不再预加载预览资源
  - 历史预览文件缺失时，不再在列表首屏主动打出 `404` 控制台噪音

### Phase 2 最新进展

- 工作台导航已从扁平数组升级为分组导航，管理员不再看到简单拼接的长菜单。
- 新增 `src/components/page-template.tsx`，开始统一页面级标题与内容层级。
- 已接入第一批高优页面：
  - `/apps`
  - `/admin/apps`
  - `/admin/materials`
  - `/admin/prompt-templates`
  - `/admin/users`
- 已继续接入剩余高频页面：
  - `/admin`
  - `/sync`
  - `/tasks`
- `WorkbenchLayout` 已收敛为唯一三栏骨架，`ThreeColumnLayout` 改为兼容封装。
- 已新增 `src/components/confirm-dialog.tsx`，并优先替换后台删除类原生确认弹窗：
  - `/admin/apps`
  - `/admin/prompt-templates`
  - `/admin/users`
- 已新增 `src/components/form-dialog.tsx`，并优先替换首批输入型原生 `window.prompt`：
  - `/admin/apps` 的批量改分类、批量改标签
  - `/admin/categories` 的批量改排序
  - `/admin/banners` 的批量改排序
- 已继续替换多字段输入型原生 `window.prompt`：
  - `/admin/users` 的编辑资料、改密码、调积分、批量改角色、批量改额度
  - `/admin/prompt-templates` 的批量改分类、批量改标签、批量改范围
- 已收敛素材后台与应用编辑器中的剩余原生弹窗：
  - `/admin/materials` 的标签删除、单条/批量重置回公海、单条/批量删除
  - `/admin/apps/[code]` 标签管理器的单条/批量删除与应用删除确认
- `/admin/users` 的单条启停已改为独立更新链路，不再误用批量选择集。
- 已验证：
  - `bun run build`
## 2026-03-23 12:20 补充更新

- `/admin/prompt-templates` 已重新接回完整的后台列表工作流：
  - 支持搜索、状态筛选、范围筛选、排序
  - 支持勾选、全选当前筛选结果、批量启停、批量改分类、批量改标签、批量改范围、批量删除
- 提示词标签管理器已补齐：新增、编辑、删除、批量删除
- 模板分类管理器已补齐：新增、编辑、删除、批量启停、批量删除
- 应用编辑页中的“应用标签”已升级为统一管理入口：
  - 保留原地快速新建
  - 新增“管理标签”弹层
  - 支持标签新增、编辑、删除、批量删除
  - 标签重命名或删除后会同步回写当前应用的已选标签
- 本轮验证：
  - `bun run build`
## 2026-03-23 12:30 补充验证

- 已用生产模式 `next start` + 浏览器实测确认：
  - 手机视口 `390x844` 下，素材大厅首屏已压缩到可容纳 2 张完整卡片，并为第 3 张预留露头空间
  - 桌面 `1600px` 宽度下，素材大厅网格真实为 5 列
  - 标签筛选会真实更新 URL，预览抽屉可正常打开
- 本地“运行时异常”的结论已收敛：
  - 真实业务交互在生产模式正常
  - 之前 Playwright + `next dev` 下出现的交互异常主要是开发态 HMR 噪音，不是素材大厅逻辑本身失效
- 当前剩余风险：
  - 个别历史素材的预览文件物理缺失时，前端仍会看到 `/preview` 的 404；现在已是可控降级，不再打成服务端 500
## 2026-03-23 Phase 2 收口进展

- 已完成后台统一确认/表单对话框的最后一批替换，`category-manager` 与 `banner-manager` 现已接入共享 `ConfirmDialog`
- 已确认 `src/components/` 范围内不再残留浏览器原生 `window.confirm / window.prompt`
- 本轮验证继续以 `bun run build` 为准，结果已通过
- 下一步建议转入模板深化与配置中心整合阶段，优先处理 `Settings / Editor / Detail Inspection`
## 2026-03-23 Phase 2 模板深化进展

- 已把 `Settings / Editor / Detail Inspection` 三类模板的第一批样板页正式接入统一 `PageTemplate`
- 本轮落地点：
  - `/admin/apps/new`
  - `/admin/apps/[code]`
  - `/admin/settings/feishu`
  - `/tasks/[id]`
- `AppFormEditor` 已支持嵌入模式，页面级标题职责回收到了模板层
- 本轮验证继续以 `bun run build` 为准，结果已通过
## 2026-03-23 Phase 2 第三批模板页进展

- 已将 `/assets`、`/profile`、`/admin/categories`、`/admin/banners` 接入统一 `PageTemplate`
- 这意味着 Browse、个人内容页、配置型管理列表页都已经进入统一模板治理范围
- 本轮保持业务逻辑不变，只收页面骨架
- 本轮验证继续以 `bun run build` 为准，结果已通过
- 当前仍有一个明确收尾点：`MaterialHallClient` 与 `ProfileClient` 的内部页头还可以再做一轮净化
## 2026-03-23 Phase 2 页头净化进展

- 已把 `MaterialHallClient` 与 `ProfileClient` 的内部页头收敛到 `embedded` 模式
- 这意味着 `/assets` 与 `/profile` 在接入 `PageTemplate` 后，不再由内容层重复声明主标题
- 当前模板治理已经从“页面接入模板”推进到“内容组件也遵守模板边界”
- 本轮验证继续以 `bun run build` 为准，结果已通过
# 2026-03-23 Phase 2 / Phase 3 收口更新

## 当前状态

- `Phase 2` 已完成：模板接入、页面级标题收口、后台原生 `window.confirm / window.prompt` 清理
- `Phase 3` 已完成：配置中心、品牌接入、导航整合、密钥状态展示

## 本轮新增

- 新增统一配置模型与读取层：
  - `src/lib/site-config.ts`
  - `src/lib/settings.ts`
  - `SiteSettings / IntegrationSettings` Prisma 模型
- 新增配置中心页面：
  - `/admin/settings/site`
  - `/admin/settings/integrations`
  - `/admin/settings/secrets`
- 新增配置中心 API：
  - `/api/internal/admin/settings/site`
  - `/api/internal/admin/settings/integrations`
  - `/api/internal/admin/settings/secrets`
- 站点名、工作区标签、导航命名、主题色已接入：
  - `src/app/layout.tsx`
  - `src/app/(workspace)/layout.tsx`
  - `src/app/(workspace)/loading.tsx`
  - `src/components/workbench-shell.tsx`
  - `src/app/login/page.tsx`
- RunningHub / Feishu 非敏感基础参数已切到统一集成配置读取：
  - `src/lib/runninghub.ts`
  - `src/lib/feishu.ts`
- 旧 `/admin/settings/feishu` 页面已收敛为兼容跳转到 `/admin/settings/integrations`

## 本轮验证

- `bun run prisma:generate`
- `bun run prisma:push`
- `bun test src/app/api/internal/admin/settings/site/route.test.ts src/app/api/internal/admin/settings/integrations/route.test.ts src/app/api/internal/admin/settings/secrets/route.test.ts`
- `bun run build`
## 2026-03-23 15:50 Workbench 模板重构进度

- 已按确认线框图重构 `/apps/[code]` 工作台模板，三栏职责收口为：
  - 左栏：任务发起
  - 中栏：结果工作区
  - 右栏：任务队列
- `WorkbenchLayout` 现已成为唯一三栏骨架入口，统一处理页面头部、左右面板折叠和响应式退化：
  - 桌面端稳定三栏
  - 平板端右栏改抽屉
  - 手机端默认主看中栏，左右栏改覆盖面板
- 工作台当前选中任务已写入 URL 查询参数，刷新页面后可以回到同一任务视图。
- 左栏 `SubmitForm` 已重排为“参考图 / Prompt / 关键参数 / 提交反馈 / 提交按钮”的固定结构，并将低频参数收进“更多参数”。
- 中栏 `ResultsPanel` 已重构为“状态条 + 主结果区 + 结果操作区 + 输入摘要 / 缩略带”，不再把下载等动作漂浮在图片角落。
- 右栏 `RecentResultsPanel` 已改为“当前任务 + 最近任务”队列，弱化长任务号，强化状态、时间和切换效率。
- 本轮验证已通过：
  - `npx vitest run src/components/use-app-tasks.test.tsx src/components/submit-form.test.tsx src/components/recent-results-panel.test.tsx`
  - `npx eslint "src/components/app-workbench-client.tsx" "src/components/left-panel.tsx" "src/components/recent-results-panel.tsx" "src/components/results-panel.tsx" "src/components/results-panel-client.tsx" "src/components/use-app-tasks.ts" "src/components/workbench-layout.tsx" "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/components/recent-results-panel.test.tsx" "src/components/submit-form.test.tsx" "src/components/use-app-tasks.test.tsx"`
  - `bun run build`
- 真实浏览器回归已补充完成，基于生产态 `next start` 页面验证：
  - 桌面端：左栏、右栏可折叠，中栏会稳定扩展
  - 平板端：右栏退化为任务历史抽屉
  - 手机端：默认中栏优先，左栏和右栏都以覆盖面板打开
  - 任务切换会更新 URL 中的 `task` 查询参数
  - 生产态控制台 `0 error / 0 warning`
  - 相关截图位于 `output/playwright/workbench-*.png`
## 2026-03-23 单应用模板 UX 重构更新

- 单应用页现在以「左侧输入工作台 + 中间结果主画布 + 右侧最新任务卡」为固定结构，目标是桌面端首屏完成输入、提交、看结果的闭环。
- 左侧 `SubmitForm` 已升级为应用级草稿工作台：提交后不清空、支持本地草稿恢复、支持手动清空、低频参数默认折叠。
- 中间结果区已改为默认展示主结果与核心动作，输入摘要默认折叠，只在用户主动展开时查看详细输入。
- 右侧不再展示“当前任务 / 最近任务”双分组，单应用页只保留 1 张最新任务卡，并提供“再次生成”快捷复用入口。
- 当前已通过组件测试、生产构建与真实浏览器回归，验证了桌面、平板、手机三种视口下的首屏闭环与抽屉退化。
- 浏览器回归过程中额外修复了一个草稿恢复细节：单应用页在路由离开再返回后，下拉参数也会和 Prompt 一样正确恢复，不再只保留文本草稿。
## 2026-03-23 应用配置与新建应用修复

- 已修复 `应用配置` 删除应用失败：
  - `DELETE /api/internal/admin/apps/[code]` 改为事务式级联删除
  - 会一并清理 `Task / SyncLog / TaskAsset / CreditLog`
  - 单删与批量删除统一复用同一套删除逻辑
- 已修复 `新建应用` 同步配置重复手填：
  - 新建页默认读取站点级飞书字段映射
  - `同步配置` 页签默认带入站点 `columnMappings`
  - 仍允许按应用继续编辑并单独保存
- 已修复 `新建应用` 后 404：
  - 默认 `code` 改为 ASCII 安全策略
  - 创建成功后按服务端返回的 `app.code` 跳转
  - 应用编辑、访问、删除等相关链接统一做 `encodeURIComponent`
- 本轮验证：
  - `npx vitest run src/lib/db/apps.test.ts src/components/app-form-editor.test.tsx src/app/api/internal/admin/apps/[code]/route.test.ts`
  - `bun run build`
## 2026-03-23 19:10 单应用页二次精简与任务卡重设计
- `/apps/[code]` 进一步瘦身为稳定三栏：左侧输入区 / 中间结果区 / 右侧全站任务；桌面端不再支持左右栏折叠。
- 顶部整排“任务发起 / 收起输入区 / 全站任务 / 收起全站任务”按钮已移除；移动端改为输入区、结果区、全站任务的纵向堆叠，不再使用抽屉。
- 左侧已移除“输入工作台”说明卡，`清空草稿` 保留并合并到底部提交条，与 `提交任务` 并列。
- 中间结果区已移除整块“输入摘要”，不再重复显示 Prompt、关键参数摘要和参考图链接；结果区只保留状态、主结果、关键操作和缩略图。
- 右侧全站任务流已切换为方案 C 表格式卡片：固定展示 `siteTaskNo + 状态 + 应用名 + 时间 + 耗时 + 结果摘要`，第三方任务 ID 默认折叠，底部提供 `一键同款 / 查看结果`。
- 跨应用任务继续允许查看结果，但“一键同款”只对当前应用任务启用。

## 本轮验证补充
- `npx vitest run src/components/workbench-layout.test.tsx src/components/results-panel.test.tsx src/components/recent-results-panel.test.tsx src/components/submit-form.test.tsx`
- `npx vitest run src/components/use-app-tasks.test.tsx src/components/workbench-layout.test.tsx src/components/results-panel.test.tsx src/components/recent-results-panel.test.tsx src/components/submit-form.test.tsx src/lib/db/tasks.test.ts src/lib/db/users.test.ts src/lib/feishu-sync-jobs.test.ts`
- `npx eslint "src/components/app-workbench-client.tsx" "src/components/recent-results-panel.tsx" "src/components/results-panel.tsx" "src/components/results-panel-client.tsx" "src/components/workbench-layout.tsx" "src/components/three-column-layout.tsx" "src/components/workbench-layout.test.tsx" "src/components/recent-results-panel.test.tsx" "src/components/results-panel.test.tsx" "src/components/submit-form.test.tsx" "src/app/(workspace)/apps/[code]/submit-form.tsx"`
- `bun run build`
## 2026-03-23 19:35 单应用页第三轮压缩
- 左侧“参考图输入”已从“1 大 2 小”改成统一三列，三张图等宽等高，第 1 列仅用轻量样式强调“主参考图”。
- 参考图区已统一空态与已上传态骨架，不再因为主图而额外放大卡片；左栏首屏高度进一步压缩。
- 右侧“全站任务”已从操作卡片流改成纯信息高密度列表，按桌面端右栏优先压缩单条高度，目标是一屏尽量容纳 10 条。
- 每条任务现在只保留：`缩略图 + 站内编号 + 状态 + 耗时`、`应用名`、`日期时间`、`第三方 ID`，不再在列表项内展示摘要、展开控件或操作按钮。
- “一键同款”已继续保留在中间结果区，不再占用右栏任务列表空间。

## 本轮验证补充
- `npx vitest run src/components/recent-results-panel.test.tsx src/components/submit-form.test.tsx`
- `npx vitest run src/components/workbench-layout.test.tsx src/components/results-panel.test.tsx src/components/recent-results-panel.test.tsx src/components/submit-form.test.tsx src/components/use-app-tasks.test.tsx src/lib/db/tasks.test.ts src/lib/db/users.test.ts src/lib/feishu-sync-jobs.test.ts`
- `npx eslint "src/components/app-workbench-client.tsx" "src/components/recent-results-panel.tsx" "src/components/results-panel.tsx" "src/components/results-panel-client.tsx" "src/components/workbench-layout.tsx" "src/components/three-column-layout.tsx" "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/components/recent-results-panel.test.tsx" "src/components/submit-form.test.tsx" "src/components/results-panel.test.tsx" "src/components/workbench-layout.test.tsx"`
- `bun run build`
## 2026-03-23 19:50 结果区下载按钮可见性修复
- 修复单应用页结果区“下载结果”链接按钮文字不可见的问题。
- 根因是全局 `a { color: var(--accent) }` 覆盖了按钮内的白色文字样式，导致蓝底保留但文字被错误着色。
- 结果区下载入口已改为强制白字的链接按钮样式，并补充结果区回归测试。
## 2026-03-23 20:55 任务ID统一与任务中心批量管理

- 单应用页和任务详情页已统一使用“站内编号 + 任务ID”两层语义：`WB-xxxxxx` 继续作为站内编号，原先展示成“第三方 ID”的外部编号统一改名为“任务ID”。
- `/apps/[code]` 桌面端右侧“全站任务”面板现在默认收起，并新增一个贴着右侧中部的轻量开关；展开后仍保持当前用户全站任务的实时刷新与结果切换能力。
- 任务中心已从只读表格升级为可批量管理列表：管理员可以勾选任务，执行“批量重试同步”与“批量删除”。
- 批量删除会级联清理 `Task / TaskAsset / SyncLog / CreditLog`，并对本地结果文件执行 best-effort 删除；文件缺失不会阻塞整批操作。
- 飞书同步相关文案、同步异常列表和集成设置页里的字段说明已统一改用“任务ID”，但底层仍保持 `taskNo` 作为映射键，避免破坏既有配置。
- 本轮验证已通过：
  - `npx vitest run src/components/recent-results-panel.test.tsx src/components/results-panel.test.tsx src/components/workbench-layout.test.tsx src/components/admin-tasks-client.test.tsx src/app/api/internal/admin/tasks/bulk/route.test.ts`
  - `npx eslint "src/components/workbench-layout.tsx" "src/components/app-workbench-client.tsx" "src/components/recent-results-panel.tsx" "src/components/results-panel.tsx" "src/components/admin-tasks-client.tsx" "src/components/sync-incidents-client.tsx" "src/lib/db/sync.ts" "src/app/(workspace)/tasks/[id]/page.tsx" "src/app/(workspace)/admin/settings/integrations/page.tsx" "src/app/api/internal/admin/tasks/bulk/route.ts"`
  - `npm run build`
## 2026-03-24 单应用模板多图结果展示

- 单应用结果区现在把 `TaskRecord.outputAssets` 明确当作结果集合处理，不再只按单图心智展示。
- 多图任务会在主画布显示当前选中结果，并在结果图区展示完整缩略条，支持逐张切换与放大。
- 结果缩略图组件现已兼容站内相对路径，如 `/assets/...`，本地落盘后的结果图也能正常展示。
- 结果操作区文案已收口为“下载当前图片 / 查看当前图片”，避免误解成整组打包下载。
- 本轮验证已通过：
  - `npx vitest run src/components/results-panel.test.tsx`
  - `npx eslint "src/components/results-panel.tsx" "src/components/results-panel.test.tsx" "src/components/asset-thumbnail.tsx"`
  - `bun run build`
## 2026-03-24 多图结果下载增强

- 单应用结果区与任务详情页现已同时支持三种结果下载方式：
  - `下载当前图片`
  - `直接下载多张`
  - `下载全部 ZIP`
- 新增任务结果下载接口：
  - `GET /api/internal/tasks/[id]/downloads/assets/[assetId]`
  - `GET /api/internal/tasks/[id]/downloads/archive`
- 下载链路统一由服务端处理权限校验、文件名、站内 `/assets/...` 路径解析和远程结果图透传。
- ZIP 打包采用流式返回，不落地临时压缩文件；多张直接下载采用客户端顺序触发，失败时给出非阻塞提示并建议改用 ZIP。
- 本轮已补齐结果区组件测试、下载动作组件测试和两个下载路由测试，并完成 lint 与构建验证。
## 2026-03-24 AI 应用费用与后台列表直改

- AI 应用费用体系已从积分切换为人民币预计费用：
  - `App.creditCost` 改为 `estimatedPriceFen`
  - 任务新增 `estimatedPriceFenSnapshot`
  - 前台提交前、任务详情、后台应用列表/编辑页都会展示预计费用
- 积分体系已从运行代码中移除：
  - 删除用户积分字段与积分接口
  - 个人中心不再展示积分余额和积分记录
  - 任务与应用删除链路不再处理积分流水
- 后台第一批高频列表已支持“列表内直接改 + 直接排序”：
  - 应用
  - 分类
  - Banner
  - 提示词模板
  - 用户
- 本轮还额外修复了一批历史编码/乱码导致的 JSX 与字符串断裂问题，恢复了相关页面与测试的可构建状态。

## 本轮验证

- `bunx prisma db push --accept-data-loss`
- `npx vitest run src/lib/db/apps.test.ts src/app/api/internal/admin/apps/[code]/route.test.ts src/app/api/internal/admin/apps/bulk/route.test.ts src/components/app-form-editor.test.tsx src/components/submit-form.test.tsx src/components/admin-apps-client.test.tsx`
- `npx eslint "src/lib/money.ts" "src/lib/db/apps.ts" "src/lib/db/apps.test.ts" "src/lib/db/admin.ts" "src/lib/db/users.ts" "src/lib/db/tasks.ts" "src/lib/auth.ts" "src/lib/task-queue.ts" "src/lib/types.ts" "src/app/(workspace)/admin/users/page.tsx" "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/app/(workspace)/tasks/[id]/page.tsx" "src/app/(workspace)/profile/page.tsx" "src/app/(workspace)/profile/client.tsx" "src/app/api/internal/admin/apps/route.ts" "src/app/api/internal/admin/apps/[code]/route.ts" "src/app/api/internal/admin/apps/[code]/route.test.ts" "src/components/admin-apps-client.test.tsx" "src/components/app-form-editor.tsx" "src/components/app-form-editor.test.tsx" "src/components/submit-form.test.tsx"`
- `bun run build`
## 2026-03-24 提示词模板变量化与后台单屏改造

- 已将提示词模板从“模板正文 + 用户输入”的固定拼接升级为“变量替换优先、旧逻辑兼容回退”。
- 当前首批支持变量：
  - `{{input.prompt}}`
  - `{{input.style}}`
  - `{{input.scene}}`
  - `{{input.negative_prompt}}`
- 服务端现在会从应用表单的 `formData` 中构造变量字典，再生成最终 provider prompt；任务记录中的 `task.prompt` 仍只保留用户主输入，不暴露后台模板正文。
- 后台“新建/编辑提示词模板”弹窗已重构为桌面端一屏工作台：
  - 左侧：基础信息、示例媒体、模板正文
  - 右侧：启用状态、主分类、适用范围、默认应用、辅助标签、执行说明
  - 底部：固定取消 / 保存操作
- 模板正文编辑区已改为白底，并新增变量插入按钮与执行说明。
- 示例媒体已支持本地上传：
  - 图片模板：图片上传 + URL 兜底
  - 视频模板：视频上传 + 可选封面上传 + URL 兜底
- 辅助标签与模板分类已支持在编辑流内就地管理，保存后即时刷新当前可选项。

### 本轮验证

- `npx vitest run src/lib/app-submit.test.ts src/components/admin-prompt-template-edit.test.tsx`
- `npx eslint src/lib/app-submit.ts src/lib/app-submit.test.ts src/lib/task-queue.ts src/components/admin-prompt-template-edit.tsx src/components/admin-prompt-template-edit.test.tsx src/components/admin-prompt-templates-client.tsx`

### 下一步建议

- 用真实后台页面回归一轮模板新建/编辑流，重点确认：
  - 视频上传后的封面预览
  - 分类删除保护提示
  - 旧模板在不含变量时的兼容行为
## 2026-03-24 飞书字段映射可配置化

- 飞书字段映射已经从固定白名单升级为结构化映射器。
- 全局“集成设置”页现在只暴露共享基础字段：
  - `taskNo`
  - `status`
  - `providerStatus`
  - `providerResultUrl`
  - `providerErrorMessage`
  - `ownerName`
  - `appName`
  - `prompt`
  - `allInfo`
  - `createdAt`
- 应用编辑器的“节点与同步”页现在额外支持当前应用表单字段映射，键格式为 `params.<fieldKey>`。
- 客户端和服务端共用 `feishu-sync-fields` 与 `feishu-sync-mapping`，避免客户端误引用带 `prisma` 的同步服务模块。
- 任务同步 payload 现已支持把 `paramsJson` 展开为飞书字段：
  - 字符串直接同步
  - 数组按换行拼接
  - 数字/布尔值转字符串
  - 空值自动跳过
- 本轮验证：
  - `bunx vitest run src/app/api/internal/admin/apps/[code]/route.test.ts src/lib/feishu-sync.test.ts src/app/api/internal/admin/settings/integrations/route.test.ts src/components/app-form-editor.test.tsx`
  - `bun run build`
## 2026-03-24 飞书映射补充提示词模板字段

- 飞书共享映射字段新增：
  - `promptTemplateName`
  - `promptTemplateContent`
- 两个字段都属于站点级共享字段，所以会同时出现在：
  - 后台“集成设置”的全局飞书字段映射
  - 应用编辑器的同步配置共享字段列表
- 任务提交时，如果用户选择了提示词模板，系统会把模板快照写入任务结果快照：
  - 模板 ID
  - 模板名称
  - 模板正文
- 飞书同步不再依赖“当次提交时的临时内存”，而是统一从任务快照读取模板信息，所以：
  - 首次创建记录可同步
  - webhook / 轮询更新可继续同步
  - 历史补同步也能带上模板信息
- 本轮验证：
  - `bunx vitest run src/lib/feishu-sync.test.ts src/app/api/internal/admin/settings/integrations/route.test.ts`
  - `bun run build`
## 2026-03-24 最新进展：RunningHub 多通道并发调度

- RunningHub 已从单通道并发配置升级为多通道调度器，支持在集成设置里维护多套通道：`code / name / apiKeyEnvName / concurrencyLimit / priority / enabled`。
- 并发配置正式归属到 RunningHub 区块，不再放在飞书配置语义下；飞书区块现在只负责连接配置和字段映射。
- 任务提交链路改为“先写入本地 `QUEUED` 队列，再按优先级与并发占用自动派发”：
  - 优先使用优先级更高的通道
  - 通道满额后自动尝试下一条通道
  - 所有可用通道都满时，任务继续留在本地队列
- 应用级支持 `runninghubAllowedChannelCodesJson`，可选“自动调度”或“只允许指定通道”。
- 任务已新增通道快照字段：`runninghubChannelCode`、`runninghubChannelName`，便于任务中心和后续排障追踪。
- 密钥状态页改为动态展示当前通道依赖的 env key，API Key 仍然只走环境变量，不落库。

## 本轮验证

- `bunx prisma generate`
- `bunx vitest run src/app/api/internal/admin/settings/integrations/route.test.ts src/app/api/internal/admin/settings/secrets/route.test.ts src/app/api/internal/admin/apps/[code]/route.test.ts src/components/app-form-editor.test.tsx`
- `bun run build`

## 当前注意事项

- 默认本地 `dev.db` 的正式迁移验证目前被历史失败迁移 `20260322180000_structured_app_management` 阻塞；这属于仓库既有问题，不是本轮改动新引入的问题。
- 本轮保留了对旧 `taskMaxConcurrency` 的兼容读取逻辑，后台保存一次新设置后会落成正式的 `runninghubChannelsJson`。
## 2026-03-24 测试基线修复
- `bun run test` 已恢复全绿，当前结果为 `38` 个测试文件、`127` 条测试全部通过。
- Vitest 现在固定使用独立的 `test.db`，不再直接读写默认 `dev.db`。
- 测试启动前会先从 `dev.db` 复制一份模板库到 `test.db`，再执行 `prisma db push --accept-data-loss` 同步 schema，解决了测试库缺少 `runninghubAllowedChannelCodesJson` / `runninghubChannelsJson` 列的问题。
- Vitest 文件级并行已关闭，避免 SQLite 在多文件并发写入下出现 Prisma timeout/锁竞争。
- `src/app/api/internal/admin/settings/site/route.test.ts` 已改为 `vi.hoisted(...)` 初始化 mock，修复 hoisted mock 的初始化顺序错误。

## 本轮验证
- `bun run test src/app/api/internal/admin/settings/site/route.test.ts src/lib/feishu-sync-jobs.test.ts src/lib/db/tasks.test.ts src/lib/db/users.test.ts src/lib/db/materials.test.ts`
- `bun run test`
- `bun run build`

## 当前说明
- 构建时此前那组 Prisma “缺列”日志已经消失。
- 当前构建仅剩 1 条既有的 Turbopack NFT tracing warning，与这次测试基线修复无关。

## 2026-03-24 提示词模板新增分类草稿修复
- 已修复 `AdminPromptTemplateEdit` 在新增分类/标签时误重置整张表单的问题；当前草稿中的模板正文、描述、标签、作用范围、媒体地址等字段不再因为选项列表刷新而被清空。
- 已修复内嵌分类/标签管理弹窗在 `setState` updater 中直接触发父组件更新导致的 React 警告：`Cannot update a component while rendering a different component`。
- 分类/标签的本地列表更新现在先计算 `nextCategories` / `nextTags`，再分别同步本地状态和父级回调；不再把父组件更新放进 render/update 过程。
- 新增分类后，如果当前主分类为空，会自动选中新分类；`sortOrder` 的默认值也改为基于最新分类列表动态计算。

## 本轮验证
- `bun run test src/components/admin-prompt-template-edit.test.tsx`
- `npx eslint src/components/admin-prompt-template-edit.tsx src/components/admin-prompt-template-edit.test.tsx`
- `bun run build`

## 当前说明
- 定向回归测试已通过，覆盖了“新增分类后草稿不丢失”“新增分类后立即出现在主分类选项中”“创建过程中不再触发 React cross-component warning”。
- `bun run test` 目前仍有仓库既有失败项，主要是测试数据库缺少 `runninghubAllowedChannelCodesJson` / `runninghubChannelsJson` 列，以及个别历史 Prisma 超时/hoisted mock 问题；这次改动没有新增这些失败。

## 2026-03-24 提示词模板封面缩略图优化
- 后台“新建/编辑提示词模板”的示例媒体预览区已把 `Preview` 文案改为“封面”。
- 图片封面与视频封面现在按完整比例显示缩略图，避免继续用 `object-cover` 裁掉主体。
- 封面缩略图已接入完整大图预览，运营可直接在当前弹窗里点开查看完整图片。

## 本轮验证
- `npx vitest run src/components/admin-prompt-template-edit.test.tsx`
- `npx eslint "src/components/admin-prompt-template-edit.tsx" "src/components/admin-prompt-template-edit.test.tsx"`

## 当前说明
- 本轮是提示词模板编辑器的定点 UI 收口，没有改动模板保存协议和服务端执行规则。
- 真实后台页面仍建议补一次“新建模板 -> 填封面 -> 查看完整图 -> 保存”的手工回归，确认远程图片源也符合预期。
## 2026-03-24 应用展示配置改版

### 本轮完成
- 展示配置新增 `案例参考图片`，后台支持本地批量上传和单张 URL 添加，最多 100 张。
- 前台应用详情页新增 `效果展示` 模块，支持主图切换、缩略图带和点击放大。
- 展示配置移除了 `图标 URL / 图标背景色 / 角标文本 / 作者名称 / 作者头像 URL` 这 5 个后台输入项。
- 数据层新增 `showcaseImagesJson`，前台统一读取为 `showcaseImages: string[]`，空值自动回退为空数组。
- 现有应用列表卡片继续只使用封面图，不把案例图带进列表卡片。

### 验证结果
- `npx vitest run src/components/app-form-editor.test.tsx src/lib/db/apps.test.ts src/app/api/internal/admin/apps/[code]/route.test.ts src/components/app-showcase-gallery.test.tsx src/components/submit-form.test.tsx src/components/admin-prompt-template-edit.test.tsx`
- `npx eslint "src/lib/types.ts" "src/lib/db/apps.ts" "src/app/api/internal/admin/apps/route.ts" "src/app/api/internal/admin/apps/[code]/route.ts" "src/components/app-form-editor.tsx" "src/components/app-form-editor.test.tsx" "src/components/app-showcase-gallery.tsx" "src/components/app-showcase-gallery.test.tsx" "src/components/app-workbench-client.tsx" "src/components/submit-form.test.tsx" "src/components/admin-prompt-template-edit.test.tsx" "src/lib/db/apps.test.ts" "src/app/api/internal/admin/apps/[code]/route.test.ts"`
- `npx prisma db push`
- `npm run build`
## 2026-03-24 追加进度

- 已补齐应用创建接口对 `showcaseImagesJson` 的自动化测试，确保新建应用时可写入案例图列表。
- 前台应用列表卡片与工作台快捷入口已统一切换为消费 `coverPoster`，不再读取旧的 `iconUrl / iconBgColor` 展示字段。
- 当前主工作区已重新验证通过：`7` 个测试文件、`34` 条测试通过；相关 `eslint` 通过；`npm run build` 通过。

## 2026-03-24 任务中心输入参考图与详情抽屉

### 本轮完成
- 任务中心列表新增 `输入参考图` 列，默认展示任务首张主参考图，无图时显示占位态。
- `结果预览` 与 `输入参考图` 继续保持独立 lightbox 预览，不和任务详情抽屉复用同一点击区域。
- `站内编号` 与 `应用名` 改为打开右侧任务详情抽屉，抽屉内集中展示概览、输入信息、输出结果、系统日志和飞书同步记录。
- `GET /api/internal/tasks/[id]` 现在会返回 `appInputSchema`，用于把任务参数映射成中文 label，并统一输入参考图排序规则。
- 新增共享任务输入映射逻辑，统一 `sourceSlot`、图片字段顺序和“主参考图优先级”，保证列表与抽屉的输入语义一致。

### 验证结果
- `bun run test src/components/admin-tasks-client.test.tsx src/lib/db/tasks.test.ts`
- `npx eslint "src/components/admin-tasks-client.tsx" "src/components/admin-tasks-client.test.tsx" "src/components/task-detail-drawer.tsx" "src/lib/task-inputs.ts" "src/lib/db/tasks.ts" "src/lib/db/tasks.test.ts" "src/lib/types.ts"`
- `bun run build`

### 当前说明
- 本轮保留原 `/tasks/[id]` 深度详情页，抽屉只承担“任务中心快速浏览”的角色，不额外改动原详情页链路。
- `bun run build` 仍会输出仓库既有的 Turbopack NFT tracing warning，这次改动没有引入新的构建失败。

## 2026-03-25 生产页容错热修复

### 本轮完成
- 工作台首页对 `getDashboardSummary` 和 `getEnabledAppsWithStats` 增加了生产级空态兜底，单个查询异常时不再整页报错。
- 系统概览 `getAdminOverview` 增加了整体回退逻辑，后台统计查询失败时会保留管理入口并展示零值概览。
- 任务中心对任务列表查询增加兜底，避免生产数据库短暂异常时直接落到 Server Components 错误页。
- 新增两条回归测试，锁定“首页统计异常仍可渲染”和“系统概览异常仍返回空态”的行为。

### 验证结果
- `npx vitest run "src/app/(workspace)/page.test.tsx" src/lib/db/admin.test.ts`
- `npx eslint "src/app/(workspace)/page.tsx" "src/app/(workspace)/page.test.tsx" "src/app/(workspace)/tasks/page.tsx" "src/lib/db/admin.ts" "src/lib/db/admin.test.ts"`
- `node node_modules/next/dist/bin/next build`

### 当前说明
- 这次修复的目标是先避免线上概览页因单点查询失败直接白屏，真实的数据库枚举或 schema 漂移仍建议后续继续核对并补迁移。
- 已将同一批修复推送到 Vercel 发布分支 `codex/github-publish-1-13`，等待线上部署完全切换即可继续人工回归。

## 2026-03-25 Vercel 构建连接池修复

### 本轮完成
- 通过 Vercel CLI 拉取失败部署 `dpl_22A6iuxDC7eKshL4KUfSELkUFcFe` 的构建日志，确认失败根因不是 TypeScript 或 Next 构建语法错误，而是构建期预渲染后台页面时打满了 Postgres 连接池。
- 在工作台路由组 layout 上显式增加 `export const dynamic = "force-dynamic"`，阻止 `/admin/*`、`/tasks`、`/` 等依赖 session 和数据库的页面在 build 阶段预渲染。
- 调整后本地构建的 `Generating static pages` 数量已从 `71` 降到 `53`，说明工作台路由组已经退出静态预生成。

### 验证结果
- `npx vercel inspect https://hz-i523350t4-mubai123456s-projects.vercel.app --logs`
- `node node_modules/next/dist/bin/next build`
- `npx eslint "src/app/(workspace)/layout.tsx"`

### 当前说明
- 这次修复针对的是 Vercel 构建期连接数耗尽，不改变运行期数据库查询逻辑。
- 如果后续还出现连接池告警，再考虑继续下调构建期数据库访问面，或把连接模式切到更适合 serverless/build 的池化配置。
