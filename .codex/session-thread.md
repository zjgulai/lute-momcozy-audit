---
status: done
updated_at: 2026-06-18T09:41:00Z
task: Phase 6 engineering and documentation debt cleanup plus Tencent deployment
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

## 当前红灯

- Phase 6 本地实现无红灯。
- 生产部署无红灯。

## 下一步

- 后续如果继续优化，应进入下一轮数据证据补采：owner analytics / bot log / human-bot 维度复证，用真实机器人占比解释 www.momcozy.com 的转化率、停留、跳出和归因污染。
