# Phase 4 回归验收报告

## 目标

`Phase 4` 的目标不是继续扩范围，而是确认 `Phase 2` 和 `Phase 3` 的治理改造已经在真实页面、构建链路和配置入口上站稳，并把残余风险明确写清楚。

当前工作区仍为脏工作区。本报告只记录本轮治理范围内的验收结论，不覆盖无关历史改动。

## 执行范围

- 导航分层与统一壳层
- 统一页面模板接入结果
- 配置中心三块入口：
  - `站点设置`
  - `集成设置`
  - `密钥状态`
- 高优先页面：
  - `工作台`
  - `应用中心`
  - `素材大厅`
  - `素材管理`
  - `任务中心`
- 构建与定向接口测试

## 验收环境

- 日期：`2026-03-23`
- 本地服务：`bun run start -- --hostname 127.0.0.1 --port 3000`
- 浏览器验收：`Playwright CLI`
- 数据源：本地 `SQLite dev.db`
- 账号：`admin / admin123`

## 执行记录

### 构建与测试

- `bun test src/app/api/internal/admin/settings/site/route.test.ts src/app/api/internal/admin/settings/integrations/route.test.ts src/app/api/internal/admin/settings/secrets/route.test.ts`
  - 结果：通过
- `bun run build`
  - 结果：通过

### 真实浏览器回归

- 登录页登录成功后进入 `工作台`
- 桌面端验收：
  - `工作台`
  - `站点设置`
  - `集成设置`
  - `密钥状态`
  - `素材大厅`
  - `素材管理`
  - `任务中心`
- 移动端验收：
  - 视口调整为 `390 x 844`
  - `任务中心` 顶部折叠导航可打开

### 证据归档

浏览器证据已归档到 `output/playwright/phase4/`：

- `dashboard-desktop.yml`
- `settings-site-desktop.yml`
- `settings-integrations-desktop.yml`
- `settings-secrets-desktop.yml`
- `assets-desktop.yml`
- `admin-materials-desktop.yml`
- `tasks-desktop.yml`
- `tasks-mobile.yml`
- `tasks-mobile-nav-open.yml`
- `dashboard-desktop.png`
- `console-assets-404.log`
- `network-assets.log`

## 验收结论

### 1. 导航与模板

- 通过：管理员左侧导航已按分组展示，不再是普通导航后面直接拼接后台入口。
- 通过：`工作台 / 素材大厅 / 素材管理 / 任务中心 / 设置中心` 已能在统一壳层和模板下渲染。
- 通过：设置页、列表页和浏览页的主标题已经回到模板层，未观察到“壳层标题 + 页面标题 + 内容区标题”三套并行的旧问题。

### 2. 配置中心

- 通过：`/admin/settings/site` 可见品牌字段、工作区标签、导航命名和即时报预览区。
- 通过：`/admin/settings/integrations` 可见 `RunningHub` 与 `Feishu` 的非敏感基础配置。
- 通过：`/admin/settings/secrets` 只展示密钥状态与掩码，不提供普通明文编辑。
- 通过：配置中心定向接口测试已覆盖保存与读取链路。

### 3. 高优页面

- 通过：`素材大厅` 已保留移动优先 Browse 结构，桌面端仍可正常进入。
- 通过：`素材管理` 仍保留列表为主、批量工具栏、上传入口和单条操作。
- 通过：`任务中心` 仍可显示统计卡与任务列表。
- 通过：移动端 `390 x 844` 下顶部折叠导航可打开，说明壳层的移动退化策略已实际生效。

### 4. 回归风险

- `2026-03-23` 的首轮 Phase 4 验收中，曾记录一个残余风险：
  - `素材大厅` 列表卡片会主动加载每条素材的预览地址
  - 当历史预览文件物理缺失时，会在控制台打出受控 `404`
  - 历史证据保留在 `output/playwright/phase4/console-assets-404.log`
- 该风险已在后续补丁中处理：
  - 列表卡片不再预加载预览资源
  - 预览资源改为只在用户真正打开预览时加载
  - 预览文件缺失时，弹层会给出友好降级提示，而不是在列表首屏静默报错
  - 修复后复验结果：`output/playwright/materials-residual-fixed-console.log` 显示 `Total messages: 0 (Errors: 0, Warnings: 0)`

## Phase 4 判定

本轮判定为：`通过`

判定依据：

- 结构治理后的核心高优页面能真实打开
- 配置中心三块入口已落地并通过定向测试
- 构建通过
- 真实浏览器已验证桌面与移动端基本路径
- 已知残余风险已补齐处理，不再存在 Phase 4 关闭时悬空的控制台噪音问题

## 后续保持项

- 后续任何新页面上线前，必须先归类到既有模板类型，再进入实现。
- 后续任何新配置项接入前，必须先判定属于：
  - `站点设置`
  - `集成设置`
  - `仅 env`
- 后续任何验收结论都必须附带新鲜证据，不能只写“应该没问题”。
