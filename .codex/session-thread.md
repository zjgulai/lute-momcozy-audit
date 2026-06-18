---
status: done
updated_at: 2026-06-18T06:58:52Z
task: Phase 2 Evidence Version Labels
---

## 已完成

- 已新增 E2E 断言：五个关键报告页必须同时显示“最新外部采集”和 `publicCrossAudit.external.latestSession`。
- 已移除 `escapeHtml()` 全局替换中的 `session-2026-06-17` 隐藏规则，保留其他可读化替换。
- 已在 `crossAuditSection()` eyebrow 显式展示 `最新外部采集 · session-2026-06-17`。
- 已在 `trendsBody()` 最新 section eyebrow 显式展示 `最新外部采集 · session-2026-06-17 · v3 路由感知`。
- 已更新相邻 E2E 文案契约，允许可见 session ID，并将趋势页 route-aware 标签断言对齐为 `v3 路由感知`。

## 验证

- 红灯：`npm run build` 通过；`npx playwright test tests/e2e.spec.mjs -g "evidence labels"` 先失败，失败点为页面缺少 `session-2026-06-17`。
- 绿灯：`npm run build` 通过，输出 `built history-primary site with latest trend session session-2026-06-17`。
- 绿灯：`npx playwright test tests/e2e.spec.mjs -g "evidence labels"` 通过，1 个测试通过。
- 绿灯：`npx playwright test tests/e2e.spec.mjs` 通过，23 个测试通过。
- 绿灯：`npm run test:release-parity` 通过，5 个关键路由结构与质量检查通过。
- `git diff --check HEAD~1..HEAD`：无输出。
- `git diff --check`：无输出。

## 下一步

- Phase 2 已完成；可进入后续报告叙事优化阶段。
