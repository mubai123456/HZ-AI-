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
