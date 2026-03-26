# AI Workbench

内部 AI 应用工作台的唯一正式仓库。

## 最近进度

- 2026-03-26 15:49：已修复飞书补同步凭据断层。
- 飞书同步现在会优先读取后台集成设置中的 `App ID`、`App Secret`、`App Token`、`Table ID`，不再只依赖环境变量。
- 集成设置页已经补上飞书应用凭据录入，保存后会立即触发历史任务补同步。
- 密钥状态页现在能正确显示飞书 `App ID / App Secret` 来自 `环境变量` 还是 `集成设置`。
- 2026-03-26 15:06：已完成算力通道配置改造与全站去供应商名收口。
- 集成设置现在支持两种凭据模式：`直接 API` 和 `环境变量`，管理员可直接在后台维护通道凭据。
- 历史上误把真实 API 填进旧字段的配置会自动兼容读取，并在后台以脱敏形式展示，不再报整页校验错误。
- 后台不再展示第三方服务 Base URL；用户侧、管理员侧、接口返回文案统一改成 `算力通道`。
- 2026-03-26 14:10：已修复单应用提交链路的 3 个关键问题。
- 上传图片失败时不再把算力通道 API key / 环境变量名等内部错误直接回显到前端。
- 提交任务接口现在会明确返回 `已提交到算力通道 / 已进入本地队列 / 提交失败` 三种状态，不再出现“其实没发出去却只显示成功”的反馈。
- 单应用页右侧“全站任务”现在在提交成功后会立即插入最新任务，不再只依赖内存 SSE 刷新。
- 已补齐并通过相关回归：上传路由、提交路由、通道配置校验、单应用工作台即时更新、`submit-form` 相关测试。
- 2026-03-25 23:25：已修正 API 示例导入语义。
- `fieldData` 只要能解析出多选项，后台编辑器会自动落成下拉框并带入默认值。
- 前台与后台默认显示名称现在优先使用 `description` 推导的人话标题，如“设置比例”“分辨率”“第三方/官方切换”。
- 长 `description` 采用“短标题 + 完整说明”策略：标题给用户看，完整原文保留在说明区。
- 2026-03-25 21:44：已修复线上后台页 `Server Components render` 报错。
- 当前已确认生产数据库 baseline 已登记，Vercel Production 已重新部署到最新代码。
- 当前已回归通过：`/admin/apps`、`/admin/apps/new`、`/admin/apps/[code]`、`/admin/categories`、`/admin/settings/integrations`。
- 当前线上关键数据库连接策略：
  - `DATABASE_URL` 使用 Supabase transaction pooler 端口 `6543`
  - 连接参数固定包含 `pgbouncer=true&connection_limit=1`
  - `DIRECT_URL` 继续用于 Prisma migration / schema 操作
- 2026-03-25：已在本机完成 `Vercel CLI 50.37.0` 全局安装，当前可直接使用 `vercel` / `vc` 命令。
- 当前已验证 `vercel --version`、`vc --version` 可正常返回版本号。
- 当前能力：可直接执行 `vercel login`、`vercel link`、`vercel deploy` 等命令。
- 当前限制：这次只完成了 CLI 安装与命令校验，尚未在本轮里绑定账号或目标项目。
- 2026-03-25：已在本机补充安装并验证 `CJFCodexSwitcher`，可用于查看 Codex 账号 5 小时 / 每周额度与执行账号存档。
- 当前确认 `codex-switcher --list`、`--best`、`--refresh`、`--save-current` 可用。
- 当前机器上的官方 `codex` 命令仍存在 `Access is denied` 问题，因此切换器里的“新增账号 / 调官方 codex login”能力暂时受限。

## 正确打开的目录

- 当前这台机器上，请打开：
  `D:\2.文档\5.AI编程项目\5.内部AI网站`
- 这个根目录已经是唯一正式项目入口。
- 旧的二级 `ai-workbench/` 空壳目录已经清掉，不要再创建新的套娃目录。
- 最外层文件夹目标名仍然是 `ai-workbench`，但当前改名会被正在使用这个工作区的 Codex/资源管理器窗口占用；关闭这些窗口后再执行重命名即可。
- 不要再进入 `_archive/`、`publish-*`、`restore-snapshots/` 一类目录开发。

## 当前正式结构

- `src/`：Next.js 应用源码
- `prisma/`：数据库 schema、迁移、seed
- `public/`：站点静态资源
- `scripts/`：部署、迁移、测试辅助脚本
- `docs/`：项目说明和 runbook
- `tasks/`：待办与长期教训
- `storage/`：本地开发运行数据

## 本地开发

在仓库根目录执行：

```bash
npm install
npm run dev
```

默认地址：

- `http://localhost:3000`

## 测试与构建

```bash
npm run test
npm run build
npm run build:vercel
```

如果需要生产态本地验证：

```bash
npm run build
npm run start
```

## 算力应用导入约定

- `fieldData` 形如 `[[values], { default }]` 或对象数组时，默认按下拉字段导入。
- 下拉选项的提交值优先取 `index`，显示文案优先取 `description`，其次回退到 `label` / `name` / `index`。
- 字段显示名称优先取 `description` 的短标题：
  - 在 `【`、`[` 或换行前截断
  - 例如 `上传图像 1 【选填...】` 会显示为 `上传图像 1`
- 完整 `description` 不丢失，继续作为字段说明展示给用户。

## 部署说明

- 部署根目录固定为仓库根目录 `/`
- 不再使用子目录 Root Directory
- Vercel、预发、正式发布都应以当前根目录为唯一项目入口
- GitHub 默认分支与 Vercel 的 Production Branch 必须保持一致；切换正式分支时，两边一起改
- Vercel Git 自动部署必须使用 `npm run build:vercel`，确保先执行 `prisma migrate deploy` 再构建
- 如果 Vercel Dashboard 里手动配置过 Build Command，也要同步改成 `npm run build:vercel`

部署前至少检查：

- `package.json`、`src/`、`prisma/`、`next.config.ts` 都在仓库根目录
- 没有把 `.next/`、`node_modules/`、本地数据库文件一起上传
- 没有把 `_archive/` 下的历史归档内容重新带回仓库或部署上下文

## 归档规则

以下内容不再属于正式源码，统一移到同级 `_archive/`：

- 历史发布残留
- 恢复快照
- MCP 审计包
- Playwright 运行痕迹
- 临时原型稿
- 历史安装包和调试文件

## 不要这样做

- 不要打开 `_archive/` 里的目录开发
- 不要再新建二级 `ai-workbench/` 套娃目录
- 不要把 `.next/`、`node_modules/`、`*.db`、日志文件提交到 Git
- 不要把 `publish-*`、`restore-snapshots/` 当成正式项目目录

## 常见命令

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run build:vercel
npm run deploy:vercel:preview
npm run deploy:vercel:production
```
