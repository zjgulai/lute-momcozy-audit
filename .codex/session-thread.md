---
status: done
updated_at: 2026-06-18T07:10:48Z
task: Phase 2 Evidence Version Labels review fix
---

## 已完成

- 已收紧 `tests/e2e.spec.mjs` 的 evidence-label 用例：五个主页面仍必须包含“最新外部采集”和 `publicCrossAudit.external.latestSession`。
- 已新增 `escapeRegExp()`，用于安全构造 exact session 邻接匹配。
- 已验证可见 `.section__eyebrow` 标签中存在 `最新外部采集 · session-2026-06-17` 邻接关系。
- 已新增可见 session ID 窄 allowlist：从 body 可见文本提取 `/session-\d{4}-\d{2}-\d{2}/g`，要求至少出现一次，且唯一值只能等于 `publicCrossAudit.external.latestSession`。
- 保持 `session-2026` 不在 generic bannedTerms 中，避免误伤当前有意展示的 evidence version。

## 验证

- 红灯：收紧为 body-text 邻接正则后，`npx playwright test tests/e2e.spec.mjs -g "evidence labels"` 先失败，暴露 `.section__eyebrow` 的 visible innerText 会被 CSS uppercase 成 `SESSION-2026-06-17`，不能用 body innerText 判断 exact lowercase 邻接。
- 绿灯：改为读取可见 `.section__eyebrow` 的 DOM 文本后，`npx playwright test tests/e2e.spec.mjs -g "evidence labels"` 通过，1 个测试通过。
- `npm run build`：通过，输出 `built history-primary site with latest trend session session-2026-06-17`。
- `npx playwright test tests/e2e.spec.mjs -g "evidence labels"`：通过，1 个测试通过。
- `npx playwright test tests/e2e.spec.mjs -g "internal evidence-index wording"`：通过，1 个测试通过。
- `npm run test:release-parity`：通过，5 个关键路由结构与质量检查通过。
- `git diff --check HEAD~1..HEAD`：无输出。
- `git diff --check`：无输出。

## 下一步

- Phase 2 review fix 已完成；可继续进入下一阶段。
