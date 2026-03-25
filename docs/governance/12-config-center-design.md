# 配置中心设计

## 文档目标

本文件定义 `AI Workbench` 在 `Phase 1` 的配置中心边界与结构设计，解决当前品牌配置、导航配置、Feishu 设置和环境变量散落的问题。

当前工作区为脏工作区。本文只做边界设计，不落数据库 schema 或后台实现。

## 设计目标

- 让网站名称、导航文案、页面标题等信息可统一配置
- 让 Feishu、RunningHub 等集成配置有清晰归口
- 保护敏感密钥，不因“可配置化”而降低安全性
- 保留 env 兜底，避免后台配置缺失时网站不可用

## 配置域划分

### 1. 站点配置

用于承载品牌与界面级设置：

- 网站名称
- 网站副标题
- 浏览器标题模板
- 首页欢迎文案
- 导航分组名称
- 关键页面默认说明文案
- Logo / 品牌图形资源引用
- 主题基础项

### 2. 集成配置

用于承载第三方服务的非敏感运行参数：

- RunningHub Base URL
- RunningHub 默认 WebApp ID
- Feishu App Token
- Feishu Table ID
- Feishu 字段映射
- 任务并发上限
- webhook 模式相关非敏感开关

### 3. 密钥状态

用于承载敏感配置的只读状态，不提供普通后台明文编辑：

- `RUNNINGHUB_API_KEY`
- `FEISHU_APP_SECRET`
- `JWT_SECRET`
- 其他敏感令牌

## 读取优先级

### Site / UI 配置

- 默认值：代码内安全默认值
- 覆盖层：数据库 `site_settings`
- 最终结果：运行时合并

### 集成配置

- 默认值：代码或 env 中的安全默认值
- 覆盖层：数据库 `integration_settings`
- 兜底层：环境变量
- 最终结果：运行时解析后的配置对象

### 敏感密钥

- 唯一可信来源：环境变量
- 后台仅显示：
  - 是否已配置
  - 最后验证时间
  - 当前来源类型

## 建议配置模型

### `site_settings`

建议承载：

- `siteName`
- `siteSubtitle`
- `pageTitleTemplate`
- `homeEyebrow`
- `homeDescription`
- `logoUrl`
- `themeColor`
- `navLabelsJson`

### `integration_settings`

建议承载：

- `runninghubBaseUrl`
- `runninghubDefaultWebappId`
- `feishuAppToken`
- `feishuTableId`
- `feishuColumnMappingsJson`
- `taskMaxConcurrency`

### `secret_status_view`

建议仅用于后台展示：

- `keyName`
- `configured`
- `source`
- `lastCheckedAt`

## 现状映射

### 已有能力

- `src/lib/env.ts`
  - 已承载大部分系统默认值与敏感参数
- `src/app/api/internal/admin/settings/feishu/route.ts`
  - 已具备 Feishu 数据库配置 + env 兜底模式
- `src/app/layout.tsx`
  - 站点标题仍为写死值
- `src/components/workbench-shell.tsx`
  - 品牌名和壳层文案仍为写死值

### 设计结论

- Feishu 设置是未来集成配置中心的先行样本
- 品牌配置与导航配置需要补齐统一读取层
- 不应把密钥和普通设置放在同一个表单层级

## 配置中心页面结构

### 站点设置

内容建议分组：

- 品牌与命名
- 页面标题与文案
- 导航分组与标签
- 界面基础项

### 集成设置

内容建议分组：

- RunningHub
- Feishu
- 系统运行参数

### 密钥状态

内容建议分组：

- 当前已配置项
- 缺失项提示
- 变更说明

## 权限原则

- 普通成员无权查看站点配置、集成配置与密钥状态
- 管理员可编辑站点配置和非敏感集成配置
- 即使是管理员，也不默认拥有后台明文编辑密钥的权限

## 不做项

- 当前阶段不做密钥入库
- 当前阶段不做加密密钥托管
- 当前阶段不做多环境配置切换 UI

## 进入 Phase 2 的配置前提

- 需要先定义统一的“配置解析层”
- 需要先定义页面上哪些字段来自 `site settings`，哪些来自 `integration settings`
- 需要保证现有 Feishu 设置不会被新配置中心设计破坏
