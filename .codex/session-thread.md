---
status: in_progress
updated_at: 2026-06-18T07:42:59Z
task: Phase 3b insight report metric attribution contract supplement
---

## 已完成

- Phase 3 已建立 `config/insight-report-contract.json` 与 `scripts/validate-insight-report-contract.mjs`，并接入 `npm run test:insight-contract`。
- Phase 3b 已补强合同：要求页面覆盖转化率、停留、跳出率、机器人占比/爬虫占比、human/bot gate、归因、当前与历史对比。
- `/metrics.html` 合同已要求行为/转化桑基图 `chart-behavior-sankey`。
- `/cross-audit.html` 合同已要求机器人/归因桑基图 `chart-bot-attribution-sankey`。
- validator 已泛化支持可选 `requiredFacts`、`requiredComparisons`、`requiredAttributionMarkers` 数组；缺省数组不强制每页存在。
- 计划文档已记录用户新增要求：如果仓库没有实测 bot share，页面必须标注“机器人占比/爬虫占比为缺失或待复证证据”，并要求 owner analytics / bot log / human-bot 维度复证，不能写成已量化事实。

## 当前红灯

- Phase 3b 只补合同，不实现页面正文或图表本体。
- `npm run test:insight-contract` 预期继续失败；失败列表应包含新增事实、对比、归因 marker 和 Sankey chart 缺口。

## 下一步

- Phase 4：实现静态图表组件，至少包含 `chart-behavior-sankey` 与 `chart-bot-attribution-sankey`，并处理 bot share 缺失证据状态。
- Phase 5：重写页面叙事与模块顺序，按指标驱动诊断转化率、停留、跳出率、机器人占比/爬虫占比、当前 vs 历史对比与归因。
