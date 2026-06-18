---
status: done
updated_at: 2026-06-18T05:10:00Z
task: create complete insight report optimization plan
---

## 已完成

- 已基于深度洞察审计结果制定完整实施计划：`docs/superpowers/plans/2026-06-18-insight-report-optimization.md`。
- 计划覆盖证据一致性、页面金字塔叙事、结论/论据一致性、数据-图表映射、审计话术清理、模块排版密度、工程债务、文档债务和部署后生产验证。
- 已把优化拆成 9 个阶段、63 个可执行 checkbox，并指定新增/修改/删除文件、测试命令、提交边界和回滚方式。
- 已将 P0 顺序锁定为先修 `public-cross-audit.json` 与最新 session 的 LCP 覆盖率冲突，再进行叙事和排版改造。
- 确认截图中的大字来自 `pageAuditSection()` 对 `finalAudit.pageAudits[].question` 的 `h2.section__title` 渲染。
- 已从共享模板删除 `#final-audit` 页面校验模块的大号标题渲染，覆盖首页、指标口径、技术病灶、趋势与复采、决策总表等复用页面。
- 已新增 e2e 回归断言，要求所有主页面的 `#final-audit` 不再出现 `.section__title`。
- 已验证腾讯云轻量服务器线上站点可访问：`https://shopify.lute-tlz-dddd.top/` 返回 `HTTP/2 200`、`server: nginx`，并包含私密经营版页面内容。
- 已验证最近 Tencent 部署工作流：`gh run list --workflow tencent.yml --limit 5` 显示 PR #54 合并后的 `Publish Verified Artifact to Tencent` 为 `completed success`，时间 `2026-06-17T12:47:45Z`。
- 已确认上一项本地“大字删除”改动尚未部署：线上 `metrics.html` 仍包含 `每个指标是否说明可用于什么、不可用于什么？` 的 `h2.section__title`。
- 已按 owner 反馈把页面从“过程型审计解释”收敛为“洞察报告”：删除每个主页面的 `#final-audit` 页面校验模块和 `#diagnostic-bridge` 站内外诊断桥接模块。
- 已把侧栏入口中的“页面校验”“站内外诊断桥接”删除，把“诊断路径”改为“核心洞察”。
- 已把首页/决策总表的 `insight-chain` 大标题从“为什么先修归因和 PDP，而不是先投后端和 SEO”改为“归因可信度与 PDP 负担是本轮最高优先级”。
- 已清理可见报告文案中的“解释为什么”类过程型表达。
- 已通过 PR #55 合并并触发 Tencent workflow `27732828367`；build、deploy、外部 smoke、生产视觉组件审计均通过。
- 已在线上 5 个主页面扫描确认不再出现 `页面校验`、`站内外诊断桥接`、`为什么先修`、`每个指标是否说明`、`不可替代结论`、`本节只回答`、`解释为什么`。
- 已确认线上首页返回 `HTTP/2 200`，`server: nginx`，`last-modified: Thu, 18 Jun 2026 02:32:51 GMT`。
- 已确认 `npm run test:release-parity` 通过，本地与生产结构一致。
- 已彻底复查 owner 新截图中的“大字”问题：漏网根因不是已删的 `#final-audit`，而是共享 `.section__title` 把所有正文 section 标题渲染成 44px。
- 已将正文 `.section__title` 降为报告内标题字号：桌面 20px，移动 18px；保留 hero h1 作为页面主标题。
- 已新增两层防回归：`tests/e2e.spec.mjs` 覆盖 5 个主页面正文标题不得超过 24px；`scripts/audit-production-layout.mjs` 在生产视觉审计中把 oversized section heading 作为失败项。
- 已通过 PR #61 `Demote report section headings` 合并部署；Tencent workflow `27736720568` 的 build、deploy、外部 smoke、生产视觉组件审计均通过。
- 已线上重新枚举 5 个主页面的可见标题字号：每页只剩 hero `h1.hero__title` 为 76px，正文 `.section__title` 没有任何一个超过 24px。
- 已单独验证线上 `cross-audit.html#operating-bridge` 中 owner 截图对应标题 `经营数据负责判断优先级，采集数据负责证明病灶` 的 computed font-size 为 20px，并保存元素截图证据。

## 验证

- `rg -n "TBD|TODO|fill in|similar to|待补|待定|省略|<TENCENT_RUN_ID>|<path>" docs/superpowers/plans/2026-06-18-insight-report-optimization.md`：无匹配。
- `git diff --check`
- 文档结构自查：`plan_check_ok {'lines': 1429, 'fences': 154, 'checkboxes': 63}`。
- `npm run build && npx playwright test tests/e2e.spec.mjs -g "each primary page exposes a final audit check"`：先失败于现有大标题，模板修改后通过。
- `npm run test:allowlist`
- `node scripts/page-structure-contract.mjs`
- `git diff --check`
- `npm run test:e2e`
- `npm test`
- `curl -sSIL --max-time 20 https://shopify.lute-tlz-dddd.top/`
- `curl -sS --max-time 20 https://shopify.lute-tlz-dddd.top/metrics.html | rg -n "每个指标是否说明可用于什么|页面校验|口径治理页|private-business|指标口径"`
- `gh run list --workflow tencent.yml --limit 5`
- `npm run build && npx playwright test tests/e2e.spec.mjs -g "sidebar anchors match|cross audit sidebar|omit appendix|overview restores|cross-audit page exposes|primary pages do not expose|insight report|key report pages"`
- `rg -n "页面校验|站内外诊断桥接|为什么先修|每个指标是否说明|不可替代结论|本节只回答|解释为什么" _site || true`
- `npm test`
- `gh run watch 27732828367 --interval 10 --exit-status`
- `for route in / /metrics.html /forensics.html /trends.html /cross-audit.html; do curl ... | rg ...; done`
- `curl -sSIL --max-time 20 https://shopify.lute-tlz-dddd.top/`
- `npm run test:release-parity`
- `PRODUCTION_LAYOUT_BASE_URL=http://127.0.0.1:8080 PRODUCTION_LAYOUT_OUTPUT_DIR=artifacts/production-layout-section-headings-local npm run audit:production-layout`
- `gh pr checks 61 --watch`
- `gh pr merge 61 --squash --delete-branch`
- `gh run watch 27736720568 --exit-status`
- `PRODUCTION_LAYOUT_OUTPUT_DIR=artifacts/production-layout-section-headings-prod npm run audit:production-layout`
- Playwright 线上 computed-style 枚举：`/`、`/metrics.html`、`/forensics.html`、`/trends.html`、`/cross-audit.html` 的 `.section__head .section__title` 均无 `font-size > 24px`。
- Playwright 元素截图：`artifacts/section-heading-prod-operating-bridge-element.png`，对应标题 computed `font-size: 20px`。

## 下一步

- 等 owner 确认执行方式后，按计划从 Phase 1 `Evidence Integrity Gate` 开始实施；优先使用 branch + PR，避免直接改线上主干。
