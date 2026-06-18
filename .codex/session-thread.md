---
status: done
updated_at: 2026-06-18T07:19:42Z
task: Phase 2 visible evidence session casing fix
---

## 已完成

- 已将 `tests/e2e.spec.mjs` 的 evidence-label 断言改为读取可见 `.section__eyebrow` 的 `innerText`，不再使用 DOM `textContent` 绕过 CSS。
- 已在 `crossAuditSection()` 和 `trendsBody()` 的 evidence label 中用 `<span class="evidence-session">` 包住 exact session ID。
- 已在 active build 的 `scripts/history-site/layout.mjs` inline CSS 中新增 `.evidence-session { text-transform: none; letter-spacing: 0; }`，避免父级 uppercase 改写可见 session casing。
- 保留 body 可见 session ID 窄 allowlist：可见文本中所有 `session-YYYY-MM-DD` 必须唯一且等于 `publicCrossAudit.external.latestSession`。

## 验证

- 红灯：仅把 evidence-label 测试改为读取 `innerText` 后，`npx playwright test tests/e2e.spec.mjs -g "evidence labels"` 失败，证明真实可见标签仍显示 uppercase `SESSION-2026-06-17`。
- `npm run build`：通过，输出 `built history-primary site with latest trend session session-2026-06-17`。
- 绿灯：`npx playwright test tests/e2e.spec.mjs -g "evidence labels"` 通过，1 个测试通过。
- `npx playwright test tests/e2e.spec.mjs -g "internal evidence-index wording"`：通过，1 个测试通过。
- `npm run test:release-parity`：通过，5 个关键路由结构与质量检查通过。
- `npx playwright test tests/e2e.spec.mjs`：通过，23 个测试通过。
- `git diff --check HEAD~1..HEAD`：无输出。
- `git diff --check`：无输出。

## 下一步

- Phase 2 visible casing 修复已完成；可继续进入下一阶段。
