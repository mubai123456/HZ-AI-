## 2026-03-25 18:37:08

- 完成应用配置与生产稳定性修复：
  - `src/lib/auth.ts` 改为只在 `APP_ENV=production` 时强制校验安全 `JWT_SECRET`
  - `src/lib/app-parser.ts` 新增 RunningHub `fieldData` 解析，支持两类下拉元数据格式
  - `src/components/app-form-editor.tsx` 把“前台显示”语义调整为“默认可见，管理员可取消显示”
  - `src/app/(workspace)/apps/[code]/submit-form.tsx` 改为渲染全部可见 textarea，并保留主提示词 + 补充文本参数结构
  - `src/lib/feishu-sync-jobs.ts` 增加按 `siteTaskNo` 的稳定排序，消除补同步测试的非确定性
  - `prisma/seed.ts` 新增对旧示例应用 `2-0` 的修复型 upsert
- 同步修复当前本地库里的 `2-0`：
  - 把 `aspectRatio / resolution / channel` 从错误的 `textarea` 改回 `select`
  - 前台 `2-0` 已恢复为“文本主提示词 + 两个首屏下拉 + 一个折叠下拉”
- 执行验证：
  - `npx vitest run src/lib/auth.test.ts src/lib/app-parser.test.ts src/components/app-form-editor.test.tsx src/components/submit-form.test.tsx`
  - `npm run test`
  - `node node_modules/next/dist/bin/next build`
  - `npx tsc --pretty false --noEmit`
  - Playwright 生产态 smoke：`/login`、`/admin/apps/new`、`/admin/apps/2-0`、`/apps/2-0`、`/tasks`

下一步：

- 如果后续还需要兼容更多历史错 schema 的旧应用，优先补可复用的数据修复脚本，而不是继续手工改库
- 单独跟进既有的 Turbopack NFT tracing warning，避免长期淹没真正新的构建告警

## 2026-03-25 14:36:00

- 收口正式一键部署入口：
  - 修复 `package.json` 中 Vercel 部署脚本与 Node `--env-file` 选项冲突的问题，统一改为 `node -- scripts/deploy-vercel.mjs ...`
  - 新增正式环境模板文件 `.env.vercel.production`
- 现场验证：
  - `npm run deploy:vercel:production:dry-run`
- 当前阻塞项：
  - 生产 dry-run 已可正常执行
  - 但正式环境仍缺少真实生产密钥与凭据，当前缺：
    - `VERCEL_TOKEN`
    - `VERCEL_ORG_ID`
    - `VERCEL_PROJECT_ID`
    - `JWT_SECRET`
    - `RUNNINGHUB_API_KEY`
    - `RUNNINGHUB_WEBAPP_ID`
    - `RUNNINGHUB_WEBHOOK_SECRET`
    - `FEISHU_APP_ID`
    - `FEISHU_APP_SECRET`
    - `FEISHU_APP_TOKEN`
    - `FEISHU_TABLE_ID`
    - `S3_BUCKET`
    - `S3_ACCESS_KEY_ID`
    - `S3_SECRET_ACCESS_KEY`

下一步：

- 填完 `.env.vercel.production` 里的真实生产值
- 再次执行 `npm run deploy:vercel:production:dry-run`
- 通过后直接执行 `npm run deploy:vercel:production`

## 2026-03-25 14:08:00

- 完成七牛 Kodo 一期混合存储策略落地：
  - 新增 `src/lib/task-output-storage.ts`
  - 新增 `TASK_OUTPUT_STORAGE_MODE`
  - 任务结果图默认改为 `provider_url` 策略，不再默认把 RunningHub 输出图回存自有对象存储
  - 素材、视频与任务输入参考图继续统一走对象存储抽象，便于直接切到七牛 Kodo
  - 任务单文件下载与打包下载补充远程 provider URL 回源测试
  - `scripts/migrate-sqlite-to-postgres.mjs` 改为一期默认跳过历史输出图补传，并产出 `skippedFiles`
  - `src/lib/vercel-deploy.mjs` 增加：
    - `TASK_OUTPUT_STORAGE_MODE` 校验
    - 生产环境禁止七牛测试域名
- 执行验证：
  - `npx vitest run src/lib/task-output-storage.test.ts src/lib/vercel-deploy.test.ts "src/app/api/internal/tasks/[id]/downloads/assets/[assetId]/route.test.ts" "src/app/api/internal/tasks/[id]/downloads/archive/route.test.ts"`
  - `npm test`
  - `npm run build`

下一步：

- 用新的七牛正式密钥和自定义 HTTPS 域名填写 `.env.vercel`
- 先跑 `npm run deploy:vercel:preview:dry-run`
- 再用真实 Supabase + 七牛配置执行 `npm run migrate:sqlite -- .\\dev.db`

## 2026-03-25 04:36:49

- 完成 `1.13 -> Postgres / Supabase` 第一批基础改造：
  - Prisma 运行时切到 `@prisma/adapter-pg`
  - 本地/测试连接约定切到 `DATABASE_URL / DIRECT_URL / TEST_DATABASE_URL`
  - 新增对象存储抽象 `src/lib/object-storage.ts`
  - 素材上传与任务结果持久化开始统一走对象存储接口
  - 新增 `prisma/postgres-migrations` 基线迁移
  - 新增 `scripts/migrate-sqlite-to-postgres.mjs`
  - 新增 `scripts/prepare-test-db.mjs`
  - 新增 `prisma/bootstrap-admin.mjs`
  - 升级 `scripts/deploy-vercel.mjs` 与 `src/lib/vercel-deploy.mjs`
- 修正升级分支本地环境：
  - `.env.local` 不再沿用 `1.11` 的 SQLite 覆盖
  - 本地构建已切回 Postgres
- 执行验证：
  - `npx vitest run src/lib/vercel-deploy.test.ts src/lib/object-storage.test.ts`
  - `npm run test:db:reset`
  - `npm run prisma:migrate:deploy`
  - `npm test`
  - `npm run build`
- 当前结果：
  - `npm test` 通过，`45` 个测试文件、`155` 条测试通过
  - `npm run build` 通过
  - 仍有 1 条既有的 Turbopack NFT tracing warning

下一步：

- 用真实 Supabase 库跑一次 SQLite 数据迁移
- 用真实 S3 / R2 凭据跑一次本地文件迁移
- 准备 `.env.vercel` 做 preview dry-run 和预发部署验证

## 2026-03-25 04:37:00

- 继续收口外部环境联调准备：
  - `prisma.config.ts` 改为迁移优先使用 `DIRECT_URL`
  - `prisma/bootstrap-admin.mjs` / `prisma/seed.ts` / `scripts/migrate-sqlite-to-postgres.mjs` 同步兼容 `DIRECT_URL`
  - 新增 `deploy:vercel:preview:dry-run` 与 `deploy:vercel:production:dry-run`
  - 新增生产模板 `.env.vercel.production.example`
  - 新增外部环境配置手册 `docs/SUPABASE-R2-VERCEL-RUNBOOK.md`
- 目的：
  - 让 Supabase / R2 / Vercel 的真实配置可以按固定顺序执行
  - 避免 `DIRECT_URL` 配了但迁移脚本没实际使用

下一步：

- 按 runbook 拿真实平台参数
- 先跑 preview dry-run，再跑 SQLite -> Postgres 迁移

## 2026-03-25 12:53:41

- 完成外部环境联调手册与模板收口：
  - 新增 `docs/SUPABASE-R2-VERCEL-RUNBOOK.md`
  - 新增 `.env.vercel.production.example`
  - `package.json` 新增 preview / production dry-run 脚本
  - `prisma.config.ts` 已改为迁移优先读 `DIRECT_URL`
  - `prisma/bootstrap-admin.mjs`、`prisma/seed.ts`、`scripts/migrate-sqlite-to-postgres.mjs` 已同步兼容 `DIRECT_URL`
- 执行验证：
  - `node scripts/deploy-vercel.mjs --help`
  - `npm test`
  - `npm run build`
- 当前结果：
  - `npm test` 通过，`45` 个测试文件、`155` 条测试通过
  - `npm run build` 通过
  - 仍保留 1 条既有 Turbopack NFT tracing warning，不阻塞当前升级线

下一步：

- 你按 runbook 去 Supabase / R2 / Vercel 控制台拿真实值
- 我再带你一步一步填 `.env.vercel`
- 然后先跑 `npm run deploy:vercel:preview:dry-run`

## 2026-03-25 03:36:16

- 按最新页面口径收口单应用页中间主区：
  - 不再使用“案例展示 + 结果工作区”上下连续布局
  - 改为统一“结果区”容器，内部提供 `结果 / 案例` 双标签页
  - 默认进入 `结果` 标签；未选中任务时也仍可切到 `案例` 查看案例图
- 更新 `src/components/results-panel.tsx`：
  - 把案例内容并入结果区 header 下方的 tab panel
  - 保留现有结果主图、多图缩略、参考图、下载、一键同款、刷新状态能力
- 补强 `src/components/results-panel.test.tsx`：
  - 覆盖默认显示结果标签
  - 覆盖切到案例标签后隐藏结果标题、显示案例内容
  - 覆盖无任务时案例标签仍可用
- 执行验证：
  - `npm test -- src/components/results-panel.test.tsx src/components/app-showcase-gallery.test.tsx src/lib/session.test.ts src/lib/runninghub.test.ts`
  - `npx eslint src/components/results-panel.tsx src/components/results-panel.test.tsx src/components/app-workbench-client.tsx`
  - Playwright 实测 `/apps/all-in-one-image-2`，确认默认 `结果`、切换 `案例` 成功，且仍位于同一结果区内

下一步：

- 如果你还想继续微调，可再决定标签默认顺序、文案，或是否要记住上次停留的标签

## 2026-03-25 03:27:00

- 追查“提交任务报错且页面看不到最新两个任务”：
  - 服务日志确认后续两次 `POST /api/internal/tasks/submit` 实际已经返回 `200`
  - 第三方 RunningHub 查询确认两条任务都是真实 `FAILED`
  - 两条任务号分别是 `2036523467955904514`、`2036523777214586882`
  - 两条失败根因一致，都是 `torch.OutOfMemoryError`，节点为 `KSampler`
- 发现页面看不到最新任务的直接原因：
  - 前一轮为了把任务数恢复到旧基线，误删了这两条最新任务
  - 已从 RunningHub 实际状态与服务日志恢复两条任务回 SQLite
  - 当前任务总数为 `9`，其中失败任务 `2`
- 新增失败原因提炼能力：
  - 在 `src/lib/runninghub.ts` 增加 `getRunningHubTaskErrorMessage`
  - 优先使用 `failedReason.exception_message`
  - `pumpQueuedTasks`、`pumpTask`、`handleWebhook` 已统一改用详细失败原因
- 修复单应用页空会话兜底：
  - `src/app/(workspace)/apps/[code]/page.tsx` 在无 session 时直接 `redirect('/login')`
  - 不再因 `session!` 触发页面空指针
- 执行验证：
  - `npm test -- src/lib/runninghub.test.ts`
  - `npm test -- src/lib/session.test.ts src/lib/runninghub.test.ts src/components/results-panel.test.tsx src/components/app-showcase-gallery.test.tsx`
  - `npx eslint src/lib/session.ts src/lib/session.test.ts src/lib/runninghub.ts src/lib/runninghub.test.ts src/lib/task-queue.ts "src/app/(workspace)/apps/[code]/page.tsx"`
  - Playwright 实测 `/tasks` 与 `/apps/2012848202482978818`
  - 页面已可见 `WB-000008 / WB-000009`，并显示“显存不足”详细提示

下一步：

- 如果还要继续提交同类任务，优先从降低分辨率、减少生成负载或切换大显存模式入手，当前这两条失败属于第三方工作流显存耗尽，不是站内提交链路错误

## 2026-03-25 03:20:00

- 修复恢复后旧登录态导致的任务提交报错：
  - 现象：`prisma.task.create()` 因 `createdById` 外键不存在而失败
  - 根因：浏览器残留的旧 session cookie 只通过 JWT 校验，没有再校验当前 SQLite 恢复库里是否存在该用户
- 先按 TDD 补充 `src/lib/session.test.ts`：
  - 覆盖“cookie 缺失 / token 有效但用户已不存在 / 用户存在且有效”三个场景
  - 确认红灯后再改实现
- 更新 `src/lib/session.ts`：
  - `getCurrentSession()` 在验完 token 后，再从数据库读取用户
  - 用户不存在、未启用或已软删除时直接返回 `null`
  - 有效用户则以数据库当前值返回会话信息
- 执行验证：
  - `npm test -- src/lib/session.test.ts`
  - `npx eslint src/lib/session.ts src/lib/session.test.ts`
  - `npm test -- src/lib/session.test.ts src/components/results-panel.test.tsx src/components/app-showcase-gallery.test.tsx`
  - Playwright 实测 `http://127.0.0.1:3000/login` 可重新登录并进入旧数据应用页
- 清理验证过程中误触发的两条新任务：
  - 删除 `WB-000008`、`WB-000009`
  - 删除对应 `TaskAsset` / `SyncLog` 记录与 `public/assets` 本地输入图目录
  - 任务总数已恢复回 `7`

下一步：

- 如用户继续测试提交任务，优先观察第三方提交通道本身是否可用；当前“旧 cookie 撞外键”这一层已修掉

## 2026-03-25 03:32:00

- 定位到 `1.11` 在本机 `next dev` 模式下的数据库报错根因：
  - 仓库 `.env` 仍保留后续版本的 Postgres 配置
  - `1.11` 代码基线仍使用 SQLite Prisma 适配器
  - 导致开发模式访问页面时出现 `Cannot open database because the directory does not exist`
- 新增本机专用 `.env.local`：
  - `APP_URL=http://127.0.0.1:3000`
  - `DATABASE_URL=file:D:/2.文档/5.AI编程项目/5.内部AI网站/ai-workbench/dev.db`
- 目的：
  - 让 `1.11` 在 `npm run dev` 与本地浏览器直接访问 `3000` 时都稳定落到旧 SQLite 数据
  - 避免再次被仓库内的 Postgres `.env` 串扰

下一步：

- 停掉错误的 `next dev` 进程并在 `3000` 上重新启动正确的 `1.11` 开发服务
- 复测 `/apps` 与 `/apps/all-in-one-image-2`

## 2026-03-25 03:05:00

- 恢复前快照已创建：
  - `restore-snapshots/20260325-025706-before-restore-1.11/`
  - 已备份 `HEAD`、git 状态、数据库文件和当前未跟踪运行日志
- 工作区已切到：
  - 分支：`codex/restore-1-11-case-results`
  - 目标提交：`0912160`
  - 时间：`2026-03-24 23:39:14`
- 完成单应用页中间区改造：
  - 不再把案例展示作为 `WorkbenchLayout` 外层独立模块
  - 案例展示已并入中间主区上半部分
  - 结果工作区保留原有主图、多图缩略、参考图、下载、一键同款和刷新能力
  - 中间区新增显式标题：`结果工作区 / 当前任务结果`
- 完成兼容性修补：
  - 为 `yazl` 新增本地类型声明 `src/types/yazl.d.ts`
  - 避免 `1.11` 在当前依赖环境下因缺失声明卡住构建
- 执行验证：
  - `npm install --no-package-lock`
  - `npm test -- src/components/results-panel.test.tsx src/components/app-showcase-gallery.test.tsx`
  - `npx eslint "src/types/yazl.d.ts" "src/components/results-panel.tsx" "src/components/results-panel-client.tsx" "src/components/app-showcase-gallery.tsx" "src/components/app-workbench-client.tsx" "src/components/results-panel.test.tsx" "src/components/app-showcase-gallery.test.tsx"`
  - `DATABASE_URL=file:./dev.db npm run build`
  - `DATABASE_URL=file:./dev.db npm run start -- --hostname 127.0.0.1 --port 3102`
  - Playwright 实测 `/apps/all-in-one-image-2` 与 `/tasks/cmn4lgumk0005twu64h9zrwkb`

下一步：

- 你先看 `1.11` 这版页面和流程是否就是你更想要的方向
- 如果还要继续回退，就从 `1.10` 两个版本点里再挑一个更早恢复

## 2026-03-24 23:20:32

- 新增 Vercel 半自动部署第二版：
  - `scripts/deploy-vercel.mjs`
  - `src/lib/vercel-deploy.mjs`
  - `.env.vercel.example`
  - `package.json` 中的 `deploy:vercel*` 脚本
- 部署脚本已支持：
  - 读取 `.env` 文件
  - 校验 `VERCEL_*` 与应用环境变量
  - 自动写入 `.vercel/project.json`
  - 自动执行 `vercel pull`
  - 自动同步环境变量到 Vercel
  - 自动执行本地 `npm run build`
  - 自动执行 `vercel deploy`
- 已加入安全护栏：
  - 允许当前 SQLite 分支做 `preview/demo` 部署
  - 阻止 `SQLite + production` 组合，避免误把不适合正式环境的版本直接发到 Vercel 正式环境
- 已补 README 使用说明，包含：
  - 如何复制模板
  - 如何 dry-run
  - 如何预览部署
  - 每个参数去哪里获取
- 执行验证：
  - `npm test -- src/lib/vercel-deploy.test.ts`
  - `node scripts/deploy-vercel.mjs --help`
  - `node scripts/deploy-vercel.mjs --target preview --env-file .env.vercel.example --dry-run`
  - `npm run build`

下一步：

- 如果要真正做到“一键正式部署”，下一步要把当前仓库的数据底座从 SQLite 切到 Postgres
- 你提供真实 Vercel / RunningHub / Feishu 参数后，可以直接按 README 跑预览部署

## 2026-03-24 20:05:00

- 完成单应用提交区最终收口
  - `清空` 从底部移到 `参考图输入` 标题右侧
  - 底部移除独立费用卡与并列双按钮布局
  - 提交区只保留一个双行主按钮：`提交任务 / 预计￥XX元`
- 更新 `submit-form` 定向测试，覆盖顶部清空入口和双行按钮金额展示
- 执行验证
  - `npx vitest run src/components/submit-form.test.tsx`
  - `npx eslint "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/components/submit-form.test.tsx"`
  - `bun run build`

下一步：

- 用真实浏览器确认窄侧栏下双行提交按钮的字重、行距和点击面积是否还要微调

## 2026-03-24 19:35:00

- 完成单应用模板与后台高频入口乱码修复
  - 修正 `submit-form` 中的 `提示词模板 / 清空模板 / 清空草稿 / 提交任务 / 上传中...` 等关键文案
  - 修正 `app-form-editor` 中应用基础信息、标签管理、展示配置、API 节点配置、同步配置与解析弹窗的大量乱码
- 完成单应用提交区强化
  - 将 `预计费用` 收进底部 `提交任务` 卡片
  - 金额放到提交按钮下方单独展示，并提升字重和对比度
- 完成任务中心列表结果预览
  - 新增 `结果预览` 列
  - 点击缩略图可直接打开 lightbox
  - 点击站内编号和应用名可进入任务详情页
- 完成菜单与蓝底按钮可读性修复
  - 全局 `a` 改为默认继承颜色
  - 左侧导航激活态显式锁定白字
- 执行验证
  - `npx vitest run src/components/submit-form.test.tsx src/components/admin-tasks-client.test.tsx src/components/results-panel.test.tsx src/components/task-output-download-actions.test.tsx`
  - `npx eslint "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/components/admin-tasks-client.tsx" "src/components/workbench-shell.tsx" "src/components/app-form-editor.tsx" "src/components/submit-form.test.tsx" "src/components/admin-tasks-client.test.tsx"`
  - `rg -n "鎻|鍩|鍚|鏇|娓|鍓|椤|鍙栨秷|淇濆瓨|鏍囩|搴旂敤|涓嬫媺" src --glob '!**/*.test.*'`
  - `bun run build`

下一步：

- 用真实浏览器重点回归单应用页提交卡、左侧导航激活态和任务中心缩略图预览
- 如继续打磨，统一收口全站 toast 和操作反馈语义

## 2026-03-23 19:58:00

- 微调单应用页参考图槽位标识
  - 恢复显示“主参考图 / 辅助图”语义标签
  - 标签位置改为槽位下方，避免重新压回图片内容区
  - 主参考图使用更显眼的蓝色标签，辅助图保持弱化灰色标签
- 保持上一轮的收口结果
  - 不恢复清空按钮
  - 不恢复“点击替换”等覆盖文案
  - 已上传图片继续支持整块点击替换
- 执行验证
  - `npx vitest run src/components/submit-form.test.tsx`
  - `npx eslint "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/components/submit-form.test.tsx"`

下一步：

- 如继续打磨参考图区，可优先看标签与图片之间的垂直间距是否还需要再压一点

## 2026-03-23 19:54:00

- 收口单应用页参考图输入槽位的视觉噪音
  - 移除已上传图片上的底部渐变文案层和“点击替换”提示
  - 移除右上角“清空”按钮，避免三列缩略图在窄栏中互相挤压
  - 保留整块图片槽位点击重新选择文件的能力，已上传图片仍可直接替换
- 同步更新 `src/components/submit-form.test.tsx`
  - 删除依赖清空按钮的旧断言
  - 新增“已上传图片可再次替换”与“槽位不再显示可见文案/清空按钮”的回归测试
- 执行验证
  - `npx vitest run src/components/submit-form.test.tsx`
  - `npx eslint "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/components/submit-form.test.tsx"`

下一步：

- 如继续打磨左栏体验，优先看三列图片槽位在真实浏览器下的点击热区和 hover 反馈是否还需要再压一层

## 2026-03-23 18:31:47

- 完成单应用模板瘦身与全站任务侧栏改造
  - 顶栏接入单应用专用 header slot，把“返回应用列表 + 应用名”挂到全局导航
  - 移除页面内 `Workbench` 头卡和左侧 `Workspace` 说明卡，单应用页只保留三栏主结构
  - 右侧任务区改为当前用户的全站任务流，展示结果图、站内任务编号、状态、应用名、时间、耗时和一键同款
  - 跨应用任务支持查看结果，但“一键同款”仅允许当前应用复用，避免写回不兼容字段
- 完成任务编号链路升级
  - `Task` 新增 `siteTaskNo`，格式固定为 `WB-000001`
  - 提交任务时先分配 `siteTaskNo`，再写入队列和第三方任务链路
  - 新增 Prisma 迁移为历史任务回填站内编号
  - `providerTaskId` 改为任务所有者和管理员可见
- 完成针对性验证
  - 通过 `npx vitest run src/components/use-app-tasks.test.tsx src/components/results-panel.test.tsx src/components/recent-results-panel.test.tsx src/components/submit-form.test.tsx src/lib/db/tasks.test.ts src/lib/db/users.test.ts src/lib/feishu-sync-jobs.test.ts`
  - 通过 Workbench 相关 `eslint`
  - 通过 `bun run build`

下一步：

- 观察全站任务侧栏在真实高任务量下是否需要分页或虚拟列表
- 如需继续打磨体验，优先补“按应用筛选 / 失败任务强调 / 长列表滚动定位”这一类增强，而不是回退到旧的单任务卡

# 项目进度日志

## 2026-03-23 15:40:00

- 完成素材大厅与素材管理的体验重构落地
  - `素材大厅` 改成卡片内直接嵌入视频预览，保留完整预览为次级动作
  - `素材管理` 改成筛选优先的列表工作台，批量工具栏只在有选中项时显示
  - 单条素材操作改为“查看”入口，并落到右侧详情抽屉
- 同步补齐并跑通前端测试
  - `npx vitest run src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx`
- 修复本轮构建中暴露的两个类型问题
  - `MaterialHallClient` 卡片 ref 类型
  - `ThreeColumnLayout` 缺失 `selectedTask`
- 重新通过 `bun run build`

下一步：

- 用真实浏览器回归桌面悬停播放与手机端主视区自动播放
- 继续打磨素材管理详情抽屉里的信息密度和批量操作反馈

## 2026-03-23 14:35:00

- 处理 Phase 4 留下的已知残余项：素材大厅首屏预览 `404` 控制台噪音
  - 根因确认：`src/components/material-hall-client.tsx` 在卡片列表阶段就渲染 `<video src="/api/internal/materials/[id]/preview">`
  - 结果：历史预览文件缺失时，即使用户没有打开预览，也会在列表页主动打出受控 `404`
  - 修复方式：
    - 列表卡片改为静态封面层，不再预加载预览资源
    - 预览资源仅在用户真正打开预览弹层时加载
    - 补充预览文件缺失时的友好降级提示
  - 同步更新 `src/components/material-hall-client.test.tsx` 回归测试
 - 执行验证：
   - `npx vitest run src/components/material-hall-client.test.tsx`
   - `bun run build`
   - `Playwright CLI` 登录后进入 `/assets`，控制台结果：`Total messages: 0 (Errors: 0, Warnings: 0)`
   - 验证证据已归档到 `output/playwright/materials-residual-fixed-console.log`

下一步：

- 如需继续增强用户体验，可再单开一轮任务，把“预览文件缺失时的后台资源修复流程”补成运营工具
## 2026-03-23 14:21:29

- 完成 `Phase 4`：全站回归验收和治理规范固化
  - 新增 `docs/governance/20-phase4-regression-report.md`
  - 新增 `docs/governance/21-governance-guardrails.md`
  - 新增 `docs/governance/22-extension-admission-rules.md`
  - 同步更新 `docs/governance/README.md`、项目 `README.md`
- 执行验收：
  - 启动本地生产服务 `bun run start -- --hostname 127.0.0.1 --port 3000`
  - 使用 `Playwright CLI` 实测登录、工作台、站点设置、集成设置、密钥状态、素材大厅、素材管理、任务中心
  - 补做 `390 x 844` 移动端壳层导航验证
  - 归档浏览器证据到 `output/playwright/phase4/`
  - 重新执行配置中心定向测试与 `bun run build`
- 本轮结论：
  - `Phase 4` 通过，带已记录残余风险
  - 残余风险为历史素材预览文件缺失导致的受控 `404` 控制台错误，已写入正式报告

下一步：

- 后续新页面和新配置项按 `21-governance-guardrails.md` 与 `22-extension-admission-rules.md` 执行
- 如果继续消除残余风险，可单开任务处理素材预览缺失文件的清理或兜底展示
## 2026-03-23 15:25:00

- 继续推进 `Phase 2` 第五批后台交互实施：
  - 将 `src/components/admin-materials-client.tsx` 中剩余原生弹窗收敛为共享确认/表单对话框
    - 标签删除
    - 单条重置回公海
    - 单条删除素材
    - 批量重置回公海
    - 批量删除素材
  - 将 `src/components/app-form-editor.tsx` 中的标签管理器删除确认和应用删除确认收敛为共享确认对话框
- 执行验证：
  - `bun run build`
  - 结果：通过

下一步：

- 继续检查 `category-manager`、`banner-manager` 是否还需要统一共享确认对话框
- 继续推进 `Settings / Editor / Detail Inspection` 模板骨架
- 若 Phase 2 壳层/交互收口已满足预期，可开始评估进入下一段页面模板深化

## 2026-03-23 15:00:00

- 继续推进 `Phase 2` 第四批后台交互实施：
  - 将 `src/components/admin-users-client.tsx` 中的多字段原生 `window.prompt` 收敛为标准表单对话框
    - 编辑资料
    - 改密码
    - 调积分
    - 批量改角色
    - 批量改额度
  - 将 `src/components/admin-prompt-templates-client.tsx` 中的批量分类、标签、范围修改改为标准表单对话框
- 执行验证：
  - `bun run build`
  - 结果：通过

下一步：

- 继续收敛 `src/components/admin-materials-client.tsx` 与 `src/components/app-form-editor.tsx` 中剩余输入型原生弹窗
- 评估是否把 `category-manager`、`banner-manager` 中剩余删除确认也统一接入共享确认对话框
- 继续推进 `Settings / Editor / Detail Inspection` 模板骨架

## 2026-03-23 14:35:00

- 继续推进 `Phase 2` 第三批后台交互实施：
  - 新增 `src/components/form-dialog.tsx` 作为共享表单对话框
  - 替换以下输入型原生 `window.prompt`：
    - `src/components/admin-apps-client.tsx` 的批量改分类、批量改标签
    - `src/components/category-manager.tsx` 的批量改排序
    - `src/components/banner-manager.tsx` 的批量改排序
- 执行验证：
  - `bun run build`
  - 结果：通过

下一步：

- 继续把 `src/components/admin-users-client.tsx` 与 `src/components/admin-prompt-templates-client.tsx` 的多字段 prompt 改成标准表单对话框
- 评估是否将 `category-manager`、`banner-manager`、`app-form-editor` 中剩余删除确认也统一接入共享确认对话框
- 继续推进 `Settings / Editor / Detail Inspection` 模板骨架

## 2026-03-23 14:10:00

- 继续推进 `Phase 2` 第二批结构实施：
  - 将 `src/app/(workspace)/admin/page.tsx`、`src/app/(workspace)/sync/page.tsx`、`src/app/(workspace)/tasks/page.tsx` 接入统一 `PageTemplate`
  - 新增 `src/components/confirm-dialog.tsx` 作为后台共享确认对话框
  - 替换以下页面的删除类原生 `window.confirm`：
    - `src/components/admin-apps-client.tsx`
    - `src/components/admin-prompt-templates-client.tsx`
    - `src/components/admin-users-client.tsx`
  - 修正 `src/components/admin-users-client.tsx` 中单条启停误走 bulk 选择集的问题，改为独立单条更新
- 执行验证：
  - `bun run build`
  - 结果：通过

下一步：

- 继续把输入型 `window.prompt` 收敛到标准表单对话框
- 继续推进 `Settings / Editor / Detail Inspection` 模板骨架
- 评估是否把 `category-manager`、`banner-manager`、`app-form-editor` 也统一接入共享确认对话框

## 2026-03-23 13:25:00

- 开始并完成 `Phase 2` 第一批结构实施：
  - 将 `src/lib/navigation.ts` 升级为分组导航模型
  - 重写 `src/components/workbench-shell.tsx`，让壳层顶部只表达品牌与当前位置，不再承担页面主标题
  - 新增 `src/components/page-template.tsx` 作为统一页面模板骨架
  - 接入第一批高优页面：
    - `/apps`
    - `/admin/apps`
    - `/admin/materials`
    - `/admin/prompt-templates`
    - `/admin/users`
  - 收敛 `WorkbenchLayout`，并将 `ThreeColumnLayout` 变为兼容封装
- 同步调整相关客户端组件：
  - `AppMarketplace`
  - `AdminAppsClient`
  - `AdminPromptTemplatesClient`
  - `AdminUsersClient`
  - 这些组件现在支持以嵌入模板的方式工作，避免重复生成页面级标题
- 执行验证：
  - `bun run build`
  - 结果：通过

下一步：

- 继续把统一模板骨架扩展到 `/tasks`、`/sync`、`/admin` 等剩余高频页面
- 开始替换后台原生 `window.prompt / confirm`，逐步统一到标准对话框交互
- 继续推进 `Settings / Editor / Detail Inspection` 模板的实现层收口

## 2026-03-23 12:32:00

- 启动并完成“网站治理与分层重构计划”的 `Phase 1` 结构设计文档：
  - 新建 `docs/governance/10-information-architecture.md`
  - 新建 `docs/governance/11-page-template-system.md`
  - 新建 `docs/governance/12-config-center-design.md`
  - 新建 `docs/governance/13-page-inventory-migration.md`
- 基于当前仓库现状，明确了 `Phase 2` 之前必须冻结的结构设计：
  - 用户侧与管理侧导航需要分层，`/tasks` 不再作为普通成员基础导航项
  - 页面需统一收敛到 `Dashboard / Browse / Workbench / Management List / Editor / Settings / Detail Inspection` 七类模板
  - 配置中心分为站点配置、集成配置和密钥状态，敏感密钥继续 env 优先
  - 当前页面已完成模板归类与迁移优先级梳理
- 同步更新 `docs/governance/README.md` 和项目 `README.md`，让治理文档入口指向 `Phase 1` 成果

下一步：

- 等当前其他开发改动稳定后，从 `Phase 2` 开始改壳层、导航、标题体系和统一模板骨架
- Phase 2 实施前先对照 `docs/governance/13-page-inventory-migration.md` 锁定第一批迁移页面

## 2026-03-23 12:10:00

- 启动“网站治理与分层重构计划”的 `Phase 0` 正式文档化：
  - 新建 `docs/governance/README.md`
  - 新建 `docs/governance/00-charter.md`
  - 新建 `docs/governance/01-current-state-audit.md`
  - 新建 `docs/governance/02-boundaries-principles.md`
  - 新建 `docs/governance/03-roadmap.md`
  - 新建 `docs/governance/04-verification-baseline.md`
- 基于当前仓库事实固定本轮治理结论：
  - 当前问题属于系统级治理问题，核心集中在导航平铺、模板不统一、工作台骨架重复、配置分散和后台交互原始
  - 本次治理按“分层重构，不重写核心业务”推进，优先保护 AI 应用、素材大厅、Feishu 同步和 RunningHub 集成
- 同步更新 `README.md`、`memory.md`，把治理入口与长期规则写入项目状态文档

下一步：

- 待当前其他开发改动稳定后，从 `Phase 1` 开始输出信息架构、页面模板体系和配置中心边界设计
- 后续实施前，先严格对照 `docs/governance/02-boundaries-principles.md` 与 `docs/governance/04-verification-baseline.md`

## 2026-03-23 11:40:41

- 完成后台列表统一 CRUD 与批量管理的第一阶段落地：
  - 新增统一批量类型、汇总工具与批量接口约定
  - 新增 `apps/users/prompt-templates/categories/banners/app-tags` 批量数据层方法
  - 新增对应后台 `bulk` 路由
  - 抽出 `use-list-selection` 与 `admin-bulk-toolbar`
  - 改造 `/admin/apps`、`/admin/users`、`/admin/categories`、`/admin/banners`
- 修复构建过程中的中断问题：
  - 补回缺失的 `src/components/admin-users-client.tsx`
  - 恢复 `src/components/admin-prompt-templates-client.tsx` 到可构建状态，避免模板页因中途改造中断而丢失
- 验证结果：
  - `bun run build` 通过
  - `bun test` 未通过，失败主要来自仓库现有测试基础设施与 Bun/Prisma 兼容问题，不是本轮列表 bulk 改造独有回归

下一步：

- 继续完成提示词模板列表的批量前端入口
- 把应用标签、提示词标签、模板分类升级成统一管理器
- 针对本轮新增 bulk 路由补更聚焦的路由/组件测试，绕开当前 Bun + Prisma 测试环境噪音
## 2026-03-23 11:14:12

- 完成素材大厅移动优先重构：
  - 页面改为移动优先布局，手机端单列大卡流，桌面端高密度网格。
  - 新增搜索框、标签 chips、URL 驱动筛选。
  - 卡片信息收敛为标题、标签、时长、日期。
  - 预览层改为手机全屏视频 + 底部信息抽屉，桌面端大画面 + 信息侧栏。
- 在数据层新增“当前可领取视频素材标签聚合”查询，用于素材大厅标签筛选。
- 重写 `src/app/(workspace)/assets/page.tsx` 和 `src/components/material-hall-client.tsx`，清理旧页面中的乱码和低密度布局。
- 新增 `src/components/material-hall-client.test.tsx`，并补充 `src/lib/db/materials.test.ts` 的标签聚合测试。
- 补回缺失的 `src/components/admin-users-client.tsx`，恢复 `/admin/users` 页面和全量构建可用状态。
- 修复 `src/lib/material-storage.ts` 中本地私有素材路径解析过于乐观的问题，避免预览文件缺失时抛出服务端 `500`。
- 执行验证：
  - `npx vitest run src/lib/db/materials.test.ts src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx src/app/api/internal/admin/material-tags/[id]/route.test.ts src/app/api/internal/admin/materials/bulk/route.test.ts src/app/api/internal/admin/materials/upload/complete/route.test.ts`
  - `bun run build`
  - `npx vitest run src/lib/material-storage.test.ts src/lib/db/materials.test.ts src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx src/app/api/internal/admin/material-tags/[id]/route.test.ts src/app/api/internal/admin/materials/bulk/route.test.ts src/app/api/internal/admin/materials/upload/complete/route.test.ts`
  - `bun run build`

下一步：

- 继续排查本地浏览器联调中暴露的运行时异常，再完成手机视口和桌面宽屏的最终真机回归。
- 根据实际素材量评估是否需要二期补充排序、分页或更多标签筛选策略。

## 2026-03-22 23:15:38

- 完成素材后台管理重构，修复批量上传“上传请求格式不正确”的问题。
- 上传改为前端逐文件提交、后端逐条返回结果的稳定链路。
- 补齐视频标签 CRUD、素材批量操作与标签联动规则。
- 重写 `src/components/admin-materials-client.tsx`，补上上传弹窗、标签管理、批量工具栏、单条编辑弹窗。
- 修复 `src/app/(workspace)/admin/materials/page.tsx` 的乱码和损坏 JSX。
- 执行验证：
  - `npx vitest run src/lib/db/materials.test.ts src/app/api/internal/admin/material-tags/[id]/route.test.ts src/app/api/internal/admin/materials/bulk/route.test.ts src/app/api/internal/admin/materials/upload/complete/route.test.ts src/components/admin-materials-client.test.tsx`
  - `bun run build`

下一步：

- 做一轮后台真实联调，重点验证批量上传、批量重置回公海和标签重命名后的筛选联动。
## 2026-03-23 12:20:00

- 完成提示词模板后台列表重构收口：
  - 重写 `src/components/admin-prompt-templates-client.tsx`
  - 接回模板列表的搜索、筛选、批量管理和编辑入口
  - 补齐提示词标签管理器与模板分类管理器
- 完成应用编辑页标签管理器升级：
  - 在 `src/components/app-form-editor.tsx` 中新增“管理标签”弹层
  - 支持应用标签新增、编辑、删除、批量删除
  - 标签变更会同步回写当前应用的已选标签
- 执行验证：
  - `bun run build`

下一步：

- 补更聚焦的自动化测试，优先覆盖提示词模板 bulk 入口和应用标签管理器交互
- 视需要继续统一 Banner / 分类 / 应用页中的子列表管理体验细节
## 2026-03-23 12:30:00

- 继续完成素材大厅本地运行时异常排查与真机回归：
  - 确认生产模式 `next start` 下，标签筛选与预览抽屉交互正常
  - 调整 `src/components/material-hall-client.tsx` 的移动端头部、筛选区和卡片尺寸
  - 将桌面宽屏网格修正为真实 5 列
  - 用浏览器实测确认 `390x844` 下首屏可容纳 2 张完整卡片并为第 3 张预留露头空间
- 顺手修复阻塞构建的 `src/components/admin-prompt-templates-client.tsx` 损坏问题，恢复 `/admin/prompt-templates` 页面可构建状态
- 执行验证：
  - `npx vitest run src/components/material-hall-client.test.tsx`
  - `npx vitest run src/components/material-hall-client.test.tsx src/lib/material-storage.test.ts src/lib/db/materials.test.ts src/components/admin-materials-client.test.tsx src/app/api/internal/admin/material-tags/[id]/route.test.ts src/app/api/internal/admin/materials/bulk/route.test.ts src/app/api/internal/admin/materials/upload/complete/route.test.ts`
  - `bun run build`

下一步：

- 如果需要继续消除 console 噪音，下一步可专门处理历史素材预览文件缺失导致的 `/preview` 404
- 如果要继续优化移动端体验，下一轮可以补“排序”和“更多标签筛选”的轻量增强
## 2026-03-23 13:40:00

- 完成 Phase 2 最后一批后台原生确认弹窗收口：
  - `src/components/category-manager.tsx`
  - `src/components/banner-manager.tsx`
- 将分类管理和 Banner 管理中的单条删除、批量删除统一切换到共享 `ConfirmDialog`
- 复查 `src/components` 后确认不再存在 `window.confirm / window.prompt`
- 执行验证：
  - `rg -n "window\\.(confirm|prompt)" src/components`
  - `bun run build`
- 结果：
  - 原生弹窗检索为空
  - 构建通过

下一步：

- 进入下一阶段，补齐 `Settings / Editor / Detail Inspection` 模板骨架
- 评估是否开始 Phase 3 的配置中心与功能整合
## 2026-03-23 14:10:00

- 继续推进 Phase 2 模板深化：
  - 将 `src/app/(workspace)/admin/apps/new/page.tsx` 接入统一 `PageTemplate`
  - 将 `src/app/(workspace)/admin/apps/[code]/page.tsx` 接入统一 `PageTemplate`
  - 将 `src/app/(workspace)/admin/settings/feishu/page.tsx` 接入统一 `PageTemplate`
  - 将 `src/app/(workspace)/tasks/[id]/page.tsx` 接入统一 `PageTemplate`
- 为 `src/components/app-form-editor.tsx` 新增 `embedded` 模式，回收页面级标题职责，避免 Editor 模板与编辑器组件重复生成页头
- 执行验证：
  - `bun run build`
- 结果：
  - 构建通过

下一步：

- 继续推进第三批模板页：`/assets`、`/profile`、`/admin/categories`、`/admin/banners`
- 视需要评估是否从 `PageTemplate` 进一步抽出更显式的 `Settings / Detail` 模板壳层
## 2026-03-23 14:35:00

- 继续推进 Phase 2 第三批模板页：
  - 将 `src/app/(workspace)/assets/page.tsx` 接入统一 `PageTemplate`
  - 将 `src/app/(workspace)/profile/page.tsx` 接入统一 `PageTemplate`
  - 将 `src/app/(workspace)/admin/categories/page.tsx` 接入统一 `PageTemplate`
  - 将 `src/app/(workspace)/admin/banners/page.tsx` 接入统一 `PageTemplate`
- 为 `src/app/(workspace)/profile/client.tsx` 补充 `embedded` 接口占位，先保证页面模板接入不阻塞
- 执行验证：
  - `bun run build`
- 结果：
  - 构建通过

下一步：

- 继续净化 `MaterialHallClient` 与 `ProfileClient` 的内部页头，避免模板接入后仍保留重复标题语义
- 评估是否需要为 Browse / Profile 拆出更明确的模板槽位
## 2026-03-23 14:55:00

- 继续推进 Phase 2 的页头净化：
  - 将 `src/components/material-hall-client.tsx` 的内部页头收敛到 `embedded` 模式
  - 将 `src/app/(workspace)/profile/client.tsx` 的内部页头收敛到 `embedded` 模式
- 本轮重点不再只是页面接入模板，而是让内容组件也遵守“页面级标题归模板层”这一边界
- 执行验证：
  - `bun run build`
- 结果：
  - 构建通过

下一步：

- 评估 Phase 2 是否达到可收尾状态
- 如果继续推进，优先整理 `PageTemplate` 的细分槽位和配置中心入口
## 2026-03-23 16:40:00

- 完成 Phase 3 配置中心落地：
  - 新增 `SiteSettings / IntegrationSettings` Prisma 模型与迁移目录
  - 新增 `src/lib/site-config.ts` 与 `src/lib/settings.ts`
  - 新增站点设置、集成设置、密钥状态三个后台页面与对应 API
  - 将工作台壳层、浏览器 metadata、登录页品牌展示切到统一站点配置
  - 将 `RunningHub / Feishu` 基础地址切到统一集成设置读取
  - 将旧 `/admin/settings/feishu` 页面收敛为跳转到 `/admin/settings/integrations`
- 完成 Phase 2 / Phase 3 收口验证：
  - `bun run prisma:generate`
  - `bun run prisma:push`
  - `bun test src/app/api/internal/admin/settings/site/route.test.ts src/app/api/internal/admin/settings/integrations/route.test.ts src/app/api/internal/admin/settings/secrets/route.test.ts`
  - `bun run build`

下一步：

- 如果继续进入 Phase 4，可开始做全站回归清单执行与治理规范固化
- 如果继续做产品层优化，可从站点设置里再补更细的首页文案、Logo 和主题 token 管理
## 2026-03-23 15:50:00

- 完成 Workbench 模板重构首版落地
  - 重写 `src/components/workbench-layout.tsx`，统一三栏骨架、页头信息、面板折叠与移动端/平板端退化策略
  - 重写 `src/components/app-workbench-client.tsx` 与 `src/components/use-app-tasks.ts`，补齐“选中任务 <-> URL <-> SSE 刷新”同步链路
  - 重排 `src/app/(workspace)/apps/[code]/submit-form.tsx`，将左栏整理为任务发起面板，并增加“更多参数”折叠
  - 重写 `src/components/results-panel.tsx`，将中栏改为状态条、主结果区、操作区、输入摘要和缩略带的固定结构
  - 重写 `src/components/recent-results-panel.tsx`，将右栏改为“当前任务 + 最近任务”轻量队列
  - 补充 `src/components/use-app-tasks.test.tsx`，并更新工作台相关测试
- 完成本轮验证
  - `npx vitest run src/components/use-app-tasks.test.tsx src/components/submit-form.test.tsx src/components/recent-results-panel.test.tsx`
  - `npx eslint "src/components/app-workbench-client.tsx" "src/components/left-panel.tsx" "src/components/recent-results-panel.tsx" "src/components/results-panel.tsx" "src/components/results-panel-client.tsx" "src/components/use-app-tasks.ts" "src/components/workbench-layout.tsx" "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/components/recent-results-panel.test.tsx" "src/components/submit-form.test.tsx" "src/components/use-app-tasks.test.tsx"`
  - `bun run build`

下一步：

- 用真实浏览器回归 `/apps/[code]`，重点确认桌面三栏、平板历史抽屉和手机覆盖面板的实际手感
- 视体验结果决定是否继续压缩右栏信息密度，或补一轮任务队列筛选/分组

## 2026-03-23 16:05:00

- 完成 Workbench 真实浏览器回归
  - 以生产态 `bun run start -- --hostname 127.0.0.1 --port 3101` 作为回归环境，绕开开发态 HMR 噪音
  - 使用 Playwright CLI 登录 `admin / admin123`，访问 `/apps/all-in-one-image-2`
  - 验证桌面端三栏：
    - 左栏折叠后中栏稳定扩展
    - 右栏折叠后中栏稳定扩展
    - 点击历史任务后，URL `task` 参数切换到新任务
  - 验证平板端：
    - 右栏不再常驻，改为“任务历史”抽屉
    - 抽屉可打开、关闭并显示当前任务和最近任务
  - 验证手机端：
    - 默认中栏结果区优先
    - “任务发起”和“任务历史”都以覆盖面板方式打开
  - 检查生产态控制台与网络：
    - console `0 error / 0 warning`
    - 关键请求均返回 `200`
  - 归档截图：
    - `output/playwright/workbench-desktop-fullpage.png`
    - `output/playwright/workbench-desktop-collapsed.png`
    - `output/playwright/workbench-tablet.png`
    - `output/playwright/workbench-mobile.png`

下一步：

- 如果继续优化体验，优先看手机端结果区里的长 Prompt 摘要密度，以及右栏任务卡在任务很多时的筛选/分组策略
## 2026-03-23 16:10:00

- 完成素材大厅与素材管理二次桌面化调整：
  - 将 `src/components/material-hall-client.tsx` 的 inline video 改为完整画面可见的自适应播放
  - 将素材大厅声音按钮改成真正的全大厅双向切换，支持打开后再次关闭
  - 将 `src/components/admin-materials-client.tsx` 的筛选区继续收敛为更明确的桌面横向表单
  - 将批量上传弹窗改造成“上传设置 + 标签库 + 上传队列表格”的横向工作台
  - 将上传弹窗内标签管理从竖向卡片堆叠改为横向表格
- 更新组件测试：
  - `src/components/material-hall-client.test.tsx`
  - `src/components/admin-materials-client.test.tsx`
- 执行验证：
  - `npx vitest run src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx`
  - `bun run build`
- 结果：
  - 测试通过
  - 构建通过

下一步：

- 如需继续确认真实体验，可补一轮浏览器回归，重点看桌面端 hover 播放、声音切换和上传弹窗横向布局手感
- 如需继续精简后台操作路径，可再评估领取日志是否需要增加更多桌面端列筛选
## 2026-03-23 16:25:00

- 继续修正素材大厅细节交互：
  - 手机端滚动下滑后自动隐藏“筛选素材”板块
  - 桌面端支持点击卡片封面区域直接打开完整预览
  - 预览遮罩层支持点击空白区域关闭
  - inline video 改为首帧优先展示，移除卡片内 `poster` 依赖并改为 `preload="auto"`
- 更新 `src/components/material-hall-client.test.tsx`
  - 补充手机端滚动隐藏筛选区测试
  - 补充点击封面打开预览、点击遮罩关闭测试
  - 补充首帧展示相关断言
- 执行验证：
  - `npx vitest run src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx`
  - `bun run build`
- 结果：
  - 测试通过
  - 构建通过

下一步：

- 如需继续验收真实体验，可补一轮浏览器回归，重点看桌面端卡片首帧加载速度与手机端筛选栏收起时机
## 2026-03-23 16:33:00

- 收口素材大厅完整预览弹窗的点击关闭规则：
  - 移除桌面端整块弹层容器的统一 `stopPropagation`
  - 改为只在视频本体、正文信息区和明确交互按钮上阻止冒泡
  - 桌面端黑色留白、右侧信息栏空白和遮罩外圈统一恢复为可关闭区域
  - 移动端同步沿用“内容区不关闭、留白可关闭”的边界
- 更新 `src/components/material-hall-client.test.tsx`
  - 补充桌面端黑色留白关闭测试
  - 补充右侧信息空白关闭测试
  - 补充正文点击不误关测试
- 执行验证：
  - `npx vitest run src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx`
  - `bun run build`
- 结果：
  - 测试通过
  - 构建通过

下一步：

- 如需继续确认体验，可补一轮真实浏览器回归，重点验证弹层各区域点击命中与视频控件不误触关闭
## 2026-03-23 17:05:00

- 完成单应用模板 UX 重构落地
  - `src/components/app-workbench-client.tsx` 改为“最新任务 + 结果就地更新 + 再次生成回填”的工作流
  - `src/components/workbench-layout.tsx` 压缩顶部信息，固定三栏骨架，保留面板折叠与抽屉退化
  - `src/app/(workspace)/apps/[code]/submit-form.tsx` 加入应用级草稿持久化、清空草稿、底部常驻提交条、低频参数折叠
  - `src/components/results-panel.tsx` 改为默认折叠输入摘要，并补齐“再次生成”入口
  - `src/components/recent-results-panel.tsx` 收敛为单张最新任务卡，不再展示当前/最近双分组
- 更新并跑通相关测试
  - `npx vitest run src/components/use-app-tasks.test.tsx src/components/recent-results-panel.test.tsx src/components/results-panel.test.tsx src/components/submit-form.test.tsx`
- 重新通过生产构建
  - `bun run build`

下一步：

- 用真实浏览器回归 `/apps/[code]`，确认桌面、平板、手机三种视口下一屏闭环是否真的成立
- 继续观察顶部状态条和右侧最新任务卡是否还能再压缩信息密度

## 2026-03-23 17:25:00

- 完成单应用模板的真实浏览器回归
  - 启动生产态站点到 `http://127.0.0.1:3102`
  - 使用 Playwright CLI 登录 `admin / admin123`
  - 回归 `/apps/all-in-one-image-2` 的桌面、平板、手机三种视口
  - 归档截图到 `output/playwright/`
    - `workbench-ux-desktop.png`
    - `workbench-ux-tablet.png`
    - `workbench-ux-tablet-drawer.png`
    - `workbench-ux-mobile.png`
    - `workbench-ux-mobile-input-drawer.png`
  - 确认生产态控制台 `0 error / 0 warning`
- 浏览器回归中发现并修复草稿恢复缺口
  - 问题：从应用页离开再返回时，Prompt 能恢复，但 select 参数会掉回默认值
  - 修复：`src/app/(workspace)/apps/[code]/submit-form.tsx` 在挂载后再次从 `localStorage` 做一次客户端草稿回填，覆盖 SSR/路由返回场景
- 重新通过验证
  - `npx vitest run src/components/submit-form.test.tsx`
  - `bun run build`

下一步：

- 评估顶部状态区和右侧最新任务卡是否还能再压一层信息密度
- 如果继续优化体验，优先考虑减少首屏纵向留白，而不是再增加新的状态区块

## 2026-03-23 17:28:00

- 修复单应用页 `SubmitForm` 的 hydration mismatch
  - 根因：组件初始 render 直接读取 `localStorage`，服务端首屏和客户端首屏结构不一致，图片槽位会从 `button` 变成预览 `div`
  - 修复：把首屏初始状态改回 SSR 稳定默认值，只在客户端挂载后读取草稿并回填
  - 同时保留草稿恢复能力，包括文本、下拉参数和远程图片预览
- 调整 `src/components/submit-form.test.tsx`
  - 让草稿恢复测试按真实挂载时序等待 effect 回填，而不是假设首帧就恢复
- 重新通过验证
  - `npx vitest run src/components/submit-form.test.tsx`
  - `bun run build`

下一步：

- 如继续观察开发态日志，重点看 `/apps/[code]` 是否还有新的 hydration warning
- 后续新增客户端草稿能力时，默认遵守“SSR 首帧稳定，挂载后再恢复”的约束
## 2026-03-23 17:37:47

- 修复应用配置删除失败：
  - 新增级联删除 helper，删除应用时同步清理任务、同步日志、素材记录和积分记录
  - 单删与批量删除统一复用删除逻辑
- 修复新建应用同步配置：
  - 新建页默认加载站点级飞书字段映射到 `syncMappingJson`
  - `AppFormEditor` 支持 `defaultSyncMappingJson`
- 修复新建应用 404：
  - 默认 `code` 改为 ASCII 安全生成
  - 创建成功后使用服务端返回 `app.code` 跳转
  - 应用相关链接和删除请求统一做 URL 编码
- 补充测试：
  - `src/lib/db/apps.test.ts`
  - `src/components/app-form-editor.test.tsx`
  - `src/app/api/internal/admin/apps/[code]/route.test.ts`
- 执行验证：
  - `npx vitest run src/lib/db/apps.test.ts src/components/app-form-editor.test.tsx src/app/api/internal/admin/apps/[code]/route.test.ts`
  - `bun run build`

下一步：

- 用真实浏览器回归 `应用配置` 删除、新建应用默认同步配置、创建后跳转详情页三条主链
## 2026-03-23 19:10:00

- 完成单应用页二次精简
  - 移除 Workbench 顶部整排折叠/抽屉控制按钮
  - `WorkbenchLayout` 改为桌面端固定三栏、移动端纵向三段
  - 左侧移除“输入工作台”，`清空草稿` 并入底部提交条
  - 中间移除整个“输入摘要”板块
- 完成全站任务卡方案 C 改造
  - 右栏卡片改为表格式信息排布
  - 新增第三方任务 ID 折叠展开交互
  - 保持跨应用仅可查看结果、不可一键同款
- 完成回归验证
  - 通过 8 个相关测试文件、25 个测试用例
  - 通过相关文件 `eslint`
  - 通过 `bun run build`

下一步：

- 观察真实任务量下右栏卡片密度是否需要分页、筛选或虚拟列表
- 如需继续优化，优先打磨任务卡失败态和超长结果摘要的阅读体验
## 2026-03-23 19:35:00

- 完成单应用页第三轮压缩
  - 参考图区改为三列等宽布局，首列用轻强调表达主参考图
  - 右栏全站任务改为纯信息高密度列表，删除列表项摘要、展开控件和按钮区
  - 任务列表保留缩略图、站内编号、状态、耗时、应用名、时间、第三方 ID
- 完成测试与验证更新
  - 重写 `recent-results-panel.test.tsx`
  - 重写 `submit-form.test.tsx`
  - 补齐三列参考图区与紧凑任务列表断言
  - 通过相关 `vitest`、`eslint`、`bun run build`

下一步：

- 在真实浏览器里确认桌面端右栏实际可见条数是否达到预期的 10 条
- 如果第三方 ID 普遍偏长，再决定是否需要更窄字体、两段式排版或 hover 明细层
## 2026-03-23 19:50:00

- 修复结果区“下载结果”按钮文字不可见
  - 确认不是遮挡层，而是全局 `a` 样式覆盖了链接按钮的文字颜色
  - 为结果区下载链接补充强制白字样式
  - 重写 `results-panel.test.tsx`，增加下载链接可见性断言
- 验证通过
  - `npx vitest run src/components/results-panel.test.tsx`
  - `npx eslint "src/components/results-panel.tsx" "src/components/results-panel.test.tsx"`

下一步：

- 如果后面还有其他“看起来像按钮但实际上是 a 链接”的入口，统一按同一按钮链接规范收口
## 2026-03-23 20:55:00

- 完成任务ID统一展示
  - 工作台右栏把“第三方 ID”统一改成“任务ID”
  - 结果区复制按钮和详情文案改为基于 `providerTaskId || taskNo` 的统一展示任务ID
  - 任务详情页主标题改为 `siteTaskNo`，摘要区新增独立的“任务ID”指标
  - 飞书同步异常列表和集成设置页字段说明统一改用“任务ID”
- 完成单应用页右侧全站任务面板默认收起
  - 仅桌面端生效，移动端保持现有纵向结构
  - 新增右侧中部轻量胶囊开关，默认进入页面时为收起态
  - 收起后中间结果区自动扩展，不影响选中任务和实时刷新
- 完成管理员任务中心批量管理
  - 任务列表首列升级为“站内编号 + 任务ID”双层展示
  - 新增勾选、全选当前列表和批量工具栏
  - 批量操作首批支持“批量重试同步”和“批量删除”
  - 批量删除级联清理 `Task / TaskAsset / SyncLog / CreditLog`，并 best-effort 删除本地结果文件
- 执行验证
  - `npx vitest run src/components/recent-results-panel.test.tsx src/components/results-panel.test.tsx src/components/workbench-layout.test.tsx src/components/admin-tasks-client.test.tsx src/app/api/internal/admin/tasks/bulk/route.test.ts`
  - `npx eslint "src/components/workbench-layout.tsx" "src/components/app-workbench-client.tsx" "src/components/recent-results-panel.tsx" "src/components/results-panel.tsx" "src/components/admin-tasks-client.tsx" "src/components/sync-incidents-client.tsx" "src/lib/db/sync.ts" "src/app/(workspace)/tasks/[id]/page.tsx" "src/app/(workspace)/admin/settings/integrations/page.tsx" "src/app/api/internal/admin/tasks/bulk/route.ts"`
  - `npm run build`

下一步：

- 视真实任务量决定管理员任务中心是否需要分页、筛选和批量操作结果导出
## 2026-03-24 16:50:00

- 完成单应用模板多图结果展示
  - `results-panel` 升级为“当前主图 + 全部结果缩略条”的结果集合展示
  - 多图场景新增结果计数提示，并统一结果操作语义为“下载当前图片 / 查看当前图片”
  - `asset-thumbnail` 放宽图片地址判断，支持站内相对路径 `/assets/...`
- 补充并通过结果区回归测试
  - `npx vitest run src/components/results-panel.test.tsx`
  - `npx eslint "src/components/results-panel.tsx" "src/components/results-panel.test.tsx" "src/components/asset-thumbnail.tsx"`
  - `bun run build`

下一步：

- 如继续增强单应用结果区，优先评估“下载全部”打包能力与多结果类型统一协议
## 2026-03-24 17:45:00

- 完成多图结果下载增强
  - 新增任务结果单图下载接口 `/api/internal/tasks/[id]/downloads/assets/[assetId]`
  - 新增任务结果 ZIP 打包接口 `/api/internal/tasks/[id]/downloads/archive`
  - 抽出 `task-output-download-actions` 共享组件，同时接入单应用结果区和任务详情页
  - 支持客户端顺序触发“直接下载多张”，并在失败时提示改用 ZIP
  - 服务端统一处理任务可见性校验、文件名生成、站内 `/assets/...` 解析和远程结果图透传
- 补齐验证
  - `npx vitest run src/components/results-panel.test.tsx src/components/task-output-download-actions.test.tsx src/app/api/internal/tasks/[id]/downloads/assets/[assetId]/route.test.ts src/app/api/internal/tasks/[id]/downloads/archive/route.test.ts`
  - `npx eslint "src/components/results-panel.tsx" "src/components/task-output-download-actions.tsx" "src/components/task-output-download-actions.test.tsx" "src/app/(workspace)/tasks/[id]/page.tsx" "src/app/api/internal/tasks/[id]/downloads/assets/[assetId]/route.ts" "src/app/api/internal/tasks/[id]/downloads/assets/[assetId]/route.test.ts" "src/app/api/internal/tasks/[id]/downloads/archive/route.ts" "src/app/api/internal/tasks/[id]/downloads/archive/route.test.ts" "src/lib/task-downloads.ts" "src/lib/db/tasks.ts"`

下一步：

- 跑一次生产构建，确认下载路由、任务详情页和结果区接入不会影响整体打包
- 如后续需要，再评估是否补“浏览器多文件下载被拦截时的更强提示”或批量下载偏好记忆
## 2026-03-24 19:20:00

- 完成“应用预计费用 + 后台列表直改 + 积分体系移除”主链路改造
  - Prisma schema 下线 `User.credits`、`App.creditCost` 和 `CreditLog`
  - 新增 `App.estimatedPriceFen` 与 `Task.estimatedPriceFenSnapshot`
  - 任务提交时写入费用快照，历史任务展示优先读取快照，避免应用价格修改后历史金额漂移
- 完成应用预计费用全链路接入
  - 应用创建、编辑、应用列表都可维护 `预计费用`
  - 提交任务前可见 `预计费用 ¥x.xx`
  - 任务详情页补充金额展示
- 完成后台第一批高频列表“列表内直接编辑 + 排序”
  - 应用：分类、标签、排序值、预计费用、启用状态、结果共享
  - 分类：名称、排序值、启用状态
  - Banner：标题、副标题、链接文案、链接地址、排序值、启用状态
  - 提示词模板：名称、分类、标签、作用范围、启用状态
  - 用户：显示名、角色、启用状态、每日额度
- 完成积分体系移除
  - 个人中心移除积分余额与积分记录
  - 后台用户页移除积分字段与调积分入口
  - 删除积分相关接口与运行时依赖
- 修复并收口本轮实现中暴露的若干历史编码/文案/编译问题
  - 修正 `app-form-editor`、`submit-form`、`tasks/[id]/page`、`profile`、`admin/users/page` 等关键页面的异常字符串与编译问题
- 执行验证
  - `bunx prisma db push --accept-data-loss`
  - `npx vitest run src/lib/db/apps.test.ts src/app/api/internal/admin/apps/[code]/route.test.ts src/app/api/internal/admin/apps/bulk/route.test.ts src/components/app-form-editor.test.tsx src/components/submit-form.test.tsx src/components/admin-apps-client.test.tsx`
  - `npx eslint "src/lib/money.ts" "src/lib/db/apps.ts" "src/lib/db/apps.test.ts" "src/lib/db/admin.ts" "src/lib/db/users.ts" "src/lib/db/tasks.ts" "src/lib/auth.ts" "src/lib/task-queue.ts" "src/lib/types.ts" "src/app/(workspace)/admin/users/page.tsx" "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/app/(workspace)/tasks/[id]/page.tsx" "src/app/(workspace)/profile/page.tsx" "src/app/(workspace)/profile/client.tsx" "src/app/api/internal/admin/apps/route.ts" "src/app/api/internal/admin/apps/[code]/route.ts" "src/app/api/internal/admin/apps/[code]/route.test.ts" "src/components/admin-apps-client.test.tsx" "src/components/app-form-editor.tsx" "src/components/app-form-editor.test.tsx" "src/components/submit-form.test.tsx"`
  - `bun run build`

下一步：

- 用真实浏览器重点回归五个后台高频列表的直改体验，确认下拉、标签弹层、失焦保存和表头排序在真实交互下都稳定
- 如需继续打磨，可为后台列表直改统一补一层更显式的 toast/保存状态反馈
## 2026-03-24 20:20:00

- 完成提示词模板 A 方案第一期落地。
  - 新增模板变量引擎，支持 `{{input.prompt}}`、`{{input.style}}`、`{{input.scene}}`、`{{input.negative_prompt}}`
  - 提交链路从 `formData` 构造变量字典，服务端生成最终 provider prompt
  - 保留旧模板兼容逻辑：未写变量时仍按“模板正文 + 用户输入”执行
  - 重构后台模板编辑弹窗为单屏双栏工作台，模板正文改为白底并支持变量插入
  - 新增示例图片/视频本地上传，视频支持可选封面图
  - 新增标签与分类的就地管理弹窗，保存后即时刷新当前可选项
- 新增并跑通定向测试与静态检查：
  - `npx vitest run src/lib/app-submit.test.ts src/components/admin-prompt-template-edit.test.tsx`
  - `npx eslint src/lib/app-submit.ts src/lib/app-submit.test.ts src/lib/task-queue.ts src/components/admin-prompt-template-edit.tsx src/components/admin-prompt-template-edit.test.tsx src/components/admin-prompt-templates-client.tsx`

下一步：

- 用真实后台页面回归模板新建/编辑流程，确认上传、变量替换和旧模板兼容表现
## 2026-03-24 21:05:00

- 完成飞书字段映射可配置化落地：
  - 新增 `src/lib/feishu-sync-fields.ts`，统一维护共享字段和 `params.<fieldKey>` 规则
  - 新增 `src/lib/feishu-sync-mapping.ts`，抽离纯前后端共享的映射规范化与序列化逻辑
  - 升级 `src/lib/feishu-sync.ts`，支持参数字段同步展开
  - 新增 `src/components/feishu-sync-mapping-editor.tsx` 作为结构化映射编辑器
  - 升级后台集成设置页与应用编辑器，同步配置从固定下拉 / JSON 文本框切到结构化映射器
  - 应用级同步配置支持当前表单字段映射到飞书，如 `params.prompt`、`params.style`
- 处理了一轮构建期问题：
  - 客户端不再直接依赖带 `prisma` 的 `feishu-sync.ts`
  - 修正 `defaultSyncMappingJson` 的类型边界
  - 修正共享字段排序时的联合类型收窄问题
  - 顺手清理了本轮新改文件中的部分乱码文案
- 执行验证：
  - `bunx vitest run src/app/api/internal/admin/apps/[code]/route.test.ts src/lib/feishu-sync.test.ts src/app/api/internal/admin/settings/integrations/route.test.ts src/components/app-form-editor.test.tsx`
  - `bun run build`
- 下一步：
  - 用真实浏览器回归“集成设置”与“应用配置”的映射交互
  - 视需要补 `task-queue` / `feishu-sync-jobs` 的端到端链路测试
## 2026-03-24 21:20:00

- 为飞书映射补充提示词模板字段：
  - 新增共享字段 `promptTemplateName`
  - 新增共享字段 `promptTemplateContent`
- 调整任务提交链路：
  - 用户选择提示词模板后，`submitNewTask` 会把模板 `id / name / templatePrompt` 写入 `task.resultJson.promptTemplate`
  - 后续飞书同步统一从任务快照读取模板信息，避免 webhook 更新和历史补同步丢字段
- 调整飞书同步 payload：
  - `buildTaskSyncPayload` 现在会输出 `promptTemplateName`
  - `buildTaskSyncPayload` 现在会输出 `promptTemplateContent`
  - `allInfo` 里也会带上提示词模板快照
- 补齐验证：
  - `bunx vitest run src/lib/feishu-sync.test.ts src/app/api/internal/admin/settings/integrations/route.test.ts`
  - `bun run build`
- 下一步：
  - 用真实浏览器回归后台飞书映射下拉是否按预期展示新字段
  - 视需要补 `task-queue` 层的模板快照持久化单测
## 2026-03-24 21:35:00

- 完成 RunningHub 多通道并发调度落地
  - `IntegrationSettings` 新增 `runninghubChannelsJson`，兼容旧 `taskMaxConcurrency`
  - `App` 新增 `runninghubAllowedChannelCodesJson`
  - `Task` 新增 `runninghubChannelCode / runninghubChannelName`
  - 本地任务改为先入 `QUEUED` 队列，再按通道优先级和并发占用派发
  - 集成设置页改为由 RunningHub 区块统一承载通道与并发配置
  - 应用编辑器新增“自动调度 / 指定通道”配置
  - 密钥状态页支持动态展示 RunningHub 通道 env key
- 执行验证
  - `bunx prisma generate`
  - `bunx vitest run src/app/api/internal/admin/settings/integrations/route.test.ts src/app/api/internal/admin/settings/secrets/route.test.ts src/app/api/internal/admin/apps/[code]/route.test.ts src/components/app-form-editor.test.tsx`
  - `bun run build`
- 额外排查
  - 尝试对默认本地库执行 `prisma migrate deploy`
  - 被历史失败迁移 `20260322180000_structured_app_management` 阻塞，未继续强行修复本轮之外的问题

下一步：

- 等历史失败迁移清理完成后，再对默认本地 `dev.db` 正式执行 migration 验证
- 补一组更聚焦 `pumpQueuedTasks` 多通道分流与 FIFO 的自动化测试
## 2026-03-24 22:29:00

- 修复全量测试基线问题：
  - 新增 `vitest.global-setup.ts`
  - Vitest 启动前先复制 `dev.db` 为 `test.db`
  - 再对 `test.db` 执行 `prisma db push --accept-data-loss`，保证测试库 schema 跟当前 Prisma 模型一致
  - 在 `vitest.config.ts` 中固定 `DATABASE_URL=file:./test.db`
  - 关闭 Vitest 文件级并行，减少 SQLite 写锁导致的 Prisma timeout
- 修复 `src/app/api/internal/admin/settings/site/route.test.ts`：
  - 将顶层 `vi.fn()` mock 改为 `vi.hoisted(...)`
  - 解决 hoisted mock 在模块提升阶段访问未初始化变量的问题
- 执行验证：
  - `bun run test src/app/api/internal/admin/settings/site/route.test.ts src/lib/feishu-sync-jobs.test.ts src/lib/db/tasks.test.ts src/lib/db/users.test.ts src/lib/db/materials.test.ts`
  - `bun run test`
  - `bun run build`
- 验证结果：
  - `bun run test` 全绿，`38` 个测试文件、`127` 条测试通过
  - `bun run build` 通过，原先构建期 Prisma 缺列日志已消失

下一步：

- 如果后面继续增加 DB 测试，默认沿用 `test.db` 这套隔离方案，不要再让 Vitest 直接连接 `dev.db`
- 视情况再单独处理当前仍存在的 Turbopack NFT tracing warning

## 2026-03-24 22:20:00

- 修复提示词模板编辑器在“管理分类 / 管理标签”内联新增时清空草稿的问题：
  - 拆分“弹窗打开/切换模板时初始化表单”和“外部分类/标签列表同步到本地缓存”的 effect
  - 初始化逻辑只在首次打开、从新建切到编辑、或切换到另一条模板时重置
  - 分类/标签列表刷新不再重灌整张表单
- 修复 React 警告：
  - `saveCategory / removeCategory / saveTag / removeTag` 不再在 `setState` updater 内调用 `onCategoriesChange / onTagsChange`
  - 改为先计算 `nextCategories / nextTags`，再同步本地状态与父级回调
- 完成回归测试补充：
  - 新增“输入模板正文后创建分类，正文仍保留”的测试
  - 新增“创建分类时不会触发 React cross-component warning”的测试
  - 补稳内联管理弹窗的测试流程，显式关闭标签弹窗后再创建分类
- 执行验证：
  - `bun run test src/components/admin-prompt-template-edit.test.tsx`
  - `npx eslint src/components/admin-prompt-template-edit.tsx src/components/admin-prompt-template-edit.test.tsx`
  - `bun run build`
- 额外记录：
  - `bun run test` 仍受仓库既有基线问题影响失败，主要是测试库缺少 `runninghubAllowedChannelCodesJson / runninghubChannelsJson` 列，以及个别历史 Prisma 超时与 hoisted mock 问题

下一步：

- 在真实后台页面手工回归提示词模板“新建模板 -> 输入正文 -> 管理分类/标签 -> 新增 -> 返回保存”的完整链路
- 视情况补测试数据库迁移或测试初始化，清理 `bun run test` 的既有失败基线

## 2026-03-24 22:48:00

- 收口提示词模板编辑器的封面预览区：
  - 将示例媒体卡片中的 `Preview` 文案改为“封面”
  - 图片封面和视频封面缩略图改为按完整比例展示，避免裁切主体
  - 缩略图接入 `ImageLightbox`，支持在弹窗内查看完整图片
- 补充 `admin-prompt-template-edit.test.tsx`：
  - 新增“封面缩略图使用 `object-contain` 展示”的断言
  - 新增“点击封面可打开完整图片预览”的回归测试
- 执行验证：
  - `npx vitest run src/components/admin-prompt-template-edit.test.tsx`
  - `npx eslint "src/components/admin-prompt-template-edit.tsx" "src/components/admin-prompt-template-edit.test.tsx"`

下一步：

- 在真实后台页面手工回归“新建提示词模板 -> 上传/粘贴封面 -> 查看完整图 -> 保存”链路
- 视运营反馈再决定是否需要补“封面区域支持更明显尺寸提示/比例提示”
## 2026-03-24 23:18:00

- 完成应用展示配置改版
  - 新增案例参考图片配置，支持本地批量上传和 URL 添加
  - 前台应用详情页新增“效果展示”模块，支持缩略图切换和大图预览
  - 展示配置移除图标、角标、作者相关 5 个字段
  - 数据库新增 `showcaseImagesJson`，运行时映射为 `showcaseImages`
- 补充测试
  - `src/components/app-form-editor.test.tsx`
  - `src/lib/db/apps.test.ts`
  - `src/app/api/internal/admin/apps/[code]/route.test.ts`
  - `src/components/app-showcase-gallery.test.tsx`
- 执行验证
  - `npx vitest run src/components/app-form-editor.test.tsx src/lib/db/apps.test.ts src/app/api/internal/admin/apps/[code]/route.test.ts src/components/app-showcase-gallery.test.tsx src/components/submit-form.test.tsx src/components/admin-prompt-template-edit.test.tsx`
  - `npx eslint "src/lib/types.ts" "src/lib/db/apps.ts" "src/app/api/internal/admin/apps/route.ts" "src/app/api/internal/admin/apps/[code]/route.ts" "src/components/app-form-editor.tsx" "src/components/app-form-editor.test.tsx" "src/components/app-showcase-gallery.tsx" "src/components/app-showcase-gallery.test.tsx" "src/components/app-workbench-client.tsx" "src/components/submit-form.test.tsx" "src/components/admin-prompt-template-edit.test.tsx" "src/lib/db/apps.test.ts" "src/app/api/internal/admin/apps/[code]/route.test.ts"`
  - `npx prisma db push`
  - `npm run build`

下一步：

- 用真实案例图走一遍后台新增/排序/删除，再到前台详情页确认展示节奏
- 如果后续要支持案例图文案，再单独扩展数据结构，不和本轮只存 URL 的方案混做
## 2026-03-25 16:10:00

- 修复 Vercel 登录热修复
  - 新增 `src/lib/default-login-accounts.ts`，统一维护 `admin / ops.a / design.c` 默认账号定义。
  - `src/lib/auth.ts` 增加默认账号自修复逻辑：当线上库缺账号或默认密码哈希漂移时，输入正确默认密码会自动补齐账号或修复哈希，再继续正常登录。
  - 移除 `src/app/login/page.tsx` 登录页底部的默认账号展示文案，避免公开暴露账号密码。
- 补充并通过定向验证：
  - `npm run test -- src/lib/auth.test.ts`

下一步：

- 在实际 Vercel 环境用 `admin / admin123`、`ops.a / ops123`、`design.c / design123` 各回归一次登录。
- 如后续准备取消默认账号能力，再把 `src/lib/default-login-accounts.ts` 改成纯初始化脚本入口，不再参与运行时登录自修复。

## 2026-03-24 23:33:00

- 复查应用展示配置改版后，发现前台应用列表卡片仍在消费旧的 `iconUrl / iconBgColor` 字段。
- 已修复 `src/components/app-card-grid.tsx` 与 `src/components/app-card-horizontal.tsx`，统一改为使用 `coverPoster`，无封面时使用首字母兜底。
- 已补跑并通过本轮定向验证：
  - `npx vitest run src/app/api/internal/admin/apps/route.test.ts src/components/app-form-editor.test.tsx src/lib/db/apps.test.ts src/app/api/internal/admin/apps/[code]/route.test.ts src/components/app-showcase-gallery.test.tsx src/components/submit-form.test.tsx src/components/admin-prompt-template-edit.test.tsx`
  - `npx eslint "src/lib/types.ts" "src/lib/db/apps.ts" "src/app/api/internal/admin/apps/route.ts" "src/app/api/internal/admin/apps/route.test.ts" "src/app/api/internal/admin/apps/[code]/route.ts" "src/app/api/internal/admin/apps/[code]/route.test.ts" "src/components/app-form-editor.tsx" "src/components/app-form-editor.test.tsx" "src/components/app-showcase-gallery.tsx" "src/components/app-showcase-gallery.test.tsx" "src/components/app-workbench-client.tsx" "src/components/app-card-grid.tsx" "src/components/app-card-horizontal.tsx" "src/components/submit-form.test.tsx" "src/components/admin-prompt-template-edit.test.tsx" "src/lib/db/apps.test.ts"`
  - `npm run build`

下一步：

- 在真实后台手工回归“新建应用 -> 添加案例图 -> 保存 -> 前台详情页查看效果展示”链路。
- 若运营后续需要案例图标题/文案，再单独评估是否扩展为对象结构。
## 2026-03-24 23:29:11

- 完成任务中心输入参考图与详情抽屉改版
  - 列表新增 `输入参考图` 列，支持无图占位和输入图 lightbox 预览
  - 站内编号与应用名改为打开右侧任务详情抽屉
  - 抽屉集中展示概览、输入信息、输出结果、系统日志、飞书同步，并保留原详情页入口
- 完成任务详情接口与映射补强
  - `GET /api/internal/tasks/[id]` 增补 `appInputSchema`
  - 新增共享任务输入排序/标注逻辑，统一主参考图优先级和字段中文 label
- 补充并通过定向验证
  - `bun run test src/components/admin-tasks-client.test.tsx src/lib/db/tasks.test.ts`
  - `npx eslint "src/components/admin-tasks-client.tsx" "src/components/admin-tasks-client.test.tsx" "src/components/task-detail-drawer.tsx" "src/lib/task-inputs.ts" "src/lib/db/tasks.ts" "src/lib/db/tasks.test.ts" "src/lib/types.ts"`
  - `bun run build`

下一步：

- 在真实后台页面回归 `/tasks` 列表宽度、抽屉滚动和输入/输出预览的实际观感
- 如后续需要在列表里直接区分“主参考图 / 辅助图”，再评估是否补轻量标记而不继续挤压表格列宽
## 2026-03-24 23:45:00

- 将案例参考图片上限从 6 张提升到 100 张。
- 新增共享常量与归一化工具 `src/lib/showcase-images.ts`，统一前端编辑器、创建接口、更新接口和数据映射的上限行为。
- 新增 `src/lib/showcase-images.test.ts`，验证案例图列表会自动裁剪到 100 条并清理首尾空格。

下一步：

- 在真实后台页面手工验证批量上传、URL 添加和 100 张上限提示是否符合预期。
## 2026-03-25 17:07:51

- 复现并定位了生产环境概览页报错：`/admin` 稳定落入 Server Components 错误边界，`/` 与 `/tasks` 存在同类风险。
- 已为工作台首页和任务中心增加页面级数据兜底；为系统概览 `getAdminOverview` 增加整体回退逻辑，确保统计查询失败时仍能打开页面。
- 新增并通过两条回归测试：
  - `src/app/(workspace)/page.test.tsx`
  - `src/lib/db/admin.test.ts`
- 本地验证已通过：
  - `npx vitest run "src/app/(workspace)/page.test.tsx" src/lib/db/admin.test.ts`
  - `npx eslint "src/app/(workspace)/page.tsx" "src/app/(workspace)/page.test.tsx" "src/app/(workspace)/tasks/page.tsx" "src/lib/db/admin.ts" "src/lib/db/admin.test.ts"`
  - `node node_modules/next/dist/bin/next build`
- 已将修复推送到 Vercel 发布分支 `codex/github-publish-1-13`，提交为 `f9b0a70 Add resilient fallbacks for production overview pages`。

下一步：

- 等 Vercel 部署完全切换后，按顺序人工回归 `/login`、`/`、`/admin`、`/tasks` 四个页面。
- 继续核对生产数据库枚举和 schema，确认是否存在需要单独补迁移的漂移项。
## 2026-03-25 17:22:00

- 通过 `npx vercel inspect https://hz-i523350t4-mubai123456s-projects.vercel.app --logs` 拉到失败部署日志，确认 Vercel 失败根因是构建阶段预渲染后台页时触发 Prisma / Postgres `Max client connections reached`。
- 已在 `src/app/(workspace)/layout.tsx` 增加 `export const dynamic = "force-dynamic"`，阻止工作台和后台页在 build 阶段访问数据库。
- 本地验证通过：
  - `node node_modules/next/dist/bin/next build`
  - `npx eslint "src/app/(workspace)/layout.tsx"`
- 构建输出中 `Generating static pages` 已从 `71` 降到 `53`，说明工作台路由组已退出静态预生成。

下一步：

- 将这一个路由配置修复推到 `codex/github-publish-1-13`，然后在 Vercel 上重新触发 production deployment。
- 部署完成后重点回归 `/login`、`/`、`/admin/banners`、`/tasks`。
