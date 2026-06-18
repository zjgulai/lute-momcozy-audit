---
status: in_progress
updated_at: 2026-06-18T07:53:22Z
task: Phase 4 static insight chart components
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

## 当前红灯

- `npm run test:insight-contract` 仍预期失败；Sankey chart id 缺口已由 Phase 4 补齐，但页面决策文案、其他 chart id、section count 上限和 Phase 5 重排仍未处理。

## 下一步

- Phase 5：重写页面叙事与模块顺序，按指标驱动诊断转化率、停留、跳出率、机器人占比/爬虫占比、当前 vs 历史对比与归因。
- Phase 5 需补齐仍缺失的 `chart-overview-proof`、`chart-kpi-direction`、`chart-risk-ranking`、`chart-lcp-coverage`、`chart-js-dom`、`chart-third-party-failures`、`chart-decision-matrix`，并压缩每页 section count。
