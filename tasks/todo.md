# 2026-03-25 应用配置与生产稳定性修复

## 当前阶段

- [x] 复现本地生产态 `Server Components render` 崩溃并定位到 JWT 生产判定
- [x] 修复 RunningHub `fieldData` 解析，恢复 select 字段类型、选项和默认值
- [x] 调整应用编辑器显示开关语义为“默认前台显示，可取消显示”
- [x] 修复单应用页只渲染首个 textarea 的问题
- [x] 修复本地样本应用 `2-0` 的旧坏 schema
- [x] 补充回归测试并重新通过全量测试、类型检查和生产构建
- [x] 用生产态 `next start` + Playwright 回归 `/login`、`/admin/apps/new`、`/admin/apps/2-0`、`/apps/2-0`、`/tasks`

## 下一阶段

- [ ] 如仍有更多历史旧应用带错 schema，补一份可重复执行的数据修复脚本
- [ ] 单独排查既有 Turbopack NFT tracing warning，避免影响后续构建排障

## Review

- 这轮不改数据库结构，只修解析、编辑器语义、前台渲染和已有样本数据，影响面控制在应用配置主链路。
- 目前全量验证已恢复为：
  - `npm run test`
  - `node node_modules/next/dist/bin/next build`
  - `npx tsc --noEmit`
  - 生产态 smoke 全通过

# 1.13 -> Supabase / Postgres 升级待办

## 当前阶段

- [x] 审查 `1.13` 基线与现有 `master` 迁移残稿，确定升级起点
- [x] 先补失败测试，锁定部署校验与对象存储辅助能力
- [x] 将 Prisma 运行时切到 Postgres
- [x] 新增对象存储抽象，并接入素材上传与任务结果存储
- [x] 新增 Postgres 基线迁移目录与测试库重建脚本
- [x] 新增 SQLite -> Postgres 迁移脚本与管理员初始化脚本
- [x] 升级 Vercel 部署校验与部署脚本
- [x] 通过 `npm test`
- [x] 通过 `npm run build`

## 下一阶段

- [ ] 用真实 Supabase 连接串执行一次 `scripts/migrate-sqlite-to-postgres.mjs`
- [ ] 用真实七牛 Kodo 凭据执行一次本地文件迁移
- [ ] 准备 `.env.vercel` 并跑 `node scripts/deploy-vercel.mjs --target preview --env-file .env.vercel --dry-run`
- [ ] 补齐 `.env.vercel.production` 的真实生产凭据并通过 production dry-run
- [ ] 做一轮浏览器回归，重点验证素材下载、结果图预览和任务结果回写
- [x] 补充 Supabase / 七牛 Kodo / Vercel 的外部环境配置手册与 dry-run 脚本
- [x] 落地 `TASK_OUTPUT_STORAGE_MODE=provider_url` 一期策略

## Review

- 当前第一阶段代码级改造已经收口，测试与构建都通过。
- 还没有做真实外部环境联调，所以 Supabase / 七牛 Kodo / Vercel 的最终上线验证仍待执行。

## 2026-03-25 登录热修复

- [x] 复现并定位 Vercel 上默认管理员账号无法登录的根因
- [x] 为默认账号补上运行时自修复，解决缺账号和密码哈希漂移
- [x] 移除登录页公开展示账号密码的提示区块
- [ ] 在真实 Vercel 环境回归 `admin`、`ops.a`、`design.c` 三个账号登录

## 2026-03-25 生产页兜底修复

- [x] 复现生产环境 `/admin` Server Components 渲染错误
- [x] 对比线上可用页面，确认问题集中在首页/概览等统计页的数据加载链路
- [x] 为工作台首页、系统概览、任务中心增加生产容错，避免单个查询失败导致整页报错
- [x] 补充针对兜底逻辑的回归测试并重新验证构建

### Review

- 本轮热修复优先保障线上页面可打开，把“统计失败 -> 空态展示”变成默认行为，降低生产数据库短暂异常对体验的冲击。
- 真实根因仍可能包含数据库枚举或 schema 漂移，后续还需要结合线上库继续核对迁移状态。

## 2026-03-25 Vercel 构建连接池修复

- [x] 用 Vercel CLI 拉取失败部署日志并确认构建失败根因
- [x] 阻止 `src/app/(workspace)` 路由组在 build 阶段预渲染
- [x] 本地重新验证构建与 lint
- [ ] 重新触发 Vercel production deployment 并回归关键页面

### Review

- 这次失败不是代码语法问题，而是构建期访问数据库过多导致连接池耗尽。
- 用路由组级别的 `force-dynamic` 收口，比逐页打补丁更稳，也更接近这些后台页的真实使用方式。

### Review

- 本轮改动只触碰登录入口与默认账号修复逻辑，没有扩散到工作台其它页面。
- 已通过 `npm run test -- src/lib/auth.test.ts`，但还需要真实线上回归确认 cookie、数据库和部署环境完全一致。
