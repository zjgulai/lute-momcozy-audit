---
status: done
updated_at: 2026-06-18T10:07:49Z
task: Phase 8 competitor comparison page and sharper insight storyline
---

## 已完成

- Phase 3 已建立 `config/insight-report-contract.json` 与 `scripts/validate-insight-report-contract.mjs`，并接入 `npm run test:insight-contract`。
- Phase 3b 已补强合同：要求页面覆盖转化率、停留、跳出率、机器人占比/爬虫占比、human/bot gate、归因、当前与历史对比。
- `/metrics.html` 合同已要求行为/转化桑基图 `chart-behavior-sankey`。
- `/cross-audit.html` 合同已要求机器人/归因桑基图 `chart-bot-attribution-sankey`。
- validator 已泛化支持可选 `requiredFacts`、`requiredComparisons`、`requiredAttributionMarkers` 数组；缺省数组不强制每页存在。
- 计划文档已记录用户新增要求：如果仓库没有实测 bot share，页面必须标注“机器人占比/爬虫占比为缺失或待复证证据”，并要求 owner analytics / bot log / human-bot 维度复证，不能写成已量化事实。
- Phase 4 已新增 `scripts/history-site/charts.mjs`，导出 `barChart`、`coverageChart`、`pairedMetricChart`、`behaviorSankeyChart`、`botAttributionSankeyChart`。
- Phase 4 已在 `/metrics.html` 现有 funnel section 轻量接入 `chart-behavior-sankey`，用 10,000 归一化访问基数展示当前/历史转化率、停留、跳出率、加购率和结账率。
- Phase 4 已在 `/cross-audit.html` 增加 bot attribution insight section，接入 `chart-bot-attribution-sankey`，明确机器人占比/爬虫占比为缺失或待复证证据，不生成 bot 百分比。
- Phase 4 已新增 chart 组件测试 `tests/history-site-charts.test.mjs`。
- Phase 4 review 修复已完成：`barChart` 兼容 `items` 与 `rows`，`pairedMetricChart` 兼容 `pairs` 与 `leftLabel/rightLabel/leftValue/rightValue`，避免 Phase 5 出现 chart id 存在但图表为空的假通过。
- 已新增 `test:history-site-charts` 并接入 `npm test` 的 `test:insight-contract` 之前；图表单测覆盖 behavior Sankey、bot attribution Sankey、`barChart({rows})`、`coverageChart()`、`pairedMetricChart({leftValue,rightValue})`。
- Phase 5 已重写五页为“洞察报告”优先叙事：结论 -> 事实 -> 归因 -> 行动；页面标题、侧边栏、release marker 和 E2E 旧断言已同步到风险归因、趋势证据、决策矩阵语言。
- Phase 5 已补齐 `chart-overview-proof`、`chart-kpi-direction`、`chart-risk-ranking`、`chart-lcp-coverage`、`chart-js-dom`、`chart-third-party-failures`、`chart-decision-matrix`，并保留 `chart-behavior-sankey` 与 `chart-bot-attribution-sankey`。
- 每个核心页都有可见 `.section__eyebrow`：`最新外部采集 · session-2026-06-17`；页面正文保留 `最新外部采集` 和 `session-2026-06-17`。
- 机器人占比/爬虫占比均写为缺失或待复证证据，要求 owner analytics / bot log / human-bot 维度复证；未生成任何 bot share 百分比。
- Phase 5 review 修复已完成：移除可见“附件”残留并加入 E2E 禁词；`top15` 结构锚点迁移为 `risk-backlog`；`chart-risk-ranking` 的 PDP 第三方失败从源数据提取为 92；`chart-decision-matrix` 从 hard conclusions / execution orders 派生 2 / 3 / 5，不再使用硬编码值。
- 已通过：`npm run build`、`npm run test:release-contract`、`npm run test:history-site-charts`、`npm run test:insight-contract`、目标 Playwright 子集、`git diff --check`、`npm test`。
- Phase 6 已清理不再参与 active build 的旧审计模块：`crossAuditSection`、`pageAuditSection`、`diagnosticBridgeSection`、`storylineSection`、旧竞品/复采/路线图/PR 卡 section 及其辅助函数。
- Phase 6 已删除未被 active build 引用的旧资产：`src/assets/site.css`、`src/assets/trends-charts.js`；AGENTS active source 已同步到 `scripts/history-site/*.mjs` 与 `history_static/assets/`。
- Phase 6 已收紧 `config/insight-report-contract.json`：`附件`、`Top 15` 纳入禁词，允许证据词从“诊断报告”改为“洞察报告”。
- Phase 6 已通过：`node --check scripts/history-site/sections.mjs`、`node --check scripts/history-site/layout.mjs`、`npm run build`、`npm run test:insight-contract`、`npm run test:release-contract`、`npm run test:history-site-charts`、生成产物禁词扫描、`npm test`、`git diff --check`、Playwright 本地布局抽样。
- PR #63 已合并：本轮洞察报告重构与旧审计模块清理进入 `main`。
- PR #64 已合并：腾讯云 pre-deploy parity allowlist 与 production layout audit 锚点已对齐当前洞察结构。
- 腾讯云 workflow `27749964281` 已通过：build、deploy、post-deploy smoke、production visual component audit 全部成功。
- 部署后 release checklist `artifacts/release-checklist-2026-06-18T09-39-05-110Z.md` 为 `Ready for release`；production parity、uptime、Actions artifact 均 PASS。
- 生产浏览器抽样已覆盖 5 页 × desktop/mobile：HTTP 200、禁词命中 `none`、横向溢出 0、section 标题最大 desktop 20px / mobile 18px。
- Phase 7 已新增 `config/bot-evidence.schema.json` 与 `src/_data/bot-evidence.json`，把 owner analytics、bot log、human-bot 维度三类证据定义为必备来源；当前状态为 `missing`，不允许生成 bot share 百分比。
- Phase 7 已新增 `scripts/validate-bot-evidence.mjs` 与 `tests/bot-evidence.test.mjs`，校验脱敏聚合数据、必备 segment、sessions 合计、三类来源 ready 状态，并拒绝原始 URL、用户级标识、私有路径、IP 和私钥。
- Phase 7 已把 `botEvidence` 接入 `scripts/build-history-site.mjs` 和 `npm run test:bot-evidence`；`npm test` 已把 bot evidence 合同纳入全量验证。
- Phase 7 已把 `chart-bot-attribution-sankey` 改为双态：`missing/blocked` 只显示归因证据缺口，`measured` 才展示 human、bot、crawler、unknown 的 sessions、转化率、跳出率、停留和 bot/crawler 合计占比。
- Phase 7 已通过：`npm run test:bot-evidence`、`npm run test:history-site-charts`、`npm run test:insight-contract`、`npm run test:source-safety`、`npm run test:safety`、`npx playwright test tests/e2e.spec.mjs -g "overview reads as an insight report"`、`npm test`、`git diff --check`。
- Phase 8 已新增 `competitors.html` 竞品对比页，并接入侧边栏主导航为 `VI · 竞品对比`；主页面计数从 5 改为 6。
- Phase 8 已把竞品二轮样本转成读者可直接判断的对比：Momcozy 第三方失败 92 vs 竞品上限 42、JS 2212KB vs 1000KB、DOM 11742 vs 5794，并用 `chart-competitor-gap` 与 `chart-competitor-risk-ranking` 呈现。
- Phase 8 已补回有价值的旧洞察方向：第三方脚本治理、PDP 行动路径进入主线；爬虫分级只作为归因证据缺口；内容入口变现继续冻结，直到搜索源和落地页证据补齐。
- Phase 8 已同步 `config/release-contract.json`、`config/insight-report-contract.json`、`scripts/page-structure-contract.mjs`、`scripts/audit-production-layout.mjs`、E2E 与 a11y。
- Phase 8 已通过：`npm run test:release-contract`、`npm run test:insight-contract`、`npm run test:source-safety`、`npm run test:safety`、targeted Playwright 子集、`npm test`、`git diff --check`。

## 当前红灯

- Phase 8 本地实现无红灯。
- 生产部署未在本轮执行；当前变更仍在本地工作区，包含 Phase 7 bot evidence 和 Phase 8 竞品页改动。
- 当前仓库仍没有真实 owner analytics / bot log / human-bot 聚合证据；报告继续只能显示“归因证据缺口”，不能诊断“机器人占比高”或输出 bot share 数值。
- 竞品页当前只支持公开页面技术上限判断，不支持收入、SEO、真实 checkout 或品牌胜负结论。

## 下一步

- 如需上线，先创建分支/PR；合并后等待腾讯云 workflow、post-deploy smoke、production visual component audit 通过。
- 如果 owner 提供脱敏聚合 bot evidence，把 `src/_data/bot-evidence.json` 从 `missing` 切到 `measured`，三类来源必须全部 `ready`，且通过 `npm run test:bot-evidence` 后才能进入报告。
- 下一轮若继续增强竞品页，优先补多次复采、入口参数、checkout 状态、脚本 owner/用途/预算表，再考虑分值化对标。
