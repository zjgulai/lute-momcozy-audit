---
status: done
updated_at: 2026-06-18T07:33:21Z
task: Phase 3 insight report contract gate
---

## 已完成

- 已新增 `config/insight-report-contract.json`，定义 5 个核心页面的决策句、证明点、动作点、必需 chart id、禁用审计叙事词和 section 上限。
- 已新增 `scripts/validate-insight-report-contract.mjs`，从 `_site` 读取生成 HTML 并校验 insight report contract。
- 已在 `package.json` 新增 `test:insight-contract`，并将其接到主 `npm test` 的 `test:release-contract` 之后。
- 已在 `tests/e2e.spec.mjs` 追加浏览器侧合同检查，验证页面决策句和必需 chart 元素存在且可见。
- 本阶段按计划只引入红灯门禁，未修改页面正文或图表实现。

## 验证

- `git diff --check`：无输出。
- `node --check scripts/validate-insight-report-contract.mjs`：通过。
- JSON parse quick check：`config/insight-report-contract.json` 与 `package.json` 通过。
- `npm run build`：通过，输出 `built history-primary site with latest trend session session-2026-06-17`。
- 红灯：`npm run test:insight-contract` 失败 17 项，包含缺失 chart、section 超限，以及 Phase 5 待处理的精确决策/动作/证明文案差距。
- 红灯：`npx playwright test tests/e2e.spec.mjs -g "insight report pages render required charts"` 失败于首页 decision 精确字符串断言；当前页面标题换行导致合同句不连续，尚未推进到 chart 断言。

## 下一步

- Phase 4 实现合同要求的 chart components。
- Phase 5 重排页面叙事与 section 结构，使决策句、证明点、动作点和 section 上限满足合同。
