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

## 算力应用导入语义

- 导入 API 示例时，只要 `fieldData` 能解析出选项列表，就默认识别为下拉字段。
- `fieldData` 的 `index` / `value` 属于提交值，`description` / `label` / `name` 属于用户可见文案，不能混用。
- 用户可见字段标题优先从 `description` 推导短标题；完整 `description` 继续保留为说明文本。
- 后台编辑器与前台工作台都应保持同一套语义，不要让技术字段名直接暴露给最终用户。

## 算力通道提交链路

- 用户可见的上传、提交、轮询接口不能直接回显第三方原始错误或环境变量名，必须先做安全错误映射。
- 通道凭据同时支持 `DIRECT` 和 `ENV` 两种模式；后台读取直填 API 时只能回传脱敏值。
- 单应用页右侧任务流不能只依赖进程内 SSE；提交成功后必须立即把新任务同步进本地列表。
- 对于缺少通道、缺少 key、映射缺失这类不可恢复问题，要直接反馈失败，不能伪装成“已提交”或长期静默排队。
- 单应用提交接口优先返回首帧任务快照；队列重算、飞书同步、任务派发应在首响应之后异步继续，不能阻塞提交按钮。

## 工作台交互

- 左侧输入区默认走极简输入结构，只保留必要字段和即时状态；大段解释文案不要长期常驻在主提交流程里。
- 参考图卡片必须支持显式 `查看 / 删除`；删除只影响当前草稿，不影响历史任务。
- 结果区需要明确展示任务使用的 `已选模板` 和 `本次提示词`，方便用户回看“这张图是用什么做出来的”。
- 多图结果默认在主结果舞台里直接左右切换，不依赖缩略图作为唯一入口。
- 结果镜像能力属于前端临时预览与当前图下载能力，只影响当前查看和当前下载，不把镜像图永久写回任务结果。

## 飞书同步配置

- 飞书补同步不能只依赖环境变量；后台集成设置必须支持维护 `App ID`、`App Secret`、`App Token`、`Table ID`。
- 飞书应用密钥在管理台读取时必须脱敏，保存时要保留原值，不能把脱敏占位符反写进数据库。
- 飞书 SDK 在换取 `tenant_access_token` 时应优先使用后台保存的应用凭据，再回退环境变量。

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
