## 2026-03-27 15:58

- 完成单应用工作台结果区、输入区与提交链路体验优化：
  - 左侧输入区改成极简结构，移除大段常驻说明文案
  - 参考图卡片新增 `查看 / 删除` 操作，删除会同步清理本地预览、上传 URL、file input 和草稿缓存
  - 任务数据补齐 `promptTemplateName / hasPromptTemplate`，结果区、详情页、抽屉页统一显示 `已选模板 / 本次提示词`
  - 结果区改成主结果舞台，多图支持主图左右切换，输入参数默认折叠到 `本次输入`
  - 结果图预览新增 `左右镜像 / 上下镜像`，并支持下载镜像后的当前图片
  - 提交接口改成“先返回任务快照，再异步继续派发/同步”，减少提交首响应等待时间
- 新增与调整的关键实现：
  - 新增 `src/lib/task-prompt-source.ts` 统一提取模板快照
  - 新增 `src/lib/client-image-download.ts` 处理镜像后当前图下载
  - 重构 `results-panel`、`results-panel-client`、`image-lightbox`、`task-output-download-actions`
  - submit route 直接透传 `submitNewTask` 返回的首帧任务快照，不再额外查一次任务详情
- 完成测试与验证：
  - `npx vitest run src/components/submit-form.test.tsx src/components/results-panel.test.tsx src/app/api/internal/tasks/submit/route.test.ts src/components/task-output-download-actions.test.tsx src/components/recent-results-panel.test.tsx src/components/admin-tasks-client.test.tsx`
  - `npx eslint "src/app/(workspace)/apps/[code]/submit-form.tsx" src/components/results-panel.tsx src/components/results-panel-client.tsx src/components/image-lightbox.tsx src/components/task-output-download-actions.tsx src/components/task-detail-drawer.tsx "src/app/(workspace)/tasks/[id]/page.tsx" src/lib/task-queue.ts src/lib/db/tasks.ts src/lib/feishu-sync.ts src/lib/task-prompt-source.ts src/lib/client-image-download.ts src/lib/types.ts src/components/results-panel.test.tsx src/app/api/internal/tasks/submit/route.ts src/app/api/internal/tasks/submit/route.test.ts`
  - `npm run build`
- 当前备注：
  - ESLint 仍保留 2 条 `no-img-element` warning，来自结果主舞台和 lightbox 的原生图片预览；当前不影响构建和功能
  - `npm run build` 仍会打印既有的 Turbopack NFT tracing warning，来源是下载路由链路对 `next.config.ts` 的追踪，不属于本轮新增问题

下一步：

- 用真实页面做一轮人工回归：参考图查看/删除、多图左右切换、镜像下载、模板提示词展示、提交后秒回
- 评估是否要把结果区和 lightbox 的原生 `<img>` 进一步收口成统一的受控图片组件

## 2026-03-26 15:49

- 完成飞书同步链路排查与修复：
  - 定位到任务已提交但未同步飞书的根因是：飞书鉴权仍然只读取环境变量中的 `FEISHU_APP_ID / FEISHU_APP_SECRET`
  - 集成设置页之前只允许配置基础地址、`App Token`、`Table ID`，导致页面看似配齐，实际无法换取 tenant access token
  - 已为飞书设置新增后台可维护的 `App ID`、`App Secret`
  - 飞书 SDK 现在会优先读取后台保存的应用凭据，再回退环境变量
  - 已补上脱敏回显与“保存时保留原密钥”逻辑，避免管理员页面把明文 secret 回显或把脱敏值误写回数据库
  - 密钥状态页现在会正确反映飞书应用凭据来自 `环境变量` 还是 `集成设置`
  - 新增 Prisma 迁移：为 `FeishuSettings` 表补充 `feishuAppId`、`feishuAppSecret`
- 完成测试与验证：
  - `npx vitest run src/lib/settings.test.ts src/app/api/internal/admin/settings/feishu/route.test.ts src/app/api/internal/admin/settings/integrations/route.test.ts src/lib/feishu-sync.test.ts`
  - `npx eslint src/lib/settings.ts src/lib/settings.test.ts src/lib/feishu.ts src/app/api/internal/admin/settings/feishu/route.ts src/app/api/internal/admin/settings/feishu/route.test.ts src/app/api/internal/admin/settings/integrations/route.ts src/app/api/internal/admin/settings/integrations/route.test.ts src/app/(workspace)/admin/settings/integrations/page.tsx`
  - `npx prisma generate`
  - `npm run build`

下一步：

- 提交、推送并部署这轮飞书同步修复
- 上线后用真实任务再走一遍“提交 -> 飞书落表 -> 成功后更新状态”人工回归

## 2026-03-26 15:06

- 完成集成设置与对外文案收口：
  - 算力通道配置改为支持 `直接 API` 和 `环境变量` 两种凭据模式
  - 历史旧配置里误填的真实 API key 会自动兼容识别为直填模式，不再因为校验失败导致无法保存
  - 后台读取直填凭据时只返回脱敏值，避免页面再次暴露真实 key
  - 集成设置页不再展示第三方 Base URL，管理员页面对外统一使用 `算力通道`
  - 密钥状态页会区分 `环境变量` 与 `集成设置` 两种来源，并按新模式显示状态
  - 单应用页、任务提交提示、上传报错、后台导航与说明文案已统一去掉供应商品牌名
- 完成测试与验证：
  - `npx vitest run src/lib/runninghub-channels.test.ts src/lib/settings.test.ts src/app/api/internal/upload/route.test.ts src/app/api/internal/tasks/submit/route.test.ts src/app/api/internal/admin/settings/integrations/route.test.ts src/app/api/internal/admin/settings/secrets/route.test.ts src/components/app-workbench-client.test.tsx src/components/submit-form.test.tsx`
  - `npx vitest run src/components/app-form-editor.test.tsx src/components/use-app-tasks.test.tsx`
  - `npx eslint src/lib/types.ts src/lib/runninghub-channels.ts src/lib/settings.ts src/lib/runninghub.ts src/lib/task-queue.ts src/lib/user-facing-errors.ts src/lib/navigation.ts src/lib/db/admin.ts src/app/api/internal/admin/settings/integrations/route.ts src/app/(workspace)/admin/settings/integrations/page.tsx src/app/(workspace)/admin/settings/secrets/page.tsx src/app/(workspace)/apps/[code]/submit-form.tsx src/components/app-form-editor.tsx src/lib/runninghub-channels.test.ts src/lib/settings.test.ts src/app/api/internal/upload/route.test.ts src/app/api/internal/tasks/submit/route.test.ts src/app/api/internal/admin/settings/integrations/route.test.ts src/app/api/internal/admin/settings/secrets/route.test.ts src/components/app-workbench-client.test.tsx src/components/submit-form.test.tsx src/components/app-form-editor.test.tsx`
  - `npm run build`

下一步：

- 将本轮集成设置与文案收口改动提交并推送
- 部署后用真实后台配置一次 `直接 API` 和 `环境变量` 两种通道，做一遍人工回归

## 2026-03-26 14:10

- 完成单应用提交链路修复：
  - 上传图片失败时，前端不再显示算力通道 API key、环境变量名或原始内部报错
  - 通道配置新增环境变量名格式校验，避免把真实 key 误存到旧的环境变量字段
  - 历史非法通道配置会在读取时脱敏兼容，不再继续对前端暴露
  - 提交任务接口现在会返回任务快照和提交状态：`RUNNING / QUEUED / FAILED`
  - 缺少可用通道、缺少 key、应用映射缺失等不可恢复问题会直接反馈为失败，不再静默排队重试
  - 单应用工作台提交后会立即把新任务插入右侧“全站任务”列表并选中，不再只依赖 SSE
- 完成测试与验证：
  - `npx vitest run src/app/api/internal/upload/route.test.ts src/app/api/internal/tasks/submit/route.test.ts src/lib/runninghub-channels.test.ts src/components/app-workbench-client.test.tsx src/components/submit-form.test.tsx src/components/use-app-tasks.test.tsx`
  - `npx eslint src/lib/env-key-names.ts src/lib/user-facing-errors.ts src/lib/runninghub-channels.ts src/lib/settings.ts src/lib/types.ts src/app/api/internal/upload/route.ts src/app/api/internal/upload/route.test.ts src/app/api/internal/tasks/submit/route.ts src/app/api/internal/tasks/submit/route.test.ts src/app/api/internal/tasks/[id]/poll/route.ts src/lib/task-queue.ts src/lib/runninghub-channels.test.ts src/components/use-app-tasks.ts src/components/app-workbench-client.tsx src/components/app-workbench-client.test.tsx src/components/left-panel.tsx src/app/(workspace)/apps/[code]/submit-form.tsx src/components/submit-form.test.tsx src/components/use-app-tasks.test.tsx`
  - `npm run build`

下一步：

- 用真实单应用页面做一次人工回归：上传图、断开/恢复算力通道 key、提交成功、提交失败、进入本地队列 3 条路径都走一遍
- 评估是否把其他用户可见路由里的第三方原始错误也统一切到同一套安全错误映射

## 2026-03-25 21:44

- 完成线上后台页 `Server Components render` 的真实根因排查与修复：
  - 已确认生产数据库 schema 本体已存在，但 `_prisma_migrations` 缺少 `20260324190000_postgres_baseline`
  - 已对生产库执行 `prisma migrate resolve --applied 20260324190000_postgres_baseline`
  - 已确认生产库 `prisma migrate status` 返回 `Database schema is up to date!`
- 完成 Vercel 生产环境与运行时修复：
  - 已从本机成功 `vercel link` 到项目 `hz-ai`
  - 已拉取并核对生产环境变量
  - 已发现原生产 `DATABASE_URL` / `DIRECT_URL` 都指向 Supabase session pooler `5432`
  - 已定位真实运行时错误为 `MaxClientsInSessionMode: max clients reached`
  - 已将 Vercel Production `DATABASE_URL` 改为 transaction pooler `6543`，并补上 `pgbouncer=true&connection_limit=1`
  - 已在代码中为 Supabase pooler 增加 Prisma 连接归一化，自动补齐上述参数并将连接池上限收紧到 `1`
- 已重新触发两次 Production 部署并完成回归：
  - 当前正式生产部署已切到 `https://hz-b0xn0kx4a-mubai123456s-projects.vercel.app`
  - 已通过真实浏览器验证：`/admin/apps`、`/admin/apps/new`、`/admin/apps/2-0`、`/admin/categories`、`/admin/settings/integrations`
  - 最新 Vercel logs 中已不再出现 `MaxClientsInSessionMode`
- 已完成本地验证：
  - `npx vitest run src/lib/prisma.test.ts`
  - `npx vitest run src/lib/prisma-runtime-diagnostics.test.ts "src/app/(workspace)/error.test.tsx"`
  - `npm run build`

下一步：

- 将这次线上修复相关代码整理提交到 GitHub
- 在 Vercel Dashboard 再补查一次 Production Branch 是否仍指向正式分支
- 后续如拿到 Supabase direct connection，考虑把 `DIRECT_URL` 从 pooler 5432 切到真正的直连地址

## 2026-03-25 21:29

- 完成 `Vercel CLI` 全局安装前检查：
  - 已确认官方 npm 包名为 `vercel`
  - 当前最新版本为 `50.37.0`
  - 包首页为 `https://vercel.com`
  - 仓库来源为 `https://github.com/vercel/vercel`
  - 发布许可证为 `Apache-2.0`
  - 命令入口为 `vercel` / `vc`
- 已完成本机全局安装：
  - 执行 `npm install -g vercel@50.37.0`
  - 安装位置为 `C:\Users\Administrator\AppData\Roaming\npm`
  - 当前用户 PATH 已包含该全局目录
- 已完成命令验证：
  - `vercel --version`
  - `vc --version`
  - `Get-Command vercel`
- 当前状态：
  - `vercel` 与 `vc` 命令均可直接使用
  - 当前命令实际指向 `C:\Users\Administrator\AppData\Roaming\npm\vercel.ps1`
  - 本轮只完成 CLI 安装和本机命令校验，未继续执行账号登录或项目绑定

下一步：

- 如需接入当前仓库，执行 `vercel login`
- 登录后在仓库根目录执行 `vercel link`
- 再按需要执行 `vercel deploy` 或 `vercel --prod`

## 2026-03-25 21:27

- 完成外部工具 `CJFCodexSwitcher` 的安装前安全审查与本机落地验证：
  - 已检查仓库来源、更新时间、依赖、网络访问点与安装脚本写入范围
  - 已确认工具会读写 `C:\Users\Administrator\.codex\auth.json`，并把账号快照保存到 `C:\Users\Administrator\codex-switcher\accounts`
- 已完成安装与启动验证：
  - 从 `https://github.com/mileson/CJFCodexSwitcher` 克隆到工作区 `.external/CJFCodexSwitcher`
  - 运行 `python install.py` 安装到 `C:\Users\Administrator\codex-switcher`
  - 修正 Windows 控制台编码导致的安装输出异常，确认 `C:\Users\Administrator\bin\codex-switcher.cmd` 已生成
  - 已把 `C:\Users\Administrator\bin` 追加到当前用户 PATH，后续新开终端可直接使用 `codex-switcher`
- 已完成命令验证：
  - `codex-switcher --list --json`
  - `codex-switcher --best --json`
  - `codex-switcher --refresh --json`
  - `codex-switcher --save-current --json`
- 当前状态：
  - 已成功读取当前账号 `ccx060918@gmail.com` 的 TEAM 配额数据
  - 交互界面可启动
  - 当前机器上的官方 `codex` 命令仍返回 `Access is denied`，因此切换器调用 `codex login` 添加新账号的能力暂时无法完成闭环验证

下一步：

- 如需完整使用“添加账号 / 切换后自动重登”流程，先排查并修复本机 `codex` 命令权限问题
- 如后续要长期保留该工具，可考虑单独建一个工具目录统一管理外部辅助仓库

## 2026-03-25 21:02

- 定位并修正线上 `Server Components render` 的高概率结构性根因：
  - 当前仓库新增了 `AppTag`、`AppCategory`、`App.showcaseImagesJson`、`App.estimatedPriceFen` 等新表/字段
  - Vercel Git 自动部署默认只会构建，不会自动执行 `prisma migrate deploy`
  - 这会导致代码已更新、数据库未更新时，`/admin/apps` 等后台页在服务端查询阶段直接炸成通用 production 错误
- 已完成代码侧修复：
  - 新增 `npm run build:vercel`，统一执行 `prisma migrate deploy && next build`
  - 在 `vercel.json` 中固定 `buildCommand` 为 `npm run build:vercel`
  - 新增 Prisma schema mismatch 诊断工具，遇到 `P2021 / P2022 / no such table` 时输出明确服务端日志
  - 后台高风险页改为在 schema 落后时显示明确运维提示，不再只落到泛化错误页
  - 工作区错误页会显示 `digest`，方便后续直接对照 Vercel logs
- 已完成验证：
  - `npx vitest run src/lib/prisma-runtime-diagnostics.test.ts`
  - `npx vitest run "src/app/(workspace)/error.test.tsx"`
  - `npm run build`

下一步：

- 在生产数据库执行 `prisma migrate deploy`
- 重新触发一次 Vercel production 部署
- 回归 `/admin/apps`、`/admin/apps/new`、`/admin/apps/[code]`、`/admin/categories`、`/admin/settings/integrations`

## 2026-03-25 20:12

- 完成 GitHub 侧收尾：
  - 将仓库默认分支切到 `codex/repo-root-consolidation-clean`
  - 删除旧远端分支 `codex/github-publish-1-13`
  - 当前远端只保留 1 条正式工作分支
- 再次确认最外层文件夹改名阻塞仍来自当前工作区进程占用：
  - 目标改名：`D:\2.文档\5.AI编程项目\5.内部AI网站` -> `D:\2.文档\5.AI编程项目\ai-workbench`
  - 需要关闭当前 Codex 窗口和打开该目录的资源管理器后，才能执行改名
- 确认部署平台为 Vercel：
  - 本机 Vercel CLI 可用
  - 浏览器当前未登录 Vercel，因此本轮未能直接改线上项目的 Production Branch
  - 已在文档中补充长期规则：GitHub 默认分支与 Vercel Production Branch 必须保持一致

下一步：

- 关闭当前占用仓库目录的 Codex / 资源管理器窗口后，执行最外层文件夹改名
- 登录 Vercel 后，将目标项目的 Production Branch 对齐到当前正式分支
- 如后续要收口到新的长期分支，再同步修改 GitHub 默认分支与 Vercel Production Branch

## 2026-03-25 19:30

- 完成仓库结构收口的第一阶段：
  - 将真正的应用源码从旧子目录上移到仓库根目录
  - 新根目录现在直接包含 `src/`、`prisma/`、`public/`、`scripts/`、`docs/`、`package.json`
  - 历史发布残留、恢复快照、MCP 审计目录、Playwright 痕迹和安装包已移到同级 `_archive/ai-workbench-20260325-192113/`
- 重写根目录 `.gitignore`：
  - 忽略 `node_modules`、`.next`、`.local-run`、`output`、`*.db`、日志、`_archive`
  - 以后在根目录执行 `npm install` / `npm run dev` / `npm run build` 不会再把生成物带进 Git
- 重写根目录 `README.md`、`log.md`、`memory.md`：
  - README 现在明确说明正确打开的目录、正式结构、开发命令、部署根目录和禁止做法
  - memory 收口为长期有效规则，不再混入大段历史变更记录
- 在新根目录完成验证：
  - `npm install`
  - `npm run test`
  - `npm run build`
  - 生产态 smoke：`/login`、`/admin`、`/apps`
- 已删除旧的二级 `ai-workbench/` 空壳目录
- 已定位最外层目录改名阻塞：
  - 旧 Notepad++ 句柄已清理
  - 当前剩余阻塞来自正在使用该工作区的 Codex/资源管理器窗口，需关闭后再执行最终改名

下一步：

- 将本轮仓库整理提交并推送到 GitHub
- 关闭当前占用仓库根目录的 Codex/资源管理器窗口
- 最后把最外层文件夹从 `5.内部AI网站` 改名为 `ai-workbench`

## 2026-03-25 23:25

- 完成单应用模板导入语义修正：
  - `fieldData` 中带选项元数据的节点会自动识别为下拉框
  - 下拉选项显示文案优先使用 `description`，提交值保持使用 `index/value`
  - 字段显示名称优先从 `description` 提取人话标题，不再默认暴露 `aspectRatio`、`resolution`、`channel`
  - 长描述采用“短标题 + 完整说明”策略，标题更短，说明区保留完整原文
- 更新了样本应用语义：
  - `设置比例`
  - `分辨率`
  - `第三方/官方切换`
  - `输入文本`
  - `上传图像 1/2/3`
- 补齐并跑通定向验证：
  - `src/lib/app-parser.test.ts`
  - `src/components/app-form-editor.test.tsx`
  - `src/components/submit-form.test.tsx`
  - `npm run build`

下一步：

- 用真实 API 示例再次走一遍“导入 -> 保存 -> 前台打开”人工回归
- 如需让图片字段也展示完整辅助说明，再决定是否补一个轻量说明区而不是把长文案塞进标题
