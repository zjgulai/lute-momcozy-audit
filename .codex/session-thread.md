---
status: done
updated_at: 2026-06-18T06:29:33Z
task: Phase 1 Evidence Integrity Gate
---

## 已完成

- 已新增 `scripts/history-site/session-derived-metrics.mjs`，从最新 session 派生 external evidence 字段。
- 已新增 `scripts/validate-report-data-consistency.mjs`，校验 `public-cross-audit.json` 的 external 字段和可见 `LCP n/m` 证据文本必须匹配最新 session。
- 已先运行 validator 确认红灯：`external.lcpObservedSamples mismatch: expected 0, got 26`。
- 已在 `scripts/build-history-site.mjs` 构建路径中合并最新 session 派生 external 字段，避免页面构建继续使用陈旧样本计数。
- 已把 `src/_data/public-cross-audit.json` 的 `external.lcpObservedSamples` 修正为 `0`，保留可见证据文本 `LCP 0/26`。
- 已在 `package.json` 新增 `test:report-data-consistency`，并插入主 `test` 脚本的 `test:sessions` 之后。
- 已按要求提交 Phase 1 实现，提交信息为 `fix: derive report evidence counts from latest session`。

## 验证

- `node scripts/validate-report-data-consistency.mjs`：修复前红灯，失败于 `expected 0, got 26`。
- `git diff --check`：无输出。
- `npm run build`：通过，输出 `built history-primary site with latest trend session session-2026-06-17`。
- `npm run test:report-data-consistency`：通过，输出 `public-cross-audit external fields match latest session session-2026-06-17`。
- `npm run test:allowlist`：通过，输出 `public data matches the field allowlist and latest session session-2026-06-17`。
- `npm run test:sessions`：通过，输出 `validated 7 session file(s)`。

## 下一步

- 按 `docs/superpowers/plans/2026-06-18-insight-report-optimization.md` 进入 Phase 2：页面金字塔叙事重构。
