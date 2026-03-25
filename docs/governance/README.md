# 网站治理与分层重构文档索引

## 目的

这组文档用于承接 `AI Workbench` 的网站治理与分层重构计划，先把问题、边界、阶段路线和验证基线固定下来，再进入后续实现。

本组文档起始于 `Phase 0` 立项阶段，当前已完成 `Phase 4` 的回归验收和治理固化，后续进入“按治理规则持续扩展”的维护阶段。

## 当前状态

- 当前阶段：`Phase 4 - 已完成`
- 已完成：`Phase 0` 文档立项、`Phase 1` 结构设计、`Phase 2` 模板与交互统一、`Phase 3` 配置中心整合、`Phase 4` 回归验收与治理固化
- 当前工作区状态：脏工作区，存在与本计划无关的历史改动
- 当前执行原则：后续实施时不得覆盖无关改动，不得借治理名义顺手重写核心业务

## 阅读顺序

1. [00-charter.md](./00-charter.md)
2. [01-current-state-audit.md](./01-current-state-audit.md)
3. [02-boundaries-principles.md](./02-boundaries-principles.md)
4. [03-roadmap.md](./03-roadmap.md)
5. [04-verification-baseline.md](./04-verification-baseline.md)
6. [10-information-architecture.md](./10-information-architecture.md)
7. [11-page-template-system.md](./11-page-template-system.md)
8. [12-config-center-design.md](./12-config-center-design.md)
9. [13-page-inventory-migration.md](./13-page-inventory-migration.md)
10. [20-phase4-regression-report.md](./20-phase4-regression-report.md)
11. [21-governance-guardrails.md](./21-governance-guardrails.md)
12. [22-extension-admission-rules.md](./22-extension-admission-rules.md)

## 文档映射

- `00-charter.md`
  - 说明本次治理为什么做、做什么、不做什么
- `01-current-state-audit.md`
  - 记录当前站点混乱来源与仓库事实证据
- `02-boundaries-principles.md`
  - 约束后续重构边界与决策原则
- `03-roadmap.md`
  - 定义从 `Phase 0` 到 `Phase 4` 的实施路线
- `04-verification-baseline.md`
  - 给后续每个阶段提供统一验收基线
- `10-information-architecture.md`
  - 定义用户侧、管理侧和设置侧的信息架构
- `11-page-template-system.md`
  - 定义统一页面模板体系
- `12-config-center-design.md`
  - 定义配置中心边界、读取优先级和配置域
- `13-page-inventory-migration.md`
  - 把当前页面归类到模板，并给出迁移优先级
- `20-phase4-regression-report.md`
  - 记录 Phase 4 的真实回归结果、证据和残余风险
- `21-governance-guardrails.md`
  - 把模板、导航、配置和验证规则固化成长期约束
- `22-extension-admission-rules.md`
  - 约束后续新增页面、配置项和后台交互的准入方式

## 与现有文档的关系

- 项目概览继续以 [README.md](../../README.md) 为入口
- 现有设计方向继续参考 [DESIGN.md](../../DESIGN.md)
- 历史阶段计划继续保留在 [PHASE2-PLAN.md](../PHASE2-PLAN.md)
- 任务教训与纠错记录继续保留在 `tasks/lessons.md`

## 后续路线

- `Phase 0`：完成治理立项、现状审计、边界定义、路线图与验证基线
- `Phase 1`：输出信息架构、页面模板和配置中心结构设计
- `Phase 2`：优先改壳层、导航、标题体系、统一模板骨架
- `Phase 3`：整合重复功能、收敛后台交互、落配置中心
- `Phase 4`：执行回归、固化规范、形成长期开发约束
- 当前后续：按 `21` 与 `22` 两份规则文档继续扩展，不再回到无约束开发

## 使用方式

- 新一轮治理实施开始前，先完整阅读本目录所有文档
- 后续任何实现任务都必须先确认是否满足 [02-boundaries-principles.md](./02-boundaries-principles.md)
- 阶段结束时必须对照 [04-verification-baseline.md](./04-verification-baseline.md) 做验证

## 2026-03-23 Phase 4 完成更新

- `Phase 4` 已完成：
  - 新增正式回归报告 `20-phase4-regression-report.md`
  - 新增长期治理规则 `21-governance-guardrails.md`
  - 新增扩展准入规则 `22-extension-admission-rules.md`
- 本轮验收覆盖：
  - 设置中心三块入口
  - 工作台、素材大厅、素材管理、任务中心
  - 桌面端与 `390 x 844` 移动端壳层
- 本轮验证：
  - `bun test src/app/api/internal/admin/settings/site/route.test.ts src/app/api/internal/admin/settings/integrations/route.test.ts src/app/api/internal/admin/settings/secrets/route.test.ts`
  - `bun run build`
  - `Playwright CLI` 真实浏览器回归
- 当前残余风险：
  - 素材预览文件缺失时，`素材大厅` 控制台仍会出现受控 `404`
  - 已记录到 `20-phase4-regression-report.md`，不再作为未知风险悬空
