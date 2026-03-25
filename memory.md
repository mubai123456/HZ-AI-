# 项目长期规则

## 仓库结构

- 正式应用永远只在仓库根目录维护。
- 仓库根目录必须直接包含：
  - `src/`
  - `prisma/`
  - `public/`
  - `scripts/`
  - `docs/`
  - `package.json`
- 不允许再创建二级 `ai-workbench/` 套娃项目目录。

## 归档与清理

- 备份、发布残留、恢复快照、MCP 审计包、Playwright 痕迹统一放到同级 `_archive/`。
- `_archive/` 永远不参与开发、Git 提交和部署。
- `.next/`、`node_modules/`、`.local-run/`、`output/`、`*.db`、日志文件都属于本地生成物，必须忽略。

## 日常使用

- 以后本地开发只打开最外层仓库目录。
- 所有命令都在仓库根目录执行：
  - `npm install`
  - `npm run dev`
  - `npm run test`
  - `npm run build`
- 不要从历史快照目录、发布目录或旧残留目录启动服务。

## 部署

- 部署根目录固定为仓库根目录 `/`。
- 不再使用子目录 Root Directory。
- 部署前必须确认仓库根目录存在且只存在一套正式应用入口文件。
- GitHub 默认分支与 Vercel 的 Production Branch 必须始终保持一致。
- Vercel Git 自动部署必须先跑 `prisma migrate deploy` 再构建；默认构建命令应保持为 `npm run build:vercel`。
- Vercel 生产环境下，如果使用 Supabase pooler，`DATABASE_URL` 必须走 transaction pooler 并带上 `pgbouncer=true&connection_limit=1`，否则后台页可能在 Serverless 并发下触发 `MaxClientsInSessionMode`。
- `DIRECT_URL` 与 `DATABASE_URL` 不要无脑配置成同一个 session-mode pooler 连接串；`DIRECT_URL` 只用于 Prisma migration / schema 操作。

## 文档维护

- 每轮任务结束后都要同步更新根目录的 `README.md`、`log.md`、`memory.md`。
- `README.md` 只写当前有效入口和使用方式。
- `log.md` 只记录阶段性进展与下一步。
- `memory.md` 只保留长期有效规则，不写一次性排障细节。

## 协作偏好

- 安装外部仓库、技能或工具前，先做安全审查，再执行真实安装与启动验证。
- 完成外部工具安装后，要给出可复现的详细使用步骤，并明确说明当前可用能力与受限能力。
