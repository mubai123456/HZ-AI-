## 2026-03-25 仓库收口与目录重构

### 当前阶段

- [x] 确认真正的应用源码来源是旧子目录 `ai-workbench/`
- [x] 将正式源码上移到仓库根目录
- [x] 将历史发布残留、恢复快照、MCP 审计目录和安装包移到同级 `_archive/`
- [x] 重写根目录 `.gitignore`
- [x] 重写根目录 `README.md`、`log.md`、`memory.md`
- [x] 清理最后一个被系统占用的旧 `ai-workbench/` 空壳目录
- [x] 在新根目录下重新跑 `npm install`
- [x] 在新根目录下重新跑 `npm run test`
- [x] 在新根目录下重新跑 `npm run build`
- [x] 将 GitHub 默认分支切到 `codex/repo-root-consolidation-clean`
- [x] 删除旧远端默认分支 `codex/github-publish-1-13`
- [ ] 将最外层文件夹从 `5.内部AI网站` 改名为 `ai-workbench`
- [ ] 登录 Vercel 并将线上项目的 Production Branch 对齐到当前正式分支

### Review

- 这轮不改业务代码、不改接口、不改数据库 schema，目标是消除“根目录和子目录都像项目”的结构性风险。
- 现在开始，正式项目的唯一入口应该是仓库根目录，而不是任何二级目录或历史快照目录。
- 根目录验证已通过：测试 `48/48` 文件通过，构建通过，生产态页面 `/login`、`/admin`、`/apps` 可正常打开。
- 旧二级 `ai-workbench/` 空壳目录已删除；当前仅剩“最外层 Windows 文件夹改名”为环境级收尾，不影响 Git 仓库结构本身。
- GitHub 侧已经收口为单一正式分支；当前剩余部署侧动作是登录 Vercel 并核对 Production Branch。

## 2026-03-25 恢复到 1.11 并改成案例 + 结果区

### 新完成
- [x] 创建恢复前快照：`restore-snapshots/20260325-025706-before-restore-1.11/`
- [x] 备份当前 `HEAD`、git 状态、数据库文件和会影响验证的未跟踪日志
- [x] 将工作区切到 `0912160`，并创建分支 `codex/restore-1-11-case-results`
- [x] 将单应用页中间主区从“独立案例块 + 结果区”改成“案例展示 + 结果工作区”连续布局
- [x] 保持 `/tasks/[id]` 独立任务详情页不变
- [x] 为 `AppShowcaseGallery` 增加嵌入式变体，收紧中间区首屏高度
- [x] 为 `ResultsPanel` 增加上方插入内容能力和显式“结果工作区”标题
- [x] 补齐 `results-panel` 与 `app-showcase-gallery` 定向测试
- [x] 通过定向 `vitest`
- [x] 通过相关 `eslint`
- [x] 通过 `DATABASE_URL=file:./dev.db npm run build`
- [x] 通过真实浏览器验证 `/apps/[code]` 与 `/tasks/[id]`
- [x] 修复恢复后旧登录 cookie 导致的任务提交外键错误
- [x] 为 `getCurrentSession` 补充“数据库用户存在性校验”测试
- [x] 为 `1.11` 本地开发模式补充 `.env.local`，固定回旧 SQLite `dev.db`
- [x] 恢复被误删的两条最新任务 `WB-000008 / WB-000009`
- [x] 为 RunningHub 失败任务保留详细失败原因，例如显存不足告警
- [x] 为单应用页补充空会话兜底，避免 `session!` 空指针
- [x] 将单应用页中间主区从上下连续布局收口为统一“结果区”，并提供“结果 / 案例”双标签页

### 下一步
- [ ] 如果你还想继续往旧版本退，再对照 `631dcc7` 或更早版本
- [ ] 如果要恢复旧 SQLite 业务数据，单独执行数据恢复，不和版本回退混做

### Review
- 这轮恢复不是直接把 `main` 硬回滚，而是在新分支上把工作区切到 `1.11`，同时保留恢复前快照，后退和回看都更安全。
- `1.11` 在当前机器上构建时需要显式使用 `DATABASE_URL=file:./dev.db`，否则会被本地 `.env` 里的其他数据库配置干扰。
- 恢复旧数据库后，浏览器里残留的旧版本 session cookie 可能仍带着不存在的 `user.id`；现在会话层已改为回库校验，失效会话会直接回到登录态，不再拖到 `task.create` 时才报外键错误。
- 这轮也确认了第三方失败和前端可见性要分开判断：`WB-000008 / WB-000009` 的真实状态都是失败，之前看不到是因为恢复时被误删；现在已按真实失败状态补回。

## 2026-03-24 Codex 中文乱码排查与修复
### 新完成
- [x] 复现 Codex shell 中 `Get-Content -Raw` 读取中文 Markdown 时的乱码现象
- [x] 用十六进制检查确认 `log.md` / `memory.md` 文件本体仍是正常 UTF-8
- [x] 将根因定位为 Windows PowerShell 5.1 的默认读取编码和控制台编码，而不是仓库业务代码
- [x] 在 `C:\Users\Administrator\Documents\WindowsPowerShell\profile.ps1` 中统一强制 UTF-8 控制台 I/O
- [x] 为 PowerShell 5.1 补齐 `Get-Content / Out-File / Set-Content / Add-Content` 的 UTF-8 默认值
- [x] 通过 `Get-Content -Raw` 重新验证 `ai-workbench/memory.md`、`ai-workbench/log.md`、`tasks/lessons.md` 中文输出已恢复正常
- [x] 同步更新 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 如仍有已经打开的旧 Codex shell 会话，重开一次会话让新的 PowerShell profile 生效

### Review
- 这次问题的关键不是修 Markdown 文件，而是修 Codex 依赖的 PowerShell 启动编码策略。
- 现在线路已经从“读文件时偶发乱码”改成“默认按 UTF-8 读取和输出”，后续中文日志与记忆文件会稳定很多。

## 2026-03-24 单应用乱码修复、预计费用强化与任务中心预览
### 新完成
- [x] 修复单应用提交区关键乱码文案：`提示词模板 / 清空模板 / 清空草稿 / 提交任务 / 上传中...`
- [x] 将 `预计费用` 移入底部 `提交任务` 卡片，并放到提交动作下方强化展示
- [x] 收紧全局链接样式，修复蓝底按钮与左侧导航激活态文字被覆盖的问题
- [x] 为任务中心列表新增 `结果预览` 列
- [x] 支持任务中心点击缩略图直接打开 lightbox 放大查看
- [x] 保持站内编号与应用名可进入任务详情页
- [x] 清理 `app-form-editor` 中后台高频可见乱码
- [x] 补齐 `submit-form` 与 `admin-tasks-client` 定向测试
- [x] 通过定向 `vitest`
- [x] 通过定向 `eslint`
- [x] 通过生产构建
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 用真实浏览器回归左侧导航激活态、单应用提交卡和任务中心缩略图预览
- [ ] 继续做一次更宽范围的运营页人工走查，确认没有遗漏的用户可见乱码

### Review
- 本轮先收根因，再做页面修复：先改全局链接继承，再修菜单和蓝底主操作，最后补单应用与任务中心细节。
- 定向扫描未再检出这批典型乱码串，测试、lint 和构建也都通过；当前剩余更适合做一次真实浏览器走查，而不是继续盲改。

## 2026-03-24 单应用提交区最终收口
### 新完成
- [x] 将 `清空` 从底部提交区移到 `参考图输入` 标题右侧
- [x] 删除底部独立费用卡与并列双按钮结构
- [x] 将底部收成唯一双行主按钮：`提交任务 / 预计￥XX元`
- [x] 保持继续复用每应用已有预计费用配置，不新增按钮文案字段
- [x] 更新 `submit-form` 组件测试
- [x] 通过定向 `vitest`
- [x] 通过定向 `eslint`
- [x] 通过 `bun run build`

### 下一步
- [ ] 用真实浏览器确认双行按钮在窄侧栏中的视觉比例是否还要微调

### Review
- 这轮收口的关键不是再加信息，而是把底部主操作恢复成唯一入口。
- 目前结构已经和你的最终口径一致，后续只需要做视觉细调，不建议再往底部加新的说明块或次级按钮。

## 2026-03-23 19:58 参考图标签回调
### 新完成
- [x] 恢复三列参考图槽位下方的“主参考图 / 辅助图”标签
- [x] 将标签保持在槽位外部，避免重新覆盖到图片上
- [x] 将主参考图标签改为更醒目的蓝色强调样式
- [x] 保持无清空按钮、无“点击替换”覆盖文案、整块点击可替换图片
- [x] 通过 `npx vitest run src/components/submit-form.test.tsx`
- [x] 通过 `npx eslint "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/components/submit-form.test.tsx"`

### 下一步
- [ ] 视真实视觉效果决定是否继续压缩标签和图片之间的间距

### Review
- 这轮不是推翻前一版，而是在保留“纯净图片槽位”的前提下，把主辅语义用更克制的方式加回来。

## 2026-03-23 19:54 参考图上传槽位去文案化
### 新完成
- [x] 移除单应用页参考图缩略图槽位内的可见文案、渐变遮罩和清空按钮
- [x] 保留已上传图片整块点击即可重新选择文件替换的交互
- [x] 更新 `submit-form` 定向测试，覆盖“可替换上传”与“无可见文案/清空按钮”
- [x] 通过 `npx vitest run src/components/submit-form.test.tsx`
- [x] 通过 `npx eslint "src/app/(workspace)/apps/[code]/submit-form.tsx" "src/components/submit-form.test.tsx"`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 用真实浏览器确认三列槽位在窄左栏下的点击热区和 hover 反馈是否还需要继续弱化

### Review
- 这轮不是改上传逻辑，而是收掉会打乱三列缩略图节奏的覆盖层；核心目标是保留“替换”能力，同时减少视觉噪音。

## 2026-03-23 18:31 单应用模板瘦身与全站任务侧栏改造
### 新完成
- [x] 将 `/apps/[code]` 改成「顶栏返回应用列表 + 应用名 / 左侧输入工作台 / 中间结果工作区 / 右侧全站任务流」
- [x] 移除页面内 `Workbench` 头卡和左侧 `Workspace` 说明卡
- [x] 将右侧任务区改为当前用户的全站任务列表，默认按创建时间倒序展示
- [x] 为 `Task` 新增站内任务编号 `siteTaskNo`，格式固定为 `WB-000001`
- [x] 提交任务时先分配 `siteTaskNo`，并为历史任务提供回填迁移
- [x] 前端同时展示站内任务编号和第三方任务 ID，第三方 ID 默认折叠
- [x] 限制“一键同款”仅支持当前应用任务，跨应用任务只允许查看结果
- [x] 调整任务映射规则，使任务所有者也能看到自己的 `providerTaskId`
- [x] 更新 `RecentResultsPanel / SubmitForm / WorkbenchLayout / WorkbenchShell` 相关测试与实现
- [x] 通过 `npx vitest run src/components/use-app-tasks.test.tsx src/components/results-panel.test.tsx src/components/recent-results-panel.test.tsx src/components/submit-form.test.tsx src/lib/db/tasks.test.ts src/lib/db/users.test.ts src/lib/feishu-sync-jobs.test.ts`
- [x] 通过 Workbench 相关 `eslint`
- [x] 通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 评估全站任务流在真实高任务量下是否需要分页、筛选或虚拟列表
- [ ] 评估是否需要补“只看当前应用 / 只看失败任务 / 回到最近复用任务”的轻量筛选

### Review
- 本轮不是纯样式微调，而是同时改了页面骨架、任务数据源、任务编号模型、权限可见性和同款回填边界。
- 已完成针对性测试、lint 和生产构建验证；当前实现可继续进入真实浏览器体验打磨阶段。

# AI Workbench Todo

## 2026-03-23 17:05 单应用模板 UX 重构
### 新完成
- [x] 将 `/apps/[code]` 收敛为「左侧输入工作台 + 中间结果主画布 + 右侧单张最新任务卡」
- [x] 压缩 `WorkbenchLayout` 顶部信息，移除重复结果摘要，保留应用名、状态与少量面板控制
- [x] 将右栏从“当前任务 + 最近任务”改为只显示 1 个最新任务卡，不再做列表切换
- [x] 将 `SubmitForm` 改为应用级草稿工作台：提交后不清空、支持本地草稿恢复、支持手动清空
- [x] 将提交按钮改为左侧底部常驻操作条，并补齐低频参数折叠
- [x] 将结果区输入摘要改为默认折叠，并新增“再次生成”复用入口
- [x] 移除单应用页对 `?task=` 的实时切换依赖，只保留首次进入定位
- [x] 更新相关测试：`submit-form`、`recent-results-panel`、`results-panel`、`use-app-tasks`
- [x] 通过 `npx vitest run src/components/use-app-tasks.test.tsx src/components/recent-results-panel.test.tsx src/components/results-panel.test.tsx src/components/submit-form.test.tsx`
- [x] 通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`
- [x] 用真实浏览器回归 `/apps/[code]` 的桌面端、平板端、手机端首屏密度与抽屉手感
- [x] 修复单应用页在路由离开再返回后，下拉参数草稿未恢复的问题

### 下一步
- [ ] 评估是否继续压缩顶部状态条与右侧最新任务卡的信息密度

### Review
- 本轮没有改数据库 schema，也没有改提交流程，只重排了单应用页的信息层级与客户端状态。
- 当前已经完成组件测试、生产构建和真实浏览器回归，单应用页的首屏闭环与抽屉退化都已跑通。
- 真实回归过程中额外发现并修复了一个 SSR/路由返回场景下的草稿恢复问题，因此这轮比单纯的组件级验证更可靠。
- 用户随后反馈的 hydration mismatch 已补修：`SubmitForm` 首帧不再直接读取 `localStorage` 改 DOM 结构，开发态不应再出现这类 server/client 首屏不一致警告。

## 2026-03-23 14:21 Phase 4 回归与治理固化

### 新完成
- [x] 对照治理文档执行 Phase 4 回归验收
- [x] 启动本地生产服务并完成真实浏览器验收
- [x] 验证站点设置、集成设置、密钥状态三块入口
- [x] 验证工作台、素材大厅、素材管理、任务中心关键页面
- [x] 验证 `390 x 844` 移动端壳层导航可打开
- [x] 新增 Phase 4 正式文档：
  - [x] `docs/governance/20-phase4-regression-report.md`
  - [x] `docs/governance/21-governance-guardrails.md`
  - [x] `docs/governance/22-extension-admission-rules.md`
- [x] 归档浏览器证据到 `output/playwright/phase4/`
- [x] 重新通过配置中心定向测试
- [x] 重新通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`、`docs/governance/README.md`

### 结论
- [x] Phase 4 完成

### 残余风险
- [x] 处理历史素材预览文件缺失导致的受控 `404` 控制台噪音

## 2026-03-23 15:40 素材大厅与素材管理体验重构

### 新完成
- [x] 将 `素材大厅` 改成卡片内 inline video 预览主路径
- [x] 桌面端接入悬停播放，滚动切换当前活跃卡片
- [x] 保留完整大预览为次级动作，不再占主链路
- [x] 将顶部额度区降级为轻量 quota hint
- [x] 将 `素材管理` 重排为“筛选栏 -> 列表 -> 选中后批量工具栏”
- [x] 让批量工具栏默认隐藏，仅在有选中素材时显示
- [x] 将单条素材操作改为“查看”入口
- [x] 接入右侧详情抽屉，承接预览、编辑、上下架、删除
- [x] 重新通过目标测试：`material-hall-client` + `admin-materials-client`
- [x] 修复本轮构建暴露的类型问题并重新通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 用真实浏览器回归桌面 hover 播放与手机端主视区自动播放
- [ ] 评估是否需要为素材管理详情抽屉补充更多运营上下文

### Review
- 本轮按已确认方案完成了两条主线重构，且没有改数据库 schema。
- 验证以组件测试 + 生产构建为准，当前实现已具备继续做真实浏览器体验回归的基础。

## 2026-03-23 13:05 Phase 2 壳层与模板统一

### 计划中
- [x] 将工作台导航从扁平数组升级为分组导航，并收敛壳层标题语义
- [x] 新增共享页面模板骨架，统一页头与内容层级
- [x] 接入第一批高优页面：`/apps`、`/apps/[code]`、`/admin/apps`、`/admin/materials`、`/admin/prompt-templates`、`/admin/users`
- [x] 通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一批
- [x] 将 `PageTemplate` 继续扩展到 `/tasks`、`/sync`、`/admin` 等剩余高频页面
- [x] 为后台删除类操作新增统一确认对话框，并替换 `/admin/apps`、`/admin/prompt-templates`、`/admin/users` 的原生 `window.confirm`
- [x] 修正 `/admin/users` 单条启停沿用 bulk 选择集的错误路径，改为独立单条更新
- [x] 再次通过 `bun run build`

### 后续继续
- [x] 新增共享表单对话框，并替换 `/admin/apps`、`/admin/categories`、`/admin/banners` 的首批输入型 `window.prompt`
- [x] 将 `admin-users`、`admin-prompt-templates` 中的多字段 `window.prompt` 收敛成标准表单对话框
- [x] 收敛 `admin-materials`、`app-form-editor` 中剩余原生 `window.prompt / confirm`
- [ ] 继续完善 `Settings / Editor / Detail Inspection` 模板的实现层骨架
- [ ] 评估是否为 `category-manager`、`banner-manager`、`app-form-editor` 统一接入共享确认对话框
- [ ] 继续检查 `category-manager`、`banner-manager` 是否还需要补共享确认对话框以保持完全一致

## 2026-03-23 12:20 补充进展

### 新完成
- [x] 重新接上提示词模板列表的批量前端入口
- [x] 将应用标签管理器升级为完整 CRUD + bulk 管理入口
- [x] 将提示词标签与模板分类管理器升级为统一 bulk 管理器
- [x] 再次通过 `bun run build`

### 仍待继续
- [ ] 为提示词模板 bulk 入口补更聚焦的组件测试或路由测试
- [ ] 为应用标签管理器补交互测试

## 2026-03-23 后台列表统一 CRUD 与批量管理

### 已完成

- [x] 抽出统一批量类型与汇总工具
- [x] 为 apps/users/prompt-templates/categories/banners/app-tags 增加 bulk 数据层能力
- [x] 新增对应后台 bulk 路由
- [x] 抽出 `use-list-selection` 与 `admin-bulk-toolbar`
- [x] 改造应用列表支持勾选、全选当前筛选结果和批量操作
- [x] 改造用户列表支持筛选、勾选和批量操作
- [x] 改造分类列表支持勾选和批量操作
- [x] 改造 Banner 列表支持勾选和批量操作
- [x] 通过 `bun run build`

### 待继续

- [ ] 重新接上提示词模板列表的批量前端入口
- [ ] 把应用标签管理器升级为完整 CRUD + bulk 入口
- [ ] 把提示词标签与模板分类管理器升级为统一 bulk 管理器
- [ ] 为本轮新增 bulk 路由补充更聚焦的自动化测试

### Review

- `bun test` 目前没有通过，失败集中在现有测试运行环境：
  - Bun + Prisma SQLite (`better-sqlite3`) 兼容限制
  - 现有测试代码依赖 `vi.stubGlobal`、`vi.hoisted`、`vi.setSystemTime` 等 API，但当前运行环境不支持
  - 若要继续补自动化验证，建议下一轮先统一测试运行时或改成 Node/Vitest 兼容写法

## Checklist

- [x] 排查素材后台批量上传失败的根因
- [x] 将上传链路改为逐文件稳定协议，并返回逐条结果
- [x] 补齐素材标签 CRUD 接口与数据层逻辑
- [x] 新增素材批量处理接口，支持改标签、上架、下架、删除、重置回公海
- [x] 重构 `AdminMaterialsClient` 为“列表为主 + 上传弹窗”的运营工作流
- [x] 为素材列表加入批量选择和批量工具栏
- [x] 保留单条编辑弹窗，并与批量操作共用同一套更新逻辑
- [x] 重构素材大厅页面为移动优先布局
- [x] 为素材大厅补充搜索、标签 chips 和 URL 驱动筛选
- [x] 为素材大厅补充可领取视频标签聚合查询
- [x] 调整素材大厅预览层为移动端全屏 + 桌面端分栏结构
- [x] 补回缺失的 `admin-users-client`，恢复全量构建
- [x] 修复素材预览文件缺失时返回 500 的问题
- [x] 补充素材数据层、API 路由、组件交互测试
- [x] 通过本轮相关 `vitest` 验证
- [x] 通过 `bun run build`
- [x] 更新 `README.md`、`log.md`、`memory.md`

## Review

### 本轮完成

- 后台素材管理已从脆弱的大 `FormData` 上传改为逐文件提交，批量上传失败时能按文件返回明确结果。
- 后台素材标签现在支持新建、重命名、删除，并会同步影响历史素材和筛选结果。
- 后台素材列表补齐了运营需要的批量工具栏，支持批量改标签、批量上架、批量下架、批量删除、批量重置回公海。
- 素材大厅已升级为移动优先浏览页：
  - 手机端单列大卡流，强调先看封面、再预览、再领取下载
  - 桌面端高密度网格，适合横向比较多个视频
  - 搜索、标签 chips、URL 状态保持一致
  - 预览层按移动端与桌面端分别优化
- 构建过程中发现仓库缺失 `admin-users-client`，本轮已补上一个可用的用户管理客户端，恢复 `/admin/users` 页面编译与构建。
- 浏览器联调中发现素材预览文件缺失会触发服务端 500，本轮已修复为正常 404。

### 已验证

- `npx vitest run src/lib/db/materials.test.ts src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx src/app/api/internal/admin/material-tags/[id]/route.test.ts src/app/api/internal/admin/materials/bulk/route.test.ts src/app/api/internal/admin/materials/upload/complete/route.test.ts`
- `bun run build`
- `npx vitest run src/lib/material-storage.test.ts src/lib/db/materials.test.ts src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx src/app/api/internal/admin/material-tags/[id]/route.test.ts src/app/api/internal/admin/materials/bulk/route.test.ts src/app/api/internal/admin/materials/upload/complete/route.test.ts`
- `bun run build`

### 风险与遗留

- 本轮已完成接口、数据层和主要交互重构，但浏览器级真机回归仍被本地开发环境中的运行时异常干扰，结论还不完整。
- 素材大厅当前先保留“搜索 + 单标签过滤”，尚未扩展排序、多标签组合或分页策略。
- 仓库仍是脏工作区，存在与本轮无关的历史改动；本次没有处理这些无关项。
## 2026-03-23 12:30 运行时异常收尾

### 新完成
- [x] 确认素材大厅在生产模式下的标签筛选和预览交互正常
- [x] 将素材大厅移动端首屏压缩到 `390x844` 下可容纳 2 张完整卡片
- [x] 将素材大厅桌面宽屏网格修正为真实 5 列
- [x] 修复 `/admin/prompt-templates` 构建阻塞，恢复页面可构建状态
- [x] 再次通过 `bun run build`

### 仍待继续
- [ ] 评估是否要继续清理历史素材预览文件缺失造成的 `/preview` 404 噪音
- [ ] 如运营确认有需要，再补素材大厅排序与更多标签筛选
## 2026-03-23 13:40 Phase 2 最后收口

### 新完成
- [x] 将 `category-manager` 的单条删除和批量删除改为共享 `ConfirmDialog`
- [x] 将 `banner-manager` 的单条删除和批量删除改为共享 `ConfirmDialog`
- [x] 完成 `src/components` 范围内 `window.confirm / window.prompt` 清零检索
- [x] 再次通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`、`docs/governance/README.md`

### 下一步
- [ ] 进入下一阶段，补齐 `Settings / Editor / Detail Inspection` 模板骨架
- [ ] 评估是否开始 Phase 3 的配置中心与功能整合
## 2026-03-23 14:10 Phase 2 模板深化

### 新完成
- [x] 将 `/admin/apps/new` 接入统一 `PageTemplate`，作为 `Editor` 模板样板页
- [x] 将 `/admin/apps/[code]` 接入统一 `PageTemplate`，并让 `AppFormEditor` 支持嵌入模式
- [x] 将 `/admin/settings/feishu` 接入统一 `PageTemplate`，作为 `Settings` 模板样板页
- [x] 将 `/tasks/[id]` 接入统一 `PageTemplate`，作为 `Detail Inspection` 模板样板页
- [x] 再次通过 `bun run build`

### 下一步
- [ ] 继续推进第三批模板页：`/assets`、`/profile`、`/admin/categories`、`/admin/banners`
- [ ] 评估是否需要从 `PageTemplate` 拆出更显式的 `Settings / Detail` 模板壳层组件
## 2026-03-23 14:35 Phase 2 第三批模板页

### 新完成
- [x] 将 `/assets` 接入统一 `PageTemplate`，纳入 Browse 模板体系
- [x] 将 `/profile` 接入统一 `PageTemplate`
- [x] 将 `/admin/categories` 接入统一 `PageTemplate`
- [x] 将 `/admin/banners` 接入统一 `PageTemplate`
- [x] 再次通过 `bun run build`

### 下一步
- [ ] 继续净化 `MaterialHallClient` 与 `ProfileClient` 的内部页头，避免模板接入后仍保留重复标题语义
- [ ] 评估是否需要为 `Browse / Profile` 再拆更明确的模板槽位
## 2026-03-23 14:55 Phase 2 页头净化

### 新完成
- [x] 将 `MaterialHallClient` 的内部页头收敛到 `embedded` 模式
- [x] 将 `ProfileClient` 的内部页头收敛到 `embedded` 模式
- [x] 确认 `/assets` 与 `/profile` 在模板层接入后不再由内容层重复声明主标题
- [x] 再次通过 `bun run build`

### 下一步
- [ ] 评估 Phase 2 是否达到可收尾状态
- [ ] 如果继续推进，优先整理 `PageTemplate` 的细分槽位和配置中心入口
## 2026-03-23 16:40 Phase 2 / Phase 3 收口

### 新完成
- [x] 为配置中心新增 `SiteSettings / IntegrationSettings` 数据模型与迁移
- [x] 新增统一配置读取层：`src/lib/site-config.ts`、`src/lib/settings.ts`
- [x] 新增站点设置页：`/admin/settings/site`
- [x] 新增集成设置页：`/admin/settings/integrations`
- [x] 新增密钥状态页：`/admin/settings/secrets`
- [x] 新增对应后台 API：`site / integrations / secrets`
- [x] 将工作台壳层、浏览器 metadata、登录页品牌展示切到统一站点配置
- [x] 将 RunningHub / Feishu 非敏感基础参数切到统一集成配置
- [x] 将旧 `飞书配置` 页面收敛为兼容跳转
- [x] 通过 `bun run prisma:generate`
- [x] 通过 `bun run prisma:push`
- [x] 通过配置中心定向测试
- [x] 再次通过 `bun run build`

### 结论
- [x] Phase 2 完成
- [x] Phase 3 完成

### 下一步
- [ ] 如继续推进，进入 Phase 4：全站回归验证与治理规范固化
- [ ] 评估是否把首页文案、Logo、更多主题 token 继续纳入站点设置
## 2026-03-23 15:50 Workbench 模板重构

### 新完成
- [x] 收口 `/apps/[code]` 的 Workbench 三栏骨架，统一页头、左右面板折叠和响应式退化
- [x] 将当前选中任务同步到 URL，并在刷新、SSE 刷新后尽量保留选中项
- [x] 重排左栏提交区为“参考图 / Prompt / 关键参数 / 提交反馈 / 提交按钮”
- [x] 重构中栏结果区为“状态条 / 主结果区 / 操作区 / 输入摘要 / 缩略带”
- [x] 重构右栏为“当前任务 + 最近任务”轻量队列，弱化长任务号和重复应用名
- [x] 补充并更新 Workbench 相关测试
- [x] 通过 `npx vitest run src/components/use-app-tasks.test.tsx src/components/submit-form.test.tsx src/components/recent-results-panel.test.tsx`
- [x] 通过 Workbench 相关 `eslint`
- [x] 通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [x] 用真实浏览器回归 `/apps/[code]`，确认桌面、平板、手机三种布局下的实际交互手感
- [ ] 评估是否需要继续补任务队列筛选、分组或失败态信息强化

### Review
- 这轮完成的是 Workbench 模板层收口，不是单点样式微调；核心收益在于三栏职责清晰、任务切换链路稳定、移动端和平板端有明确退化策略。
- 当前验证已经覆盖工作台状态同步、表单结构、任务队列展示和全量构建，具备继续做真实浏览器回归的基础。
- 真实浏览器回归已补完，且生产态页面控制台为 `0 error / 0 warning`；当前 Workbench 可以进入下一轮体验细化，而不是结构性返工。
## 2026-03-23 16:10 素材大厅与后台二次桌面化

### 新完成
- [x] 将素材大厅 inline 小视频改为完整画面可见，不再用裁切式预览
- [x] 将素材大厅声音控制改为全大厅双向开关，支持再次关闭
- [x] 保持素材列表与领取日志为横向表格管理
- [x] 将后台筛选区改为更明确的桌面端横向表单布局
- [x] 将批量上传弹窗改为横向工作台
- [x] 将上传弹窗内标签管理改为横向表格
- [x] 更新对应组件测试
- [x] 通过 `npx vitest run src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx`
- [x] 通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 如需继续确认体验，补一轮真实浏览器回归，重点验证桌面 hover 播放、声音切换与上传弹窗横向布局
- [ ] 评估领取日志是否需要继续增强桌面端筛选维度

### Review
- 这轮不是新增业务能力，而是把此前重构进一步对齐到用户明确要求的使用方式：素材大厅优先“看清内容”，后台优先“电脑端横向管理”。
- 验证已覆盖行为测试和生产构建，当前改动具备继续做浏览器级体验验收的基础。
## 2026-03-23 16:25 素材大厅细节修正

### 新完成
- [x] 手机端下滑浏览时自动隐藏“筛选素材”板块
- [x] 桌面端支持点击卡片封面直接进入完整预览
- [x] 完整预览支持点击遮罩空白区关闭
- [x] 卡片内小视频改为首帧优先展示
- [x] 更新 `src/components/material-hall-client.test.tsx`
- [x] 通过 `npx vitest run src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx`
- [x] 通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 如需继续确认真实体验，补一轮浏览器回归，重点检查首帧加载速度与手机端筛选栏收起阈值

### Review
- 这轮修的是素材大厅的关键使用细节，不是样式微调；核心目标是让手机端看内容更干净、桌面端看片入口更直接。
## 2026-03-23 16:33 预览弹窗关闭规则收口

### 新完成
- [x] 将完整预览弹窗改为“所有留白可关闭”
- [x] 保留视频本体、播放器控件、正文内容和按钮为不误关的内容区
- [x] 补充桌面端黑色留白关闭、右侧空白关闭和正文点击不误关测试
- [x] 通过 `npx vitest run src/components/material-hall-client.test.tsx src/components/admin-materials-client.test.tsx`
- [x] 通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 如需继续确认真实体验，补一轮浏览器回归，重点看弹层点击命中边界与播放器控件操作

### Review
- 这轮是交互命中边界收口，不是视觉改版；收益在于关闭规则终于和用户直觉一致，弹层内外留白都不再“点了没反应”。
## 2026-03-23 17:37 应用配置与新建应用修复

### 本轮完成
- [x] 将应用删除改为级联删除，统一清理 `Task / SyncLog / TaskAsset / CreditLog`
- [x] 单删与批量删除统一复用删除服务
- [x] 新建应用页默认带入站点级飞书字段映射
- [x] `AppFormEditor` 新建模式支持 `defaultSyncMappingJson`
- [x] 默认应用 `code` 改为 ASCII 安全生成策略
- [x] 创建成功后按服务端返回的 `app.code` 跳转详情页
- [x] 应用编辑、访问、删除等相关链接统一做 URL 编码
- [x] 补充并通过定向测试
- [x] 通过 `bun run build`

### 下一步
- [ ] 用真实浏览器回归应用删除、新建应用默认同步配置、创建后跳转详情页三条主链
- [ ] 视运营需求决定是否继续为应用创建流程补“从已有应用复制配置”能力

### Review
- 这轮修的是根因，不是只改提示文案：删除失败来自真实外键阻塞，404 来自前端跳转与 code 策略不一致，同步配置缺省来自新建页没有接站点级配置。
- 当前验证覆盖了数据层、路由层、表单层和构建层，已经具备继续做浏览器级验收的基础。
## 2026-03-23 19:10 单应用页二次精简与任务卡方案 C
### 新完成
- [x] 移除 Workbench 顶部整排“任务发起 / 收起输入区 / 全站任务 / 收起全站任务”按钮
- [x] 将 `WorkbenchLayout` 固定为桌面端三栏、移动端纵向三段，不再保留左右抽屉和折叠状态
- [x] 移除左栏“输入工作台”板块，并将 `清空草稿` 合并到底部提交条
- [x] 移除中栏“输入摘要”板块及其中的 Prompt、参数摘要、参考图链接
- [x] 将右栏全站任务卡改为方案 C 表格式布局
- [x] 为第三方任务 ID 增加默认折叠与展开查看交互
- [x] 保持跨应用仅查看结果、同应用才可一键同款
- [x] 新增/更新 `workbench-layout`、`results-panel`、`recent-results-panel`、`submit-form` 相关测试
- [x] 通过 `npx vitest run src/components/use-app-tasks.test.tsx src/components/workbench-layout.test.tsx src/components/results-panel.test.tsx src/components/recent-results-panel.test.tsx src/components/submit-form.test.tsx src/lib/db/tasks.test.ts src/lib/db/users.test.ts src/lib/feishu-sync-jobs.test.ts`
- [x] 通过相关文件 `eslint`
- [x] 通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 评估全站任务卡在高任务量下是否需要分页、筛选或虚拟列表
- [ ] 评估是否需要强化失败任务卡的视觉区分与超长摘要折叠策略

### Review
- 本轮是单应用页的第二次收口，目标是继续压缩重复信息，把页面回到“提交、看结果、切任务”三件核心事情上。
- 当前实现已经通过定向测试、lint 和生产构建，适合继续进入真实浏览器体验打磨阶段。
## 2026-03-23 19:35 单应用页第三轮压缩
### 新完成
- [x] 将左侧参考图区从“1 大 2 小”改为三列等宽布局
- [x] 用轻量样式强调第 1 个图片槽位为主参考图，不再放大尺寸
- [x] 将右侧全站任务区改成纯信息高密度列表
- [x] 删除右栏列表项内的结果摘要、展开控件和按钮区
- [x] 右栏每条任务仅保留缩略图、站内编号、状态、耗时、应用名、时间、第三方 ID
- [x] 保持右栏整条任务点击可切换中间结果
- [x] 重写 `recent-results-panel.test.tsx` 与 `submit-form.test.tsx`
- [x] 通过 `npx vitest run src/components/workbench-layout.test.tsx src/components/results-panel.test.tsx src/components/recent-results-panel.test.tsx src/components/submit-form.test.tsx src/components/use-app-tasks.test.tsx src/lib/db/tasks.test.ts src/lib/db/users.test.ts src/lib/feishu-sync-jobs.test.ts`
- [x] 通过相关 `eslint`
- [x] 通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 用真实浏览器确认桌面端右栏是否稳定达到一屏 10 条
- [ ] 观察真实第三方 ID 长度分布，评估是否需要更进一步的字重、字宽或行高压缩

### Review
- 本轮继续围绕“减少噪音、提高首屏密度”收口，核心是让左栏更像输入槽位，右栏更像任务监控列表。
- 代码、测试、lint 和构建都已通过，下一步最适合做真实视觉密度确认，而不是继续增加功能。
## 2026-03-23 19:50 结果区下载按钮可见性修复
### 新完成
- [x] 定位“下载结果”文字不可见不是遮挡问题，而是全局 `a` 样式覆盖文字颜色
- [x] 为结果区下载链接补充强制白字按钮样式
- [x] 重写 `results-panel.test.tsx`，补充下载链接可见性断言
- [x] 通过 `npx vitest run src/components/results-panel.test.tsx`
- [x] 通过相关 `eslint`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### Review
- 这是一个典型的“链接长得像按钮”样式冲突，根因在全局样式优先级，不在布局遮挡。
- 修复点已经被测试锁住，后续如果再遇到类似入口，可以按同一模式统一处理。
## 2026-03-23 20:55 任务ID统一命名 + 全站任务侧栏收起 + 管理员任务批量管理
### 新完成
- [x] 将工作台右栏、结果区、任务详情页和同步异常列表中的“第三方 ID / 任务号”统一改为“任务ID”
- [x] 将任务详情页主标题切换为 `siteTaskNo`，并补充单独的 `任务ID` 指标展示
- [x] 将 `/apps/[code]` 桌面端右侧“全站任务”面板改为默认收起，并新增右侧中部轻量开关
- [x] 保持右侧全站任务面板收起后仍继续实时刷新任务数据，不影响中间结果区选中态
- [x] 将管理员任务中心升级为可勾选列表，支持“批量重试同步”和“批量删除”
- [x] 为批量删除补齐 `Task / TaskAsset / SyncLog / CreditLog` 级联清理与本地文件 best-effort 删除
- [x] 新增管理员批量任务接口 `/api/internal/admin/tasks/bulk`
- [x] 更新相关组件/接口测试，并通过定向 `vitest`
- [x] 通过相关 `eslint`
- [x] 通过 `npm run build`

### 下一步
- [ ] 评估管理员任务中心是否需要分页、筛选和批量结果导出
- [ ] 观察单应用页右侧全站任务收起按钮在真实运营场景下的位置是否还需微调

### Review
- 这轮改动没有去改数据库字段名，而是统一了“展示语义”和“批量管理能力”；这样兼顾了已有数据兼容性和前台认知一致性。
- 工作台右栏的默认收起只做在桌面端单应用页，避免把移动端当前已经收敛好的纵向流程再打散。
## 2026-03-23 MCP 安装与审查
### 本轮完成
- [x] 按本地规则先完成 MCP 安装前安全审查
- [x] 使用 `skill-vetter` 与 `clawdefender` 风格检查审阅 Playwright / Context7 / Draw.io / Firecrawl / TrendRadar / n8n 候选
- [x] 为 Claude 项目本地配置安装 `Playwright MCP`、`Context7 MCP`、`Draw.io MCP`、`TrendRadar MCP`、`n8n Docs MCP`
- [x] 为 Codex 本机配置补充 `TrendRadar MCP` 与 `n8n Docs MCP`
- [x] 明确 `Firecrawl MCP` 因无 API Key 且用户要求先跳过，本轮不安装
- [x] 新增并更新项目级 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 完成 `n8n Docs MCP` 认证
- [ ] 如 Codex 客户端未即时显示新 MCP，重启或刷新客户端后复查
- [ ] 如后续需要启用 Firecrawl，再在具备 `FIRECRAWL_API_KEY` 后重新做接入

### Review
- 本轮不是简单“装包”，而是先按规则做了来源与权限审查，再做本地落地，避免把高权限 MCP 直接接入开发环境。
- 当前可直接使用的重点 MCP 已接好；`n8n Docs MCP` 仍有认证前置，`Firecrawl MCP` 则按用户要求保持延后。
## 2026-03-24 单应用模板多图结果展示
### 新完成
- [x] 支持结果缩略图渲染站内相对路径 `/assets/...`
- [x] 将单应用结果区升级为“当前主图 + 全部结果缩略条”的明确多图集合
- [x] 在多图场景补充结果计数、当前图片下载与查看当前图片语义
- [x] 为多图切换、本地路径缩略图和 lightbox 索引补充组件测试
- [x] 通过结果区相关 `vitest`
- [x] 通过生产构建验证
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 如需继续增强多图结果区，再评估“下载全部”打包能力与多结果类型统一协议
## 2026-03-24 多图结果下载增强
### 新完成
- [x] 为任务结果新增单图下载接口 `/api/internal/tasks/[id]/downloads/assets/[assetId]`
- [x] 为任务结果新增 ZIP 打包接口 `/api/internal/tasks/[id]/downloads/archive`
- [x] 抽出共享 `task-output-download-actions` 组件，并接入单应用结果区与任务详情页
- [x] 支持客户端顺序触发“直接下载多张”，失败时提示改用 ZIP
- [x] 统一任务结果下载权限校验、文件名生成、本地 `/assets/...` 解析和远程结果图透传
- [x] 补齐结果区、下载动作组件、下载路由测试
- [x] 通过定向 `vitest`
- [x] 通过定向 `eslint`

### 下一步
- [ ] 跑一次生产构建，确认下载增强没有影响整体打包
- [ ] 如后续还有需求，再评估是否补浏览器拦截多文件下载时的更强引导

### Review
- 这轮不是只加按钮，而是把多图下载能力从“前端裸链接”提升成统一的任务下载层，方便后续继续扩展权限、文件名和远程存储兼容逻辑。
## 2026-03-24 AI 应用费用与后台列表直改
### 新完成
- [x] 下线积分体系运行时模型与接口：移除 `User.credits`、`App.creditCost`、`CreditLog`
- [x] 新增 `App.estimatedPriceFen` 与 `Task.estimatedPriceFenSnapshot`
- [x] 接通应用创建、编辑、应用列表的预计费用维护
- [x] 在任务提交前与任务详情页展示预计费用
- [x] 应用列表支持直接修改分类、标签、排序值、预计费用、启用状态、结果共享
- [x] 分类列表支持直接修改名称、排序值、启用状态，并支持列表排序
- [x] Banner 列表支持直接修改标题、副标题、链接文案、链接地址、排序值、启用状态，并支持列表排序
- [x] 提示词模板列表支持直接修改名称、分类、标签、作用范围、启用状态，并支持列表排序
- [x] 用户列表支持直接修改显示名、角色、启用状态、每日额度，并支持列表排序
- [x] 移除个人中心积分余额与积分记录展示
- [x] 移除后台用户页积分字段与调积分入口
- [x] 更新类型、数据层、页面与测试，使运行时不再依赖积分链路
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 用真实浏览器对应用、分类、Banner、提示词模板、用户五个后台列表做一轮人工回归
- [ ] 评估是否为列表直改统一补一层 toast 与保存中反馈，进一步降低运营误操作成本

### Review
- 已通过 `bunx prisma db push --accept-data-loss`
- 已通过定向 `vitest`
- 已通过定向 `eslint`
- 已通过 `bun run build`
- 当前仍有 1 条既有的 Turbopack NFT tracing warning，但不影响本轮构建成功
## 2026-03-24 提示词模板 A 方案落地
### 新完成
- [x] 为提示词模板变量替换补充定向测试
- [x] 为后台模板编辑器变量插入、媒体切换和内嵌管理补充组件测试
- [x] 在 `app-submit` 中落地模板变量引擎与兼容回退规则
- [x] 在 `task-queue` 中按 `formData` 构造模板输入变量
- [x] 重构后台模板编辑弹窗为单屏双栏工作台
- [x] 将模板正文编辑区改为白底并新增变量插入入口
- [x] 接入示例图片/视频本地上传，视频支持可选封面图
- [x] 接入标签与分类的就地管理并在父级列表中即时刷新
- [x] 通过定向 `vitest`
- [x] 通过定向 `eslint`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 在真实后台页面回归模板新建/编辑的完整运营链路
- [ ] 视回归结果决定是否补一轮更完整的提交链路集成测试

### Review
- 这轮没有改 Prisma schema，而是优先把变量解析、兼容回退和后台运营体验一次性做通，风险更可控。
- 关键链路已经有测试和静态检查兜底，剩余风险主要在真实页面环境下的上传与删除保护提示。
## 2026-03-24 任务中心输入参考图与详情抽屉
### 本轮完成
- [x] 为任务中心列表补 `输入参考图` 列，支持无图占位和输入图预览
- [x] 为任务中心新增右侧任务详情抽屉，承接概览、输入、输出、日志和同步记录
- [x] 扩展任务详情数据，补充应用输入 schema 与输入映射逻辑
- [x] 保持批量操作、结果预览和原详情页兼容
- [x] 补齐组件 / 数据层测试，并完成 lint + build 验证
- [x] 同步更新 `ai-workbench/README.md`、`ai-workbench/log.md`、`ai-workbench/memory.md`

### 下一步
- [ ] 用真实浏览器回归 `/tasks` 列表宽度和右侧抽屉滚动体验，确认桌面端连续排查多条任务时不拥挤
- [ ] 视任务量决定是否继续补任务中心筛选、分页或更明确的输入参数摘要

### Review
- 这轮没有重做任务详情页，而是把已有详情能力前置到任务中心抽屉，保持深度页仍可单独打开，风险更低。
- 输入参考图和结果预览继续分成两个独立点击区域，避免一个缩略图区同时承担“放大预览”和“查看详情”两种行为。

## 2026-03-24 飞书字段映射可配置化
### 计划中
- [ ] 抽离共享飞书字段注册模块，支持基础字段与 `params.<fieldKey>` 应用参数字段
- [ ] 升级 `feishu-sync` 映射校验与 payload 构造，支持参数字段同步
- [ ] 升级集成设置页，使用结构化字段映射器替换固定下拉
- [ ] 升级应用编辑页同步配置，替换 JSON 文本框并支持应用参数字段覆盖
- [ ] 补齐定向测试并完成 `bun run build` 验证
- [ ] 同步更新 `README.md`、`log.md`、`memory.md`
## 2026-03-24 飞书字段映射可配置化

### 本轮完成
- [x] 新增共享字段注册模块，统一维护基础字段与 `params.<fieldKey>` 参数字段
- [x] 抽离纯前后端共享的映射规范化模块，客户端不再直接依赖带 `prisma` 的服务端同步模块
- [x] 升级 `feishu-sync`，支持 `params.*` 映射键和任务参数序列化同步
- [x] 升级后台集成设置页，改为结构化字段映射编辑器，并限制全局页只使用共享基础字段
- [x] 升级应用编辑器同步配置，替换 JSON 文本框，支持当前应用表单参数字段映射
- [x] 补齐路由、同步核心、应用编辑器定向测试
- [x] 通过定向 `vitest`
- [x] 通过 `bun run build`
- [x] 同步更新 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 用真实浏览器回归后台“集成设置”和“应用配置”的字段映射交互，确认新增/切换/删除映射都符合预期
- [ ] 评估是否需要补一组 `task-queue` 或 `feishu-sync-jobs` 链路测试，锁定 `params.*` 到飞书最终入表的端到端行为

### Review
- 这轮关键收口不是单纯加一个下拉，而是把“字段定义”“映射规范化”“服务端同步 payload”拆成了共享层，避免客户端误连服务端模块再次触发构建问题。
- 当前验证结果是 4 个定向测试文件、18 条测试全部通过，`bun run build` 也已通过；仍保留 1 条既有的 Turbopack NFT tracing warning，但不是本次改动引入。
## 2026-03-24 飞书映射补充提示词模板字段

### 本轮完成
- [x] 为飞书共享字段新增提示词模板名称与模板正文两个映射源
- [x] 在任务提交阶段把选中的提示词模板快照写入任务结果快照，保证后续更新和补同步可复用
- [x] 升级飞书同步 payload，支持输出 `promptTemplateName` 与 `promptTemplateContent`
- [x] 补齐定向测试，确认全局映射可接受新字段且 payload 能带出模板信息
- [x] 通过定向 `vitest`
- [x] 通过 `bun run build`
- [x] 同步更新 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 用真实浏览器回归后台“集成设置”的飞书字段映射，确认新字段在下拉里展示正常
- [ ] 视需要补一组 `submitNewTask` / `task-queue` 单测，锁定模板快照写入任务结果快照的行为

### Review
- 这次不是只在飞书侧加两个字段，而是把提示词模板元数据写进任务快照，避免后续 webhook 更新或历史补同步时丢失模板信息。
- 当前验证覆盖了映射保存与 payload 生成，构建也已通过；既有的 Turbopack NFT tracing warning 仍存在，但与本次改动无关。

## 2026-03-24 提示词模板封面缩略图优化
### 新完成
- [x] 将提示词模板编辑器示例媒体预览区的 `Preview` 文案改为“封面”
- [x] 将封面缩略图从裁切式 `object-cover` 改为完整比例展示
- [x] 为封面缩略图接入完整大图预览，保持运营仍在当前编辑弹窗完成确认
- [x] 补充 `admin-prompt-template-edit` 组件测试，覆盖缩略图展示与完整图片预览
- [x] 通过定向 `vitest`
- [x] 通过定向 `eslint`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 在真实后台页面手工回归“新建提示词模板 -> 查看封面缩略图 -> 打开完整图 -> 保存”链路
- [ ] 视运营反馈决定是否需要补封面比例或建议尺寸提示

### Review
- 本轮没有重做弹窗结构，而是在现有单屏工作台里做定点体验修正，影响面更小。
- 当前改动已经覆盖组件级验证；剩余风险主要在真实远程图片源和实际运营操作流回归。
## 2026-03-24 RunningHub 多通道并发调度

### 新完成
- [x] 将 RunningHub 并发能力从单一 `taskMaxConcurrency` 升级为 `runninghubChannelsJson`
- [x] 新增多通道配置模型：`code / name / apiKeyEnvName / concurrencyLimit / priority / enabled`
- [x] 保留旧配置兼容：未配置新通道列表时，用历史 `taskMaxConcurrency + RUNNINGHUB_API_KEY` 自动合成默认消费级通道
- [x] 将并发配置归属从飞书区块迁回 RunningHub 区块，飞书区块仅保留连接信息与字段映射
- [x] 任务提交流程改为“本地先入队，再按通道优先级派发”
- [x] 实现通道调度规则：仅选启用通道、按优先级升序、尊重应用级允许通道限制、满额后保持 `QUEUED`
- [x] 为 `App` 增加 `runninghubAllowedChannelCodesJson`，支持“自动调度 / 指定通道”
- [x] 为 `Task` 增加 `runninghubChannelCode / runninghubChannelName`，记录任务最终走的 RunningHub 通道
- [x] 更新集成设置页，支持新增/编辑/禁用 RunningHub 通道
- [x] 更新应用编辑器，支持配置允许通道
- [x] 更新密钥状态页，动态展示当前通道依赖的 env key
- [x] 补充 Prisma schema 与迁移文件
- [x] 跑通定向 `vitest`
- [x] 跑通 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 在已修复历史失败迁移后，对默认本地 `dev.db` 正式执行 Prisma migration，确认新字段全部落库
- [ ] 增加一组专门覆盖 `pumpQueuedTasks` 多通道路由与 FIFO 排队行为的自动化测试
- [ ] 视运营需要决定是否在任务中心展示更明确的“通道占用 / 队列等待”状态

### Review
- 这轮不是只改一个并发数字，而是把 RunningHub 从“单入口直提”升级成“多通道本地调度器”，并把并发边界从飞书语义里彻底拆出来。
- 代码级验证已通过，但默认本地库的 `prisma migrate deploy` 仍被历史失败迁移 `20260322180000_structured_app_management` 阻塞；这是旧问题，不是本轮新引入的问题。
## 2026-03-24 全量测试基线修复
### 新完成
- [x] 定位 `bun run test` 失败的三类根因：测试库 schema 漏列、`site` 路由测试 hoisted mock、SQLite 并发导致的 Prisma timeout
- [x] 新增 `vitest.global-setup.ts`，在测试启动前复制 `dev.db` 到 `test.db`
- [x] 对 `test.db` 执行 `prisma db push --accept-data-loss`，确保测试库 schema 最新
- [x] 在 `vitest.config.ts` 中固定测试使用 `DATABASE_URL=file:./test.db`
- [x] 关闭 Vitest 文件级并行，避免 SQLite 锁竞争
- [x] 修复 `src/app/api/internal/admin/settings/site/route.test.ts` 的 hoisted mock 初始化顺序
- [x] 跑通失败集合的定向回归
- [x] 跑通 `bun run test`
- [x] 跑通 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 后续新增 DB 测试时复用 `test.db` 隔离方案，避免重新引入直接写 `dev.db` 的路径
- [ ] 视情况继续处理当前残留的 Turbopack NFT tracing warning

### Review
- 这次收口的关键不是改业务逻辑，而是把测试环境和开发库彻底隔离，再消掉一个单独的 mock 初始化错误。
- 现在全量测试已经恢复可用，后续再遇到 Prisma 缺列或 timeout，优先先检查是不是有人绕开了 `test.db` 方案或重新打开了文件并行。

## 2026-03-24 提示词模板分类草稿回归修复
### 新完成
- [x] 定位提示词模板编辑器在新增分类/标签时清空草稿的根因：初始化 effect 依赖了会变化的分类/标签选项
- [x] 修复 `AdminPromptTemplateEdit` 初始化时机，只在真正切换模板或重新打开时重置表单
- [x] 修复分类/标签管理中的跨组件更新 warning：不再在 `setState` updater 中触发父组件回调
- [x] 保留新增分类/标签过程中的模板正文和其它未保存字段
- [x] 补充 `admin-prompt-template-edit.test.tsx` 回归测试，覆盖草稿保留、主分类选项刷新和 console warning
- [x] 通过定向 `vitest`
- [x] 通过定向 `eslint`
- [x] 通过 `bun run build`
- [x] 同步 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 用真实后台页面手工回归提示词模板“新建 -> 输入正文 -> 新增分类/标签 -> 保存”链路
- [ ] 清理测试数据库/初始化基线，解决 `bun run test` 中与本次改动无关的既有 Prisma schema 与 mock 问题

### Review
- 这次修复的重点不是补 UI 防抖，而是把“表单初始化”和“选项列表同步”彻底拆开，避免任何选项刷新误伤正在编辑的草稿。
- 定向回归已经锁住核心行为；当前剩余风险主要在真实页面链路和仓库全量测试基线，不在本次组件逻辑本身。
## 2026-03-24 应用展示配置改版

### 新完成
- [x] 新增应用级 `showcaseImages` / `showcaseImagesJson`
- [x] 后台展示配置支持案例参考图片 URL 添加和本地批量上传
- [x] 展示配置移除图标、角标、作者相关 5 个字段
- [x] 前台应用详情页新增“效果展示”模块
- [x] 图片支持缩略图切换和 Lightbox 放大
- [x] 更新相关路由、数据映射和 Prisma schema
- [x] 通过定向 `vitest`
- [x] 通过相关 `eslint`
- [x] 通过 `npx prisma db push`
- [x] 通过 `npm run build`
- [x] 同步更新 `README.md`、`log.md`、`memory.md`

### 下一步
- [ ] 用真实案例图走后台配置到前台展示的人工回归
- [ ] 观察是否真的需要案例图标题/说明，再决定是否扩展数据结构

### Review
- 这轮保留了旧数据库列但从编辑器和前台展示里退出，兼顾了兼容性和改版速度。
- 新增的案例图链路是独立模块，不影响现有应用列表卡片和提交表单主流程。
## 2026-03-24 应用展示配置改版补充回归

### 新完成
- [x] 前台应用列表卡片与工作台入口停止消费旧 icon 字段，统一切换为 `coverPoster`
- [x] 补齐应用创建接口写入 `showcaseImagesJson` 的自动化测试
- [x] 重新跑通本轮全部定向测试、相关 `eslint` 与 `npm run build`

### 下一步
- [ ] 在真实页面手工回归“新建应用 -> 配置案例图 -> 保存 -> 前台效果展示”

### Review
- 最后一轮回归抓到了一个“编辑器已移除旧字段，但前台卡片仍在消费旧字段”的尾巴，说明这类配置改版必须同时检查编辑器、接口、详情页和列表卡片四条展示链路。
## 2026-03-24 Vercel 半自动部署第二版
### 新完成
- [x] 新增 `scripts/deploy-vercel.mjs`
- [x] 新增 `src/lib/vercel-deploy.mjs`
- [x] 新增 `.env.vercel.example`
- [x] 在 `package.json` 中补齐 `deploy:vercel`、`deploy:vercel:preview`、`deploy:vercel:production`
- [x] 为部署参数校验补充 `src/lib/vercel-deploy.test.ts`
- [x] 支持 `--dry-run`、`--skip-build`、`--skip-env-sync`
- [x] 自动写入 `.vercel/project.json`
- [x] 自动同步环境变量到 Vercel
- [x] 自动执行本地 build 再触发部署
- [x] 为当前 SQLite 分支增加 `production` 阻断护栏
- [x] 更新 `README.md`，写清楚使用方法与参数来源
- [x] 更新 `log.md`
- [x] 更新 `memory.md`

### 下一步
- [ ] 如果要支持正式生产一键部署，先完成 `Postgres` 迁移
- [ ] 如果要进一步减少手工步骤，可继续补“自动创建/绑定 Vercel 项目”的能力

### Review
- 这轮不是直接执行部署，而是先把“可复用、可验证、带护栏”的部署入口固化下来。
- 当前脚本已经适合你自己填参数后做 `preview` 部署，但没有掩盖真实限制：SQLite 分支不适合直接发 Vercel production。
## 2026-03-24 案例图上限调整

### 新完成
- [x] 将案例参考图片上限从 6 张调整为 100 张
- [x] 抽出共享常量与归一化逻辑，避免前后端上限不一致
- [x] 补充 100 张上限的自动化测试
