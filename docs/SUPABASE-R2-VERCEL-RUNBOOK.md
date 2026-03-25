# 1.13 升级线外部环境联调手册

本手册用于把当前 `codex/supabase-upgrade-from-1-13` 分支接到真实的：

- Supabase Postgres
- 七牛 Kodo 对象存储（S3 兼容）
- Vercel Preview / Production

建议严格按下面顺序操作，不要跳步。

## 0. 本地前提

在项目根目录先确认这些命令已通过：

```bash
npm test
npm run build
```

当前仓库已经通过这两项验证。

## 1. 复制环境模板

预发环境：

```bash
Copy-Item .env.vercel.example .env.vercel
```

正式环境：

```bash
Copy-Item .env.vercel.production.example .env.vercel.production
```

## 2. 配 Supabase

目标：

- `DATABASE_URL` 给应用运行时使用
- `DIRECT_URL` 给迁移和管理脚本使用

推荐填写方式：

- `DATABASE_URL`
  - 优先使用 Supabase 的 `Session pooler` 连接串
- `DIRECT_URL`
  - 优先使用 Supabase 的 `Direct connection`
  - 如果当前网络环境拿不到 direct，可先临时使用 `Session pooler`

说明：

- 这是基于 Supabase 官方 Prisma 指南和当前仓库实现做的工程建议。
- 当前仓库没有为 Prisma 显式关闭 prepared statements，所以不要优先使用 transaction pooler 连接串。

你需要去 Supabase 控制台拿这些值：

1. 打开项目
2. 进入 `Project Settings -> Database`
3. 找到连接字符串区域
4. 记录：
   - Session pooler
   - Direct connection
5. 把库名拆成三套：
   - 预发库：`ai_workbench_preview`
   - 正式库：`ai_workbench_prod`
   - 本地测试库：`ai_workbench_test`

建议填写：

```env
DATABASE_URL=postgresql://.../ai_workbench_preview
DIRECT_URL=postgresql://.../ai_workbench_preview?pgbouncer=false
TEST_DATABASE_URL=postgresql://.../ai_workbench_test
```

如果你的 Supabase 控制台给出的直连串本身已经包含参数，就保留官方原串，不要手动拼错。

## 3. 配七牛 Kodo

当前仓库要求这些变量：

- `S3_BUCKET`
- `S3_REGION`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`
- `S3_MATERIALS_PREFIX`
- `S3_RESULTS_PREFIX`
- `S3_REFERENCES_PREFIX`
- `TASK_OUTPUT_STORAGE_MODE`

### 七牛 Kodo 一期建议

当前分支的一期策略是：

- `素材上传 / 视频文件 / 素材预览衍生物`：存七牛
- `任务输入参考图`：存七牛
- `RunningHub` 生成结果图：默认不回存七牛，只保留 `providerResultUrl`

你需要在七牛后台准备：

1. 停用之前已经泄露的旧密钥，重新生成新的 `AccessKey / SecretKey`
2. 创建正式 `Bucket`
3. 绑定正式自定义域名
4. 开启 HTTPS
5. 在七牛控制台确认 S3 兼容 `Endpoint`

建议变量映射：

```env
S3_BUCKET=你的七牛Bucket名
S3_REGION=auto
S3_ENDPOINT=https://你的七牛S3兼容Endpoint
S3_ACCESS_KEY_ID=你的新AccessKey
S3_SECRET_ACCESS_KEY=你的新SecretKey
S3_PUBLIC_BASE_URL=https://你的正式自定义HTTPS域名
S3_MATERIALS_PREFIX=materials
S3_RESULTS_PREFIX=task-results
S3_REFERENCES_PREFIX=references/uploads
TASK_OUTPUT_STORAGE_MODE=provider_url
```

补充说明：

- `S3_PUBLIC_BASE_URL` 不要填七牛测试域名。
- 当前部署预检已经阻止 production 使用 `clouddn.com / qiniucdn.com / qnssl.com / qbox.me` 这类测试域名。
- 如果以后你要把 RunningHub 结果图也回存七牛，只需要把：

```env
TASK_OUTPUT_STORAGE_MODE=object_storage
```

### 结果图策略说明

- `TASK_OUTPUT_STORAGE_MODE=provider_url`
  - 新任务输出图不下载、不回传七牛
  - 数据库保留 `providerResultUrl`
  - 下载与打包时由服务端临时代理远程 URL
- `TASK_OUTPUT_STORAGE_MODE=object_storage`
  - 恢复“下载后上传到对象存储”的持久化策略
  - 适合你后续确认 RunningHub 图链不稳定时再切换

## 4. 配 Vercel

当前部署脚本要求：

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- 可选 `VERCEL_SCOPE`

获取方式：

### `VERCEL_TOKEN`

1. 打开 Vercel 控制台
2. 进入 `Settings -> Tokens`
3. 创建一个新的 Token

### `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`

最稳的方式：

1. 本机在项目目录执行一次：

```bash
vercel link
```

2. 然后查看：

```bash
Get-Content .vercel/project.json
```

3. 里面的：
   - `orgId` 对应 `VERCEL_ORG_ID`
   - `projectId` 对应 `VERCEL_PROJECT_ID`

### `APP_URL`

预发环境：

- 如果只做页面验证，可以先填一个你准备绑定的稳定预发域名
- 如果你要验证 RunningHub webhook，最好使用稳定可访问的 preview 域名，而不是每次变动的随机部署地址

正式环境：

- 填正式域名，例如 `https://your-domain.com`

## 5. 配 RunningHub / Feishu / JWT

这些沿用你现有业务配置，只是迁移到 Vercel 也需要同步：

```env
JWT_SECRET=
RUNNINGHUB_BASE_URL=https://www.runninghub.cn
RUNNINGHUB_API_KEY=
RUNNINGHUB_WEBAPP_ID=
RUNNINGHUB_WEBHOOK_SECRET=
FEISHU_BASE_URL=https://open.feishu.cn
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_APP_TOKEN=
FEISHU_TABLE_ID=
TASK_MAX_CONCURRENCY=5
```

补充建议：

- `JWT_SECRET` 用随机 32 字节以上字符串
- `RUNNINGHUB_WEBHOOK_SECRET` 正式环境必须配置

## 6. 先做 dry-run

预发：

```bash
npm run deploy:vercel:preview:dry-run
```

正式：

```bash
npm run deploy:vercel:production:dry-run
```

如果 dry-run 报错，优先修环境变量，不要直接跳到真实部署。

## 7. 跑 SQLite -> Postgres 数据迁移

确保当前 `.env` 或命令行里已经带上：

- `DIRECT_URL`
- `DATABASE_URL`
- 七牛 Kodo 全套变量

执行：

```bash
npm run migrate:sqlite -- .\\dev.db
```

说明：

- 默认源库就是项目根目录的 `dev.db`
- 脚本会：
  - 读 SQLite
  - 写 Postgres
  - 上传本地素材、视频和任务输入图到七牛
  - 当 `TASK_OUTPUT_STORAGE_MODE=provider_url` 时，跳过历史任务输出图补传
  - 输出 JSON 报告到 `reports/`

迁移后请检查：

- `reports/sqlite-to-postgres-*.json`
- 里面的：
  - `tableCounts`
  - `insertedCounts`
  - `skippedFiles`
  - `missingFiles`
  - `verification`

## 8. 跑本地迁移与管理员初始化

```bash
npm run prisma:migrate:deploy
npm run bootstrap:admin
```

如果是首次初始化，记得先配置：

```env
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=你的强密码
BOOTSTRAP_ADMIN_DISPLAY_NAME=Admin
BOOTSTRAP_ADMIN_DAILY_CLAIM_LIMIT=3
```

## 9. 做 Preview 部署

```bash
npm run deploy:vercel:preview
```

脚本会依次做：

- 本地 `npm test`
- 本地 `npm run build`
- `prisma migrate deploy`
- `bootstrap:admin`
- 同步环境变量到 Vercel
- `vercel deploy`

## 10. Preview 验证清单

部署完成后，至少手动验证：

- 登录页可打开
- 应用中心可打开
- 单应用提交页可打开
- 历史任务结果图可查看
- 素材预览和下载可用
- 新提交任务后，结果图能回写
- RunningHub webhook 能打回 Vercel
- Feishu 同步正常

## 官方参考

- Supabase Prisma 指南：
  - https://supabase.com/docs/guides/database/prisma
- Vercel Git / CLI / 部署文档：
  - https://vercel.com/docs
- Cloudflare R2 S3 API：
  - https://developers.cloudflare.com/r2/
