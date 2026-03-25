# 新增应用标准操作流程（SOP）

## 1. 概述

本文档定义将新的 RunningHub 应用接入 AI 工作台的标准流程。遵循本流程，可确保新增应用复用统一的任务提交、状态轮询和飞书同步逻辑，无需重写页面组件。

**适用范围**：所有对接 RunningHub 工作流的图片/文本生成类应用。

---

## 2. 前置条件

在开始接入之前，需要从 RunningHub 获取以下信息：

| 信息 | 说明 | 获取方式 |
|------|------|----------|
| `webapp ID` | 应用唯一标识 | RunningHub 控制台 → 我的应用 → 复制 ID |
| 节点结构 | 每个节点的 `nodeId`、`fieldName`、数据类型 | RunningHub 工作流编辑器 → 导出节点 JSON |
| 输入字段 | `input.*` 节点的字段名和类型（string / array / select） | 工作流编辑器节点详情面板 |
| 参数字段 | `params.*` 节点的选项值和默认值 | 同上 |

---

## 3. 接入流程

### Step 1: 获取 RunningHub webapp ID 和节点结构

1. 登录 RunningHub，打开目标应用的工作流。
2. 记录 webapp ID（URL 或应用卡片中）。
3. 逐一记录每个节点的：
   - `nodeId`（节点唯一标识）
   - `fieldName`（字段名）
   - `fieldValue` 类型（string / array[n] / select）

> **提示**：建议用表格记录所有节点的 `nodeId|fieldName` 映射，后续直接填入 `requestMappingJson`。

### Step 2: 定义 `formSchemaJson`（表单字段）

在 `src/lib/mock-data.ts` 的应用定义中，编写 `formSchemaJson` 数组，每个字段对象包含：

```typescript
{
  key: "fieldKey",        // 表单字段唯一标识（英文，驼峰）
  label: "字段标签",       // 显示在表单上的中文名称
  type: "image" | "textarea" | "select",  // 字段类型
  required: true,          // 是否必填（仅 textarea/select 支持）
  description: "提示文字", // 选填，用户可见的输入提示
  maxItems: 3,            // 仅 image 类型，最多允许上传数量
  options: [              // 仅 select 类型
    { label: "选项A", value: "option_a" },
    { label: "选项B", value: "option_b" },
  ]
}
```

### Step 3: 配置 `requestMappingJson`（表单 → RunningHub 节点映射）

将表单 `key` 映射到 RunningHub 的 `nodeId.fieldName` 路径：

```typescript
requestMappingJson: {
  prompt: "input.prompt",           // textarea → string 字段
  aspectRatio: "params.aspect_ratio", // select → select 字段
  image1: "input.images[0]",        // image → array[0] 槽位
  image2: "input.images[1]",        // image → array[1] 槽位
}
```

**数组字段规则**：
- 每个数组槽位（如 `images[0]`、`images[1]`）必须作为独立的映射条目。
- `buildNodeInfoList()` 会自动将 `images[n]` 作为独立 NodeInfo 输出，不会合并成逗号分隔字符串。
- 表单中 `image` 类型字段的 `key` 应与映射键一致（如 `image1`、`image2`）。

### Step 4: 设置 `defaultParamsJson`（选择字段默认值）

为 select 类型字段提供默认值：

```typescript
defaultParamsJson: {
  aspectRatio: "1:1",
  resolution: "1536x1536",
  channel: "ecommerce",
}
```

> **提示**：未设置默认值的 select 字段，将使用 `options` 数组的第一个选项作为默认值。

### Step 5: 配置 `syncMappingJson`（任务字段 → 飞书列映射）

定义任务记录中的字段如何同步到飞书多维表格：

```typescript
syncMappingJson: {
  taskNo: "任务号",              // 任务编号
  status: "任务状态",            // 本地任务状态
  providerStatus: "Provider 状态", // RunningHub 状态
  providerResultUrl: "结果链接",  // 成功时的结果 URL
  providerErrorMessage: "错误信息", // 失败时的错误信息
  ownerName: "创建人",           // 任务创建人
}
```

> **注意**：`providerErrorMessage` 必须显式配置，否则失败任务的错误信息无法同步到飞书。

### Step 6: 设置 `hiddenPromptTemplate`（可选）

追加到用户 Prompt 后面的隐藏指令，影响 AI 生成行为：

```typescript
hiddenPromptTemplate: "请保留主体和关键产品细节，输出适配内部生产工作台展示的高质量图片。"
```

如无需追加指令，可设为空字符串 `""` 或省略此字段。

### Step 7: 在数据库创建应用记录（Phase 2 完成后）

进入 Prisma 数据层后，在 `apps` 表中创建记录：

```prisma
model App {
  id              String   @id @default(cuid())
  code            String   @unique  // 应用代码，如 "all-in-one-image-2"
  name            String            // 显示名称
  provider        String            // 固定填 "RUNNINGHUB"
  providerAppId   String            // RunningHub webapp ID
  enabled         Boolean @default(true)
  // ... 其他字段
}
```

### Step 8: 测试集成

**手动验证步骤**：

1. 启动开发服务器：`npm run dev`
2. 打开应用详情页，填写所有必填字段。
3. 提交任务，检查浏览器 DevTools Network 面板：
   - 请求体中 `nodeInfoList` 是否包含所有映射字段？
   - 图片字段是否为独立条目（如 `images[0]`、`images[1]`）而非逗号分隔字符串？
4. 在 RunningHub 控制台验证任务是否正确接收所有数组槽位。
5. 模拟失败场景：验证 `providerErrorMessage` 是否正确写入飞书记录。

---

## 4. 参考资料

### 4.1 `formSchemaJson` 完整示例

```typescript
formSchemaJson: [
  {
    key: "prompt",
    label: "创作 Prompt",
    type: "textarea",
    required: true,
    description: "描述你希望生成的图片效果。",
  },
  {
    key: "image1",
    label: "参考图 1",
    type: "image",
    description: "最多上传 3 张产品参考图。",
    maxItems: 1,
  },
  {
    key: "aspectRatio",
    label: "比例",
    type: "select",
    options: [
      { label: "1:1", value: "1:1" },
      { label: "3:4", value: "3:4" },
      { label: "16:9", value: "16:9" },
    ],
  },
]
```

### 4.2 `requestMappingJson` 完整示例

```typescript
requestMappingJson: {
  prompt: "input.prompt",
  aspectRatio: "params.aspect_ratio",
  resolution: "params.resolution",
  channel: "params.channel",
  image1: "input.images[0]",
  image2: "input.images[1]",
  image3: "input.images[2]",
}
```

### 4.3 `syncMappingJson` 完整示例

```typescript
syncMappingJson: {
  taskNo: "任务号",
  status: "任务状态",
  providerStatus: "Provider 状态",
  providerResultUrl: "结果链接",
  providerErrorMessage: "错误信息",
  ownerName: "创建人",
}
```

### 4.4 RunningHub `NodeInfo` 条目格式

```typescript
// 单值字段
{ nodeId: "input", fieldName: "prompt", fieldValue: "生成一张海报", description: "输入文本" }

// 数组字段（每个槽位独立条目）
{ nodeId: "input", fieldName: "images[0]", fieldValue: "https://..." }
{ nodeId: "input", fieldName: "images[1]", fieldValue: "https://..." }

// Select 字段（含 fieldData）
{
  nodeId: "params",
  fieldName: "aspect_ratio",
  fieldValue: "1:1",
  description: "选择参数",
  fieldData: '[["1:1","3:4","16:9"],{"default":"1:1"}]'
}
```

---

## 5. 常见问题排查

### Q1: 任务提交成功但 RunningHub 没有收到图片

检查 `nodeInfoList` 中图片字段的 `fieldName` 是否为 `images[0]`、`images[1]` 格式（带数组索引），而非合并后的 `images`。

### Q2: 飞书同步失败，提示"字段映射失败"

确认 `syncMappingJson` 中包含 `providerErrorMessage` 映射。缺少此字段会导致失败任务的错误信息无法写入飞书。

### Q3: select 字段提交后 RunningHub 报错

检查 `fieldData` 格式：
- `aspectRatio`：使用 `[[values], {default}]` 格式
- `resolution`/`channel`：使用 `[{name, index, description, fastIndex}, ...]` 格式

### Q4: 多个图片被合并成一个字段

这是 `buildNodeInfoList()` 的已知 bug，已在 Phase 2 中修复。确保运行最新代码。

---

## 6. 相关文件索引

| 文件 | 职责 |
|------|------|
| `src/lib/mock-data.ts` | 应用定义数据（formSchema、mapping 等 JSON 配置） |
| `src/lib/runninghub.ts` | `buildNodeInfoList()` 表单→节点映射逻辑 |
| `src/lib/feishu.ts` | 飞书同步逻辑 |
| `src/lib/types.ts` | `AppDefinition`、`TaskRecord` 等核心类型定义 |
