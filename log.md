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
