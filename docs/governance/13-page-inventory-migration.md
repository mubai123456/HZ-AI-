# 页面归类与迁移清单

## 文档目标

本文件把当前 `app/(workspace)` 下的主要页面归类到 `Phase 1` 定义的模板体系中，并标注优先级、当前问题和迁移方向。

当前工作区为脏工作区。本文不修改页面实现，只作为后续 Phase 2 的迁移底稿。

## 归类规则

- `P0`
  - 结构问题明显，且属于高频页面
- `P1`
  - 结构不统一，但不一定最先改
- `P2`
  - 已基本成型，只需跟随模板体系收口

## 页面清单

### `/`

- 当前类型：半成品 `Dashboard`
- 目标模板：`Dashboard`
- 优先级：`P1`
- 现状：
  - 已使用 `PageHeader`
  - 已有指标区、常用应用区、异常提醒区
- 迁移方向：
  - 作为 Dashboard 模板的标准样板页保留

### `/apps`

- 当前类型：浏览页，但页头职责下沉到内容组件
- 目标模板：`Browse`
- 优先级：`P0`
- 现状：
  - 页面引入 `PageHeader` 但未使用
  - `AppMarketplace` 内部自己补局部头部
  - 筛选状态仍停留在局部状态
- 迁移方向：
  - 恢复页面级头部
  - 将过滤条与分类导航纳入 Browse 模板

### `/apps/[code]`

- 当前类型：应用工作台
- 目标模板：`Workbench`
- 优先级：`P0`
- 现状：
  - 依赖 `WorkbenchLayout`
  - 与 `ThreeColumnLayout` 存在重复骨架问题
- 迁移方向：
  - 作为统一 `Workbench` 模板的首要落地点

### `/assets`

- 当前类型：浏览页
- 目标模板：`Browse`
- 优先级：`P1`
- 现状：
  - 已形成 URL 驱动搜索与标签筛选
  - 由 `MaterialHallClient` 承担主浏览体验
- 迁移方向：
  - 纳入统一 Browse 模板，但保留现有移动优先策略

### `/profile`

- 当前类型：个人资产页
- 目标模板：`Browse` 与 `Dashboard` 的混合表达
- 优先级：`P2`
- 现状：
  - 服务器页仅加载数据，主要结构在 `ProfileClient`
- 迁移方向：
  - 归入“我的内容”信息架构下，优先统一页头与区块层级

### `/admin`

- 当前类型：管理员总览
- 目标模板：`Dashboard`
- 优先级：`P1`
- 现状：
  - 已使用 `PageHeader`
  - 结构接近合格的后台概览页
- 迁移方向：
  - 作为管理 Dashboard 模板样板页保留

### `/tasks`

- 当前类型：管理列表页
- 目标模板：`Management List`
- 优先级：`P1`
- 现状：
  - 页面本身只对管理员开放
  - 当前却出现在基础导航中
- 迁移方向：
  - 归入 `系统执行`
  - 统一为标准列表页模板

### `/tasks/[id]`

- 当前类型：详情检查页
- 目标模板：`Detail Inspection`
- 优先级：`P2`
- 现状：
  - 已使用 `PageHeader`
  - 摘要、输入输出、系统日志的分区较清晰
- 迁移方向：
  - 提炼成详情检查模板的标准样板页

### `/sync`

- 当前类型：执行监控页
- 目标模板：`Management List`
- 优先级：`P1`
- 现状：
  - 已使用 `PageHeader`
  - 偏向“异常列表 + 指标概览”
- 迁移方向：
  - 纳入 `系统执行` 分组，保持与任务中心同层级

### `/admin/apps`

- 当前类型：管理列表页，但主标题在客户端组件内
- 目标模板：`Management List`
- 优先级：`P0`
- 现状：
  - 页面只返回 `AdminAppsClient`
  - `AdminAppsClient` 内部生成主标题和过滤区
- 迁移方向：
  - 抽离页面级头部与过滤条模板结构

### `/admin/apps/new`

- 当前类型：编辑页
- 目标模板：`Editor`
- 优先级：`P1`
- 现状：
  - 与 `/admin/apps/[code]` 共用 `AppFormEditor`
- 迁移方向：
  - 纳入统一编辑模板，形成标准样板页

### `/admin/apps/[code]`

- 当前类型：编辑页
- 目标模板：`Editor`
- 优先级：`P1`
- 现状：
  - 与新建页共用 `AppFormEditor`
  - 外层壳仍是手写容器
- 迁移方向：
  - 与新建页共用同一个 Editor 模板

### `/admin/materials`

- 当前类型：管理列表页，但头部为手写块
- 目标模板：`Management List`
- 优先级：`P0`
- 现状：
  - 未使用 `PageHeader`
  - 手写一段页面头部 + `AdminMaterialsClient`
- 迁移方向：
  - 对齐后台列表模板

### `/admin/prompt-templates`

- 当前类型：管理页，但外层容器与其他后台页不一致
- 目标模板：`Management List`
- 优先级：`P0`
- 现状：
  - 页面使用自定义大容器包住 `AdminPromptTemplatesClient`
  - 缺少统一页头模板
- 迁移方向：
  - 收回到统一后台列表模板骨架

### `/admin/categories`

- 当前类型：管理列表页
- 目标模板：`Management List`
- 优先级：`P1`
- 现状：
  - 已使用 `PageHeader + SurfaceCard`
- 迁移方向：
  - 作为后台配置型列表页样板

### `/admin/banners`

- 当前类型：管理列表页
- 目标模板：`Management List`
- 优先级：`P1`
- 现状：
  - 已使用 `PageHeader + SurfaceCard`
- 迁移方向：
  - 与分类页共用配置型列表模板

### `/admin/users`

- 当前类型：管理列表页，但头部在客户端组件内
- 目标模板：`Management List`
- 优先级：`P0`
- 现状：
  - 页面只渲染 `AdminUsersClient`
  - 主标题与筛选承载不在页面模板层
- 迁移方向：
  - 对齐 `/admin/apps` 的列表模板治理方式

### `/admin/settings/feishu`

- 当前类型：设置页
- 目标模板：`Settings`
- 优先级：`P1`
- 现状：
  - 已使用 `PageHeader`
  - 已有分组块结构
- 迁移方向：
  - 作为配置中心模板的首个落地点

## Phase 2 建议迁移顺序

- 第一批：`/apps`、`/apps/[code]`、`/admin/apps`、`/admin/materials`、`/admin/prompt-templates`、`/admin/users`
- 第二批：`/tasks`、`/sync`、`/admin`、`/`
- 第三批：`/assets`、`/profile`、`/tasks/[id]`、`/admin/categories`、`/admin/banners`、`/admin/settings/feishu`

## 迁移注意事项

- 不在模板迁移时顺手改动业务数据层
- 先处理页头、过滤条、工具栏和骨架，不先改业务细节
- 继续保护当前脏工作区中的无关改动
