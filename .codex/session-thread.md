---
status: done
updated_at: 2026-06-18T02:35:05Z
task: convert pages to insight report and deploy
---

## 已完成

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

## 验证

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

## 下一步

- 无待办。
