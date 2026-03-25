# AI Workbench

内部 AI 应用工作台的唯一正式仓库。

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
```

如果需要生产态本地验证：

```bash
npm run build
npm run start
```

## 部署说明

- 部署根目录固定为仓库根目录 `/`
- 不再使用子目录 Root Directory
- Vercel、预发、正式发布都应以当前根目录为唯一项目入口

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
npm run deploy:vercel:preview
npm run deploy:vercel:production
```
