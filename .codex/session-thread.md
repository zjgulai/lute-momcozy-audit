---
status: done
updated_at: 2026-06-18T06:43:12Z
task: Phase 1 Evidence Integrity Gate review fixes
---

## 已完成

- 已修复 review 反馈：`scripts/validate-report-data-consistency.mjs` 不再只扫描 raw JSON 字符串。
- Validator 现在复用 `scripts/history-site/fs.mjs` 的 `latestSession` / `readJson`。
- Validator 现在会校验 `public-cross-audit.json` 中仍存在的所有 helper-derived external 字段，包括 `routes`、首页 TTFB/FCP/JS、最大 DOM、最大第三方失败和 LCP 样本计数。
- Validator 现在会扫描 `_site/index.html`、`_site/metrics.html`、`_site/forensics.html`、`_site/trends.html`、`_site/cross-audit.html` 中所有生成文本 `LCP n/m`，要求全部等于最新 session 派生值，并要求至少出现一次。
- 已修正 `deriveExternalSessionMetrics()` 的 `routes` 输出：即使 `session.routes` 是 route 对象数组，也只返回 route ID 字符串。
- 已新增 `tests/session-derived-metrics.test.mjs` 并接入 `test:session-derived-metrics`。

## 验证

- 红灯：`node --test tests/session-derived-metrics.test.mjs` 先失败，暴露 `routes` 返回 route 对象而非 ID 字符串。
- 红灯：临时把 `_site/index.html` 的一个 `LCP 0/26` 改为 `LCP 26/26` 后，旧 validator 误通过；修复后 validator 能失败并指出 `_site/index.html visible LCP coverage mismatch`。
- `npm run build`：通过，输出 `built history-primary site with latest trend session session-2026-06-17`。
- `npm run test:report-data-consistency`：通过，输出 `public-cross-audit external fields and generated HTML match latest session session-2026-06-17`。
- `npm run test:allowlist`：通过，输出 `public data matches the field allowlist and latest session session-2026-06-17`。
- `npm run test:sessions`：通过，输出 `validated 7 session file(s)`。
- `npm run test:session-derived-metrics`：通过，1 个 Node test 通过。
- `git diff --check`：无输出。

## 下一步

- Phase 1 review fixes 已完成；可继续进入 Phase 2：页面金字塔叙事重构。
